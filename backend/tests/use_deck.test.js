const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const presentation = require('../src/controllers/presentationController');
const billing = require('../src/services/billingStore');
const { requirePlan } = require('../src/middlewares/planMiddleware');

afterEach(() => billing.memory.presentations.clear());

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function sourceDeck(overrides = {}) {
  return billing.createDeck({
    userId: 'author-1',
    authorName: 'Tác giả',
    title: 'Kế hoạch ra mắt',
    slides: [{ id: 's1', elements: [{ type: 'text', id: 'e1', left: 10, top: 10, width: 100, height: 40, content: '<p>Hi</p>' }] }],
    theme: { backgroundColor: '#111111', themeColors: ['#ff0000'] },
    thumbnail: 'https://example.com/thumb.png',
    isPublic: true,
    likesCount: 4,
    likedBy: ['a', 'b', 'c', 'd'],
    viewsCount: 12,
    comments: [{ id: 'c1', userId: 'a', userName: 'A', content: 'Đẹp', createdAt: new Date().toISOString() }],
    ...overrides,
  });
}

const proUser = { id: 'pro-1', name: 'Pro User', plan: 'pro', role: 'user' };

test('a Pro user gets an independent private copy with attribution and no social counters', async () => {
  const source = await sourceDeck();
  const res = response();
  await presentation.useDeck({ params: { id: source.id }, user: proUser }, res);

  assert.equal(res.statusCode, 201);
  const copy = res.body.data;
  assert.notEqual(copy.id, source.id);
  assert.equal(copy.userId, 'pro-1');
  assert.equal(copy.authorName, 'Pro User');
  assert.equal(copy.title, 'Copy of Kế hoạch ra mắt');
  assert.equal(copy.isPublic, false);
  assert.deepEqual(copy.slides, source.slides);
  assert.equal(copy.theme.backgroundColor, '#111111');
  assert.deepEqual(
    { deckId: copy.theme.copiedFrom.deckId, title: copy.theme.copiedFrom.title, authorName: copy.theme.copiedFrom.authorName },
    { deckId: source.id, title: 'Kế hoạch ra mắt', authorName: 'Tác giả' },
  );
  assert.equal(copy.likesCount, 0);
  assert.equal(copy.viewsCount, 0);
  assert.deepEqual(copy.comments, []);
});

test('editing the copy never changes the original deck', async () => {
  const source = await sourceDeck();
  const res = response();
  await presentation.useDeck({ params: { id: source.id }, user: proUser }, res);
  const copy = res.body.data;

  copy.slides[0].elements[0].content = '<p>Changed in place</p>';
  await billing.updateDeck(copy.id, { title: 'Bản của tôi', slides: [{ id: 'new', elements: [] }] });

  const original = await billing.getDeck(source.id);
  assert.equal(original.title, 'Kế hoạch ra mắt');
  assert.equal(original.slides[0].elements[0].content, '<p>Hi</p>');
  assert.equal(original.likesCount, 4);
  assert.equal(original.theme.copiedFrom, undefined);
});

async function save(deckId, user, body) {
  const res = response();
  await presentation.update({ params: { id: deckId }, user, body }, res);
  return res;
}

test('the attribution of a copy survives saves and cannot be removed or changed by the owner', async () => {
  const source = await sourceDeck();
  const res = response();
  await presentation.useDeck({ params: { id: source.id }, user: proUser }, res);
  const copy = res.body.data;
  const original = { ...copy.theme.copiedFrom };

  // Studio đổi theme sang định dạng mới và gửi lại không kèm copiedFrom
  const saved = await save(copy.id, proUser, { theme: { backgroundColor: '#000000', themeColors: ['#fff'] } });
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.body.data.theme.copiedFrom, original);
  assert.equal(saved.body.data.theme.backgroundColor, '#000000');

  // Cố tình sửa nguồn
  const forged = await save(copy.id, proUser, { theme: { copiedFrom: { deckId: 'fake', title: 'Of mine', authorName: 'Me' } } });
  assert.deepEqual(forged.body.data.theme.copiedFrom, original);

  // Bật công khai vẫn giữ nguồn
  const published = await save(copy.id, proUser, { isPublic: true });
  assert.equal(published.body.data.isPublic, true);
  assert.deepEqual(published.body.data.theme.copiedFrom, original);
});

test('a deck that was not copied cannot be given a fake source', async () => {
  const own = await billing.createDeck({ userId: 'pro-1', authorName: 'Pro User', title: 'Mine', slides: [], theme: {}, isPublic: true });
  const res = await save(own.id, proUser, { theme: { copiedFrom: { deckId: 'x', title: 'Famous deck', authorName: 'Someone' } } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.theme.copiedFrom, undefined);
});

test('private decks of other users cannot be copied', async () => {
  const source = await sourceDeck({ isPublic: false });
  const res = response();
  await presentation.useDeck({ params: { id: source.id }, user: proUser }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(billing.memory.presentations.size, 1);
});

test('the route is a Pro feature: Free users are asked to upgrade, admins pass', () => {
  const guard = requirePlan('pro');
  const free = response();
  let passed = false;
  guard({ user: { id: 'f', plan: 'free', role: 'user' } }, free, () => { passed = true; });
  assert.equal(passed, false);
  assert.equal(free.statusCode, 403);
  assert.equal(free.body.code, 'UPGRADE_REQUIRED');

  let adminPassed = false;
  guard({ user: { id: 'adm', plan: 'free', role: 'admin' } }, response(), () => { adminPassed = true; });
  assert.equal(adminPassed, true);
});
