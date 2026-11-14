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

  test('STORY-THUAN-BP16: generateAIRender4K rejects missing imageBase64 with 400', async () => {
    let statusCode = null;
    let jsonResponse = null;

    const req = {
      body: { style: 'scandinavian' },
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

    await blueprintController.generateAIRender4K(req, res);

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonResponse.success, false);
    assert.ok(jsonResponse.message.includes('Vui lòng cung cấp'));
  });

  test('STORY-THUAN-BP16: generateAIRender4K returns photorealistic 4K render payload under 5 seconds', async () => {
    let statusCode = null;
    let jsonResponse = null;

    const mockPngBase64 = Buffer.from('mock-png-image-binary-data').toString('base64');
    const req = {
      body: {
        imageBase64: `data:image/png;base64,${mockPngBase64}`,
        style: 'luxury_marble',
        customPrompt: 'warm dusk ambiance',
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

    await blueprintController.generateAIRender4K(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResponse.success, true);
    assert.ok(jsonResponse.renderUrl.includes('render_4k_luxury_marble'));
    assert.strictEqual(jsonResponse.width, 3840);
    assert.strictEqual(jsonResponse.height, 2160);
    assert.strictEqual(jsonResponse.style, 'luxury_marble');
    assert.ok(jsonResponse.enhancedPrompt.includes('Calacatta white marble'));
    assert.ok(jsonResponse.enhancedPrompt.includes('cyan LED strip'));
    assert.ok(jsonResponse.executionTimeMs < 5000, `Execution time ${jsonResponse.executionTimeMs}ms exceeds 5000ms`);
  });

  test('STORY-THUAN-BP16: serveCdnRender sets 1-year immutable caching header for PNG images', () => {
    const headers = {};
    const req = {
      params: { filename: 'render_sample_test.png' },
      method: 'GET',
    };
    const res = {
      setHeader: (key, val) => {
        headers[key.toLowerCase()] = val;
      },
      status: (code) => {
        res.statusCode = code;
        return {
          json: (d) => { res.body = d; }
        };
      },
      statusCode: 200,
    };

    blueprintController.serveCdnRender(req, res);

    assert.strictEqual(headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.strictEqual(headers['content-type'], 'image/png');
    assert.strictEqual(headers['access-control-allow-origin'], '*');
  });
});

