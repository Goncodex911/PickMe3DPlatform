const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { EventEmitter } = require('events');

const collabServer = require('../src/services/collaborationServer');

const DRAFT_A = 'draft-11111111-2222-4333-8444-555555555555';
const DRAFT_B = 'draft-aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const DESIGN_ID = '665f0c0a9b1e8a0012345678';

/** Minimal stand-in for a socket.io Socket: records handlers, emitted events and room broadcasts. */
function createFakeSocket(id, user = null) {
  const handlers = new Map();
  const emitted = [];
  const broadcasts = [];
  return {
    id,
    connected: true,
    data: { user },
    emitted,
    broadcasts,
    on(event, fn) { handlers.set(event, fn); },
    async trigger(event, payload) { await handlers.get(event)?.(payload); },
    emit(event, payload) { emitted.push({ event, payload }); },
    join() {},
    leave() {},
    to(room) { return { emit(event, payload) { broadcasts.push({ room, event, payload }); } }; },
  };
}

function connect(socket) {
  // Run the server's 'connection' listeners without a real client transport.
  EventEmitter.prototype.emit.call(collabServer.io.sockets, 'connection', socket);
}

const originalCanJoin = collabServer.canJoinRoom;
let directEmits;

beforeEach(() => {
  collabServer.init(http.createServer());
  collabServer.rooms.clear();
  collabServer.nodeLocks.clear();
  collabServer.roomDocs.clear();
  directEmits = [];
  collabServer.io.to = (target) => ({ emit(event, payload) { directEmits.push({ target, event, payload }); } });
});

afterEach(() => {
  collabServer.canJoinRoom = originalCanJoin;
  collabServer.io.close();
});

test('Collaboration: stored room doc is cleared once the room empties', async () => {
  const a = createFakeSocket('socket-a');
  connect(a);
  await a.trigger('canvas:join', { canvasId: DRAFT_A, user: { name: 'A' } });
  await a.trigger('doc:broadcast', { canvasId: DRAFT_A, docData: { frames: [{ id: 'f1' }] } });
  assert.ok(collabServer.roomDocs.has(DRAFT_A));

  await a.trigger('disconnect');
  assert.equal(collabServer.roomDocs.has(DRAFT_A), false);
  assert.equal(collabServer.rooms.has(DRAFT_A), false);

  const b = createFakeSocket('socket-b');
  connect(b);
  await b.trigger('canvas:join', { canvasId: DRAFT_A, user: { name: 'B' } });
  const init = b.emitted.find((e) => e.event === 'canvas:init');
  assert.ok(init);
  assert.equal(init.payload.docData, null);
});

test('Collaboration: room doc is kept while another peer is still in the room', async () => {
  const a = createFakeSocket('socket-c');
  const b = createFakeSocket('socket-d');
  connect(a);
  connect(b);
  await a.trigger('canvas:join', { canvasId: DRAFT_A });
  await b.trigger('canvas:join', { canvasId: DRAFT_A });
  await a.trigger('doc:broadcast', { canvasId: DRAFT_A, docData: { frames: [] } });

  await a.trigger('disconnect');
  assert.ok(collabServer.roomDocs.has(DRAFT_A));

  await b.trigger('disconnect');
  assert.equal(collabServer.roomDocs.has(DRAFT_A), false);
});

test('Collaboration: anonymous socket cannot join a saved design room', async () => {
  const s = createFakeSocket('socket-anon');
  connect(s);
  await s.trigger('canvas:join', { canvasId: DESIGN_ID, user: { id: 'spoofed-owner' } });
  assert.ok(s.emitted.some((e) => e.event === 'canvas:denied'));
  assert.equal(s.emitted.some((e) => e.event === 'canvas:init'), false);
  assert.equal(collabServer.rooms.has(DESIGN_ID), false);
});

