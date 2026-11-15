const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const aiController = require('../src/controllers/aiController');
const aiRoutes = require('../src/routes/aiRoutes');
const { attachUser, optionalUser } = require('../src/middlewares/planMiddleware');

/** a tiny stand-in for an Express response */
function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const routeHandlers = (method, routePath) => {
  const layer = aiRoutes.stack.find((l) => l.route && l.route.path === routePath && l.route.methods[method]);
  assert.ok(layer, `missing route ${method.toUpperCase()} ${routePath}`);
  return layer.route.stack.map((s) => s.handle);
};

const realFetch = global.fetch;
const realKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  global.fetch = realFetch;
  if (realKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = realKey;
});

describe('POST /api/ai/test', () => {
  test('reads the session when there is one, without requiring it', () => {
    const handlers = routeHandlers('post', '/test');
    assert.ok(handlers.includes(optionalUser));
    assert.ok(!handlers.includes(attachUser));
    assert.ok(routeHandlers('post', '/complete').includes(attachUser));
  });

  test("refuses to test the server's key for a visitor who is not signed in", async () => {
    process.env.GEMINI_API_KEY = 'server-key';
    let called = false;
    global.fetch = async () => {
      called = true;
      return new Response('{}', { status: 200 });
    };
    const res = fakeRes();
    await aiController.testConnection({ body: { provider: 'gemini', model: 'gemini-test' } }, res, (err) => assert.fail(err));
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(called, false, 'Google must not be called with the server key');
  });

  test("tests the server's key for a signed-in user", async () => {
    process.env.GEMINI_API_KEY = 'server-key';
    let auth = '';
    global.fetch = async (_url, init) => {
      auth = init.headers.authorization;
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    };
    const res = fakeRes();
    await aiController.testConnection(
      { body: { provider: 'gemini', model: 'gemini-test' }, auth: { id: 'u1' } },
      res,
      (err) => assert.fail(err),
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(auth, 'Bearer server-key');
  });

  test("tests a visitor's own key without a sign-in", async () => {
    delete process.env.GEMINI_API_KEY;
    let auth = '';
    global.fetch = async (_url, init) => {
      auth = init.headers.authorization;
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    };
    const res = fakeRes();
    await aiController.testConnection({ body: { provider: 'gemini', model: 'gemini-test', key: 'own-key' } }, res, (err) => assert.fail(err));
    assert.equal(res.body.success, true);
    assert.equal(auth, 'Bearer own-key');
  });
});
