const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { compressGlbWithDraco, isGlb } = require('../src/services/glbCompressor');
const geminiImage = require('../src/services/geminiImage');
const blueprintController = require('../src/controllers/blueprintController');
const { geminiFallbackChain } = require('../src/controllers/aiController');

const SAMPLE_GLB = path.resolve(__dirname, '../../frontend/public/models/furniture/dining_table_6chairs.glb');

describe('Draco GLB compression', () => {
  test('compresses a real GLB, output is still a GLB using KHR_draco_mesh_compression', async () => {
    const input = fs.readFileSync(SAMPLE_GLB);
    const result = await compressGlbWithDraco(input);

    assert.ok(isGlb(result.buffer));
    assert.ok(result.compressedBytes < result.originalBytes, 'output must be smaller');
    assert.ok(result.ratio > 1);
    // JSON chunk của GLB phải khai báo extension Draco
    const jsonLength = result.buffer.readUInt32LE(12);
    const gltfJson = JSON.parse(result.buffer.subarray(20, 20 + jsonLength).toString('utf8'));
    assert.ok((gltfJson.extensionsUsed || []).includes('KHR_draco_mesh_compression'));
  });

  test('rejects non-GLB input with status 400', async () => {
    await assert.rejects(() => compressGlbWithDraco(Buffer.from('hello')), (err) => err.status === 400);
  });

  test('compressGlb controller returns binary GLB with size headers', async () => {
    const headers = {};
    let statusCode = null;
    let body = null;
    const res = {
      setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
      status: (code) => { statusCode = code; return { end: (b) => { body = b; }, json: (j) => { body = j; } }; },
    };
    await blueprintController.compressGlb({ body: fs.readFileSync(SAMPLE_GLB) }, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(headers['content-type'], 'model/gltf-binary');
    assert.ok(Number(headers['x-compression-ratio']) > 1);
    assert.ok(isGlb(body));
  });

  test('compressGlb controller answers 400 for empty body', async () => {
    let statusCode = null;
    const res = { setHeader: () => {}, status: (code) => { statusCode = code; return { json: () => {}, end: () => {} }; } };
    await blueprintController.compressGlb({ body: {} }, res);
    assert.strictEqual(statusCode, 400);
  });
});

describe('Gemini image render service', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  const okBody = { candidates: [{ content: { parts: [{ text: 'here' }, { inlineData: { mimeType: 'image/png', data: Buffer.from('IMG').toString('base64') } }] } }] };

  test('sends the snapshot as inline image + prompt and decodes the returned image', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    let call = null;
    global.fetch = async (url, init) => {
      call = { url, init };
      return { ok: true, status: 200, json: async () => okBody };
    };

    const out = await geminiImage.renderImage({ imageBase64: 'QUJD', mimeType: 'image/png', prompt: 'make it real' });

    assert.strictEqual(out.buffer.toString(), 'IMG');
    assert.strictEqual(out.mimeType, 'image/png');
    assert.ok(call.url.includes(':generateContent'));
    assert.strictEqual(call.init.headers['x-goog-api-key'], 'test-key');
    const sent = JSON.parse(call.init.body);
    assert.deepStrictEqual(sent.generationConfig.responseModalities, ['TEXT', 'IMAGE']);
    assert.strictEqual(sent.contents[0].parts[0].inline_data.data, 'QUJD');
    assert.strictEqual(sent.contents[0].parts[1].text, 'make it real');
  });

  test('falls back to the next image model on 503 overload', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const tried = [];
    global.fetch = async (url) => {
      tried.push(url);
      if (tried.length === 1) return { ok: false, status: 503, json: async () => ({ error: { message: 'overloaded' } }) };
      return { ok: true, status: 200, json: async () => okBody };
    };

    const out = await geminiImage.renderImage({ imageBase64: 'QUJD', prompt: 'p' });
    assert.strictEqual(tried.length, 2);
    assert.strictEqual(out.model, geminiImage.imageModelChain()[1]);
  });

  test('does not retry on a non-retryable error (400) and explains missing image', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    let calls = 0;
    global.fetch = async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] }) };
    };
    await assert.rejects(() => geminiImage.renderImage({ imageBase64: 'QUJD', prompt: 'p' }), /SAFETY/);
    assert.strictEqual(calls, 1);
  });

  test('fails clearly when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(() => geminiImage.renderImage({ imageBase64: 'QUJD', prompt: 'p' }), /GEMINI_API_KEY/);
  });
});

describe('Gemini text fallback chain', () => {
  test('excludes the requested model and never retries gemini-2.5-flash by default', () => {
    const chain = geminiFallbackChain('gemini-3.5-flash');
    assert.ok(!chain.includes('gemini-3.5-flash'));
    assert.ok(!chain.includes('gemini-2.5-flash'));
    assert.ok(chain.length >= 2);
  });
});

describe('Gemini error messages', () => {
  test('free tier with zero image quota gets an actionable short message', () => {
    const raw = 'You exceeded your current quota...\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro-image';
    const msg = geminiImage.describeGeminiError('gemini-3-pro-image', 429, raw);
    assert.match(msg, /gói miễn phí/);
    assert.match(msg, /billing/);
    assert.ok(msg.length < 220);
  });

  test('other rate limits mention retry time; 503 says overloaded', () => {
    assert.match(geminiImage.describeGeminiError('m', 429, 'Please retry in 42s. more'), /42s/);
    assert.match(geminiImage.describeGeminiError('m', 503, 'busy'), /quá tải/);
  });
});