test('Collaboration: design room access follows canJoinRoom and identity comes from the token', async () => {
  const owner = { _id: 'user-owner', name: 'Owner' };
  collabServer.canJoinRoom = async (user, canvasId) => canvasId === DESIGN_ID && user === owner;

  const intruder = createFakeSocket('socket-intruder', { _id: 'user-other', name: 'Other' });
  connect(intruder);
  await intruder.trigger('canvas:join', { canvasId: DESIGN_ID });
  assert.ok(intruder.emitted.some((e) => e.event === 'canvas:denied'));

  const s = createFakeSocket('socket-owner', owner);
  connect(s);
  await s.trigger('canvas:join', { canvasId: DESIGN_ID, user: { id: 'spoofed', name: 'Spoofed' } });
  const init = s.emitted.find((e) => e.event === 'canvas:init');
  assert.ok(init);
  assert.equal(init.payload.self.id, 'user-owner');
  assert.equal(init.payload.self.name, 'Owner');
});

test('Collaboration: events for a room the socket has not joined are ignored', async () => {
  const victim = createFakeSocket('socket-victim');
  const attacker = createFakeSocket('socket-attacker');
  connect(victim);
  connect(attacker);
  await victim.trigger('canvas:join', { canvasId: DRAFT_A });
  await attacker.trigger('canvas:join', { canvasId: DRAFT_B });

  await attacker.trigger('doc:broadcast', { canvasId: DRAFT_A, docData: { frames: ['evil'] } });
  await attacker.trigger('node:patch', { canvasId: DRAFT_A, nodeId: 'n1', patch: { x: 1 } });
  assert.equal(collabServer.roomDocs.has(DRAFT_A), false);
  assert.equal(attacker.broadcasts.some((b) => b.room === `canvas:${DRAFT_A}`), false);

  // A socket that was denied never gets a room either.
  const anon = createFakeSocket('socket-anon2');
  connect(anon);
  await anon.trigger('canvas:join', { canvasId: DESIGN_ID });
  await anon.trigger('doc:broadcast', { canvasId: DESIGN_ID, docData: { frames: [] } });
  assert.equal(collabServer.roomDocs.has(DESIGN_ID), false);
});

test('Collaboration: a newcomer without a stored doc asks only the longest-present peer', async () => {
  const first = createFakeSocket('socket-first');
  const second = createFakeSocket('socket-second');
  const third = createFakeSocket('socket-third');
  connect(first);
  connect(second);
  connect(third);

  await first.trigger('canvas:join', { canvasId: DRAFT_A });
  // Make join order unambiguous even within the same millisecond.
  collabServer.rooms.get(DRAFT_A).get('socket-first').joinedAt -= 1000;
  await second.trigger('canvas:join', { canvasId: DRAFT_A });

  const requests = directEmits.filter((e) => e.event === 'doc:request');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].target, 'socket-first');

  directEmits = [];
  await third.trigger('canvas:join', { canvasId: DRAFT_A });
  const again = directEmits.filter((e) => e.event === 'doc:request');
  assert.equal(again.length, 1);
  assert.equal(again[0].target, 'socket-first');

  // Once the room holds a doc, newcomers get it in canvas:init and nobody is asked.
  await first.trigger('doc:broadcast', { canvasId: DRAFT_A, docData: { frames: [] } });
  directEmits = [];
  const fourth = createFakeSocket('socket-fourth');
  connect(fourth);
  await fourth.trigger('canvas:join', { canvasId: DRAFT_A });
  assert.equal(directEmits.some((e) => e.event === 'doc:request'), false);
  assert.deepEqual(fourth.emitted.find((e) => e.event === 'canvas:init').payload.docData, { frames: [] });
});

test('Collaboration: a disconnect during the access check cancels the join', async () => {
  let release;
  collabServer.canJoinRoom = () => new Promise((resolve) => { release = resolve; });
  const s = createFakeSocket('socket-slow', { _id: 'u1' });
  connect(s);
  const joining = s.trigger('canvas:join', { canvasId: DESIGN_ID });
  await s.trigger('disconnect');
  release(true);
  await joining;
  assert.equal(collabServer.rooms.has(DESIGN_ID), false);
  assert.equal(s.emitted.some((e) => e.event === 'canvas:init'), false);
});
