const crypto = require('crypto');

function hasKeys() {
  return Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isLocalFrontend() {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(frontendUrl());
}

/**
 * Mock checkout lets anyone confirm an order without paying, so it is never a silent fallback on a deployed server.
 * - PAYMENT_MOCK=false: always the real gateway.
 * - PAYMENT_MOCK=true: mock, but on NODE_ENV=production only with ALLOW_MOCK_PAYMENT_IN_PRODUCTION=true.
 * - PAYMENT_MOCK empty: mock only for a local dev machine (not production, no keys, FRONTEND_URL on localhost).
 */
function isMockMode() {
  const flag = String(process.env.PAYMENT_MOCK || '').trim().toLowerCase();
  if (flag === 'false') return false;
  if (isProduction() && process.env.ALLOW_MOCK_PAYMENT_IN_PRODUCTION !== 'true') return false;
  if (flag === 'true') return true;
  return !hasKeys() && !isProduction() && isLocalFrontend();
}

/** True when real checkouts can be created (mock or configured payOS). */
function isConfigured() {
  return isMockMode() || hasKeys();
}

function describeMode() {
  if (isMockMode()) return 'mock';
  return hasKeys() ? 'payos' : 'unconfigured';
}

function sortQuery(data) {
  return Object.keys(data)
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('&');
}

function signData(data, checksumKey) {
  return crypto.createHmac('sha256', checksumKey).update(sortQuery(data)).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function gatewayError(message, code = 'PAYMENT_GATEWAY_UNAVAILABLE', statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

let cachedClient = null;
function client() {
  if (!hasKeys()) throw gatewayError('Cổng thanh toán chưa được cấu hình', 'PAYMENT_NOT_CONFIGURED', 503);
  if (!cachedClient) {
    const { PayOS } = require('@payos/node');
    cachedClient = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
      timeout: Number(process.env.PAYOS_TIMEOUT_MS) || 15000,
      maxRetries: 1,
    });
  }
  return cachedClient;
}

/**
 * Creates the hosted payment link. `expiresAt` (Date) makes payOS refuse payments after the order's validity,
 * so the gateway and the local order expire together.
 */
async function createPaymentLink({ orderCode, amount, description, returnUrl, cancelUrl, expiresAt }) {
  if (isMockMode()) {
    return {
      checkoutUrl: `${frontendUrl()}/payment/mock/?orderCode=${orderCode}`,
      paymentLinkId: `mock-${orderCode}`,
      mock: true,
    };
  }
  if (!hasKeys()) throw gatewayError('Cổng thanh toán chưa được cấu hình', 'PAYMENT_NOT_CONFIGURED', 503);

  try {
    const link = await client().paymentRequests.create({
      orderCode: Number(orderCode),
      amount: Number(amount),
      description: String(description).slice(0, 25),
      returnUrl,
      cancelUrl,
      ...(expiresAt ? { expiredAt: Math.floor(new Date(expiresAt).getTime() / 1000) } : {}),
    });
    if (!link || !link.checkoutUrl) throw new Error('payOS không trả về checkoutUrl');
    return { checkoutUrl: link.checkoutUrl, paymentLinkId: link.paymentLinkId, mock: false };
  } catch (err) {
    if (err.statusCode) throw err;
    throw gatewayError(`Không tạo được link thanh toán: ${err.message}`);
  }
}

/** Verifies a payOS webhook body. Mock confirmations never come through here (see POST /payments/mock/confirm). */
function verifyWebhook(body) {
  const data = body && body.data;
  if (!data || data.orderCode == null) {
    return { ok: false, message: 'Missing webhook data' };
  }
  if (body.mock === true) {
    return { ok: false, message: 'Mock confirmations are not accepted on the webhook' };
  }
  if (!hasKeys()) {
    return { ok: false, message: 'payOS is not configured' };
  }

  const expected = signData(data, process.env.PAYOS_CHECKSUM_KEY);
  if (!safeEqual(expected, body.signature)) {
    return { ok: false, signatureValid: false, message: 'Invalid signature' };
  }
  const base = {
    signatureValid: true,
    orderCode: Number(data.orderCode),
    amount: Number(data.amount),
    reference: String(data.reference || ''),
    paymentLinkId: String(data.paymentLinkId || ''),
    transactionAt: data.transactionDateTime || null,
  };
  if (String(data.code || body.code) !== '00') {
    return { ok: false, ...base, message: 'Transaction not successful' };
  }
  return { ok: true, mock: false, code: '00', ...base };
}

/**
 * Looks the order up on payOS. `ok: false` means the gateway could not be reached: callers must NOT read that as
 * "unpaid" (the customer may already have been charged).
 */
async function getPaymentLinkInformation(orderCode) {
  if (isMockMode()) return { ok: true, status: 'PENDING', mock: true };
  if (!hasKeys()) return { ok: false, error: 'payOS is not configured' };
  try {
    const info = await client().paymentRequests.get(Number(orderCode));
    const transactions = Array.isArray(info.transactions) ? info.transactions : [];
    const last = transactions[transactions.length - 1] || null;
    return {
      ok: true,
      status: info.status || 'PENDING',
      amount: Number(info.amount) || 0,
      amountPaid: Number(info.amountPaid) || 0,
      reference: last ? String(last.reference || '') : '',
      transactionAt: last ? last.transactionDateTime : null,
      transactionCount: transactions.length,
      raw: info,
    };
  } catch (err) {
    const status = err && (err.status || err.statusCode);
    // payOS answers 4xx for an order code it never saw (e.g. link creation failed).
    if (status === 404 || /not\s*found|không tồn tại/i.test(String(err && err.message))) {
      return { ok: true, status: 'NOT_FOUND' };
    }
    console.warn('payOS status lookup failed:', err.message);
    return { ok: false, error: err.message || 'payOS lookup failed' };
  }
}

/** Cancels the hosted link so the customer can no longer pay it. Returns { ok } and never throws. */
async function cancelPaymentLink(orderCode, reason = 'Cancelled') {
  if (isMockMode()) return { ok: true, mock: true };
  if (!hasKeys()) return { ok: false, error: 'payOS is not configured' };
  try {
    const info = await client().paymentRequests.cancel(Number(orderCode), String(reason).slice(0, 100));
    return { ok: true, status: info && info.status };
  } catch (err) {
    console.warn('payOS cancel failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  hasKeys,
  isMockMode,
  isConfigured,
  isProduction,
  describeMode,
  frontendUrl,
  signData,
  createPaymentLink,
  verifyWebhook,
  getPaymentLinkInformation,
  cancelPaymentLink,
};
