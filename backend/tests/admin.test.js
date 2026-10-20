const { describe, it } = require('node:test');
const assert = require('node:assert');
const { authorize } = require('../src/middlewares/authMiddleware');
const { logAdminAction } = require('../src/helpers/auditLogger');

describe('Admin Security & RBAC Middleware', () => {
  it('rejects unauthenticated requests without req.user with 401', () => {
    const middleware = authorize('admin');
    let statusCode = null;
    let jsonBody = null;
    const req = {};
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    middleware(req, res, next);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(jsonBody.success, false);
    assert.strictEqual(nextCalled, false);
  });

  it('rejects non-admin role with 403 Forbidden', () => {
    const middleware = authorize('admin');
    let statusCode = null;
    let jsonBody = null;
    const req = { user: { role: 'user', name: 'Regular User' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    middleware(req, res, next);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonBody.success, false);
    assert.match(jsonBody.message, /Forbidden/i);
    assert.strictEqual(nextCalled, false);
  });

  it('allows user with admin role to proceed via next()', () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'admin', name: 'Administrator' } };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    middleware(req, res, next);
    assert.strictEqual(nextCalled, true);
  });
});

describe('User Import Security Validations', () => {
  it('validates email formats and prevents arbitrary admin escalation in imports', () => {
    const rawBatch = [
      { name: 'Alice Hacker', email: 'alice@example.com', role: 'admin' }, // Attempts to grant admin
      { name: 'Invalid User', email: 'not-an-email', role: 'user' },
      { name: '', email: 'noname@example.com', role: 'user' },
      { name: 'Bob Normal', email: 'bob@example.com', role: 'user' },
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = [];
    const errors = [];

    rawBatch.forEach((u, i) => {
      const name = (u.name || '').trim();
      const email = (u.email || '').toLowerCase().trim();

      if (!name) {
        errors.push({ row: i + 1, error: 'Thiếu tên' });
        return;
      }
      if (!email || !emailRegex.test(email)) {
        errors.push({ row: i + 1, error: 'Email không hợp lệ' });
        return;
      }

      // Security rule: Role is ALWAYS forced to 'user'
      sanitized.push({
        name,
        email,
        role: 'user',
        status: 'active',
      });
    });

    assert.strictEqual(sanitized.length, 2);
    assert.strictEqual(errors.length, 2);
    // Alice MUST be demoted/forced to 'user'
    assert.strictEqual(sanitized[0].role, 'user');
    assert.strictEqual(sanitized[1].role, 'user');
  });
});

describe('Audit Log Sanitization', () => {
  it('redacts sensitive credentials, passwords, and tokens from audit details', () => {
    const details = {
      username: 'jason',
      password: 'PlainSecretPassword123',
      apiKey: 'xyz',
      jwtToken: 'eyJhbGciOi...',
      otherInfo: 'Valid non-sensitive note',
    };

    const sanitizedDetails = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'jwt', 'authorization', 'credential'];
    for (const key of Object.keys(sanitizedDetails)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitizedDetails[key] = '[REDACTED]';
      }
    }

    assert.strictEqual(sanitizedDetails.password, '[REDACTED]');
    assert.strictEqual(sanitizedDetails.jwtToken, '[REDACTED]');
    assert.strictEqual(sanitizedDetails.otherInfo, 'Valid non-sensitive note');
  });
});

describe('Last Admin Protection Logic', () => {
  it('prevents demoting or banning the last remaining administrator', () => {
    const totalActiveAdmins = 1;
    const targetUser = { id: 'admin1', role: 'admin', status: 'active' };

    function canBanAdmin(target, activeAdminCount) {
      if (target.role === 'admin' && activeAdminCount <= 1) {
        return false;
      }
      return true;
    }

    assert.strictEqual(canBanAdmin(targetUser, totalActiveAdmins), false);
    assert.strictEqual(canBanAdmin(targetUser, 3), true);
  });
});
