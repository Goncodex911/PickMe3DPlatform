const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const blueprintJobQueue = require('../src/services/blueprintJobQueue');
const blueprintController = require('../src/controllers/blueprintController');

describe('STORY-THUAN-BP10: Blueprint Background Queue & CDN Delivery', () => {
  test('Job Queue: enqueues job and updates progress incrementally to 100%', async () => {
    const job = blueprintJobQueue.createJob('blueprint_to_3d', {
      projectId: 'test_villa_01',
      dimensions: { width: 14, length: 12 },
    });

    assert.ok(job.id.startsWith('job_bp_'));
    assert.strictEqual(job.status, 'queued');
    assert.strictEqual(job.progress, 0);

    // Update progress
    blueprintJobQueue.updateProgress(job.id, 45, 'Đang nắn vuông góc vector tường...');
    const updated = blueprintJobQueue.getJob(job.id);
    assert.strictEqual(updated.status, 'processing');
    assert.strictEqual(updated.progress, 45);
    assert.strictEqual(updated.stage, 'Đang nắn vuông góc vector tường...');

    // Complete job
    blueprintJobQueue.completeJob(job.id, {
      glbUrl: '/api/blueprint/cdn/test_villa_01.glb',
      roomsCount: 4,
    });
    const completed = blueprintJobQueue.getJob(job.id);
    assert.strictEqual(completed.status, 'completed');
    assert.strictEqual(completed.progress, 100);
    assert.strictEqual(completed.result.roomsCount, 4);
    assert.ok(completed.result.glbUrl.includes('test_villa_01.glb'));
  });

  test('Job Queue: emits event listeners on progress update and completion', async () => {
    const job = blueprintJobQueue.createJob('blueprint_to_3d', { test: true });
    let progressReceived = null;
    let completedReceived = null;

    blueprintJobQueue.on(`progress:${job.id}`, (j) => {
      progressReceived = j.progress;
    });

    blueprintJobQueue.on(`completed:${job.id}`, (j) => {
      completedReceived = j.status;
    });

    blueprintJobQueue.updateProgress(job.id, 60, 'Dựng mesh tường...');
    assert.strictEqual(progressReceived, 60);

    blueprintJobQueue.completeJob(job.id, { done: true });
    assert.strictEqual(completedReceived, 'completed');
  });

  test('CDN Headers: serveCdnGlb sets 1-year immutable caching and gltf-binary mime type', () => {
    const headers = {};
    const req = {
      params: { filename: 'villa_test_model.glb' },
      method: 'GET',
    };
    const res = {
      setHeader: (key, val) => {
        headers[key.toLowerCase()] = val;
      },
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      send: (body) => {
        res.body = body;
        return res;
      },
      statusCode: 200,
    };

    blueprintController.serveCdnGlb(req, res);

    assert.strictEqual(headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.strictEqual(headers['content-type'], 'model/gltf-binary');
    assert.strictEqual(headers['access-control-allow-origin'], '*');
    assert.strictEqual(res.statusCode, 200);
  });

  test('Controller: queue3DReconstruction rejects empty blueprint payload with 400', async () => {
    let statusCode = null;
    let jsonResponse = null;

    const req = {
      body: {}, // empty body
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            jsonResponse = data;
          },
        };
      },
    };

    await blueprintController.queue3DReconstruction(req, res);

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonResponse.success, false);
    assert.ok(jsonResponse.message.includes('Vui lòng cung cấp'));
  });

  test('Controller: upload3DModel accepts base64 GLB payload and returns 200 with URL', async () => {
    let statusCode = null;
    let jsonResponse = null;

    const mockGlbBase64 = Buffer.from('glTF-mock-binary-data').toString('base64');
    const req = {
      body: {
        filename: 'apartment_unit_01.glb',
        fileData: `data:model/gltf-binary;base64,${mockGlbBase64}`,
      },
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            jsonResponse = data;
          },
        };
      },
    };

    await blueprintController.upload3DModel(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResponse.success, true);
    assert.ok(jsonResponse.url);
    assert.strictEqual(jsonResponse.format, 'glb');
    assert.ok(jsonResponse.sizeBytes > 0);
  });
});

