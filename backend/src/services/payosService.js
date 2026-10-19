const crypto = require('crypto');

function hasKeys() {
  return Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);
}

function isMockMode() {
  if (process.env.PAYMENT_MOCK === 'true') return true;
  if (process.env.PAYMENT_MOCK === 'false') return false;
  return !hasKeys();
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
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

async function createPaymentLink({ orderCode, amount, description, returnUrl, cancelUrl }) {
  if (isMockMode()) {
    return {
      checkoutUrl: `${frontendUrl()}/payment/mock/?orderCode=${orderCode}`,
      paymentLinkId: `mock-${orderCode}`,
      mock: true,
    };
  }

  const { PayOS } = require('@payos/node');
  const client = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  });
  const link = await client.paymentRequests.create({
    orderCode: Number(orderCode),
    amount: Number(amount),
    description: String(description).slice(0, 25),
    returnUrl,
    cancelUrl,
  });
  return {
    checkoutUrl: link.checkoutUrl,
    paymentLinkId: link.paymentLinkId,
    mock: false,
  };
}

function verifyWebhook(body) {
  const data = body && body.data;
  if (!data || data.orderCode == null) {
    return { ok: false, message: 'Missing webhook data' };
  }

  if (isMockMode() && body.mock === true) {
    return {
      ok: true,
      mock: true,
      orderCode: Number(data.orderCode),
      amount: Number(data.amount),
      code: data.code || '00',
    };
  }

  if (!hasKeys()) {
    return { ok: false, message: 'payOS is not configured' };
  }

  const expected = signData(data, process.env.PAYOS_CHECKSUM_KEY);
  if (!safeEqual(expected, body.signature)) {
    return { ok: false, message: 'Invalid signature' };
  }
  if (String(data.code || body.code) !== '00') {
    return { ok: false, message: 'Transaction not successful' };
  }
  return {
    ok: true,
    mock: false,
    orderCode: Number(data.orderCode),
    amount: Number(data.amount),
    code: '00',
  };
}

async function getPaymentLinkInformation(orderCode) {
  if (isMockMode()) return { status: 'PENDING' };
  try {
    const { PayOS } = require('@payos/node');
    const client = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
    const info = await client.paymentRequests.get(Number(orderCode));
    return { status: info.status || 'PENDING', raw: info };
  } catch (err) {
    console.warn('payOS status lookup failed:', err.message);
    return { status: 'PENDING' };
  }
}

module.exports = {
  isMockMode,
  frontendUrl,
  signData,
  createPaymentLink,
  verifyWebhook,
  getPaymentLinkInformation,
};
