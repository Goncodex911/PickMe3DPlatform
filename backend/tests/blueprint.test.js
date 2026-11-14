const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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

  test('STORY-THUAN-BP16: generateAIRender4K queues a real Gemini render job and stores the AI image', async () => {
    const geminiImage = require('../src/services/geminiImage');
    const original = geminiImage.renderImage;
    // PNG 1x1 hợp lệ do "model" trả về
    const fakePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    let received = null;
    geminiImage.renderImage = async (input) => {
      received = input;
      return { model: 'gemini-test-image', mimeType: 'image/png', buffer: fakePng };
    };

    try {
      let statusCode = null;
      let jsonResponse = null;
      const req = {
        auth: { id: 'user_render_1' },
        body: {
          imageBase64: `data:image/png;base64,${Buffer.from('snapshot').toString('base64')}`,
          style: 'luxury_marble',
          customPrompt: 'warm dusk ambiance',
        },
      };
      const res = { status: (code) => { statusCode = code; return { json: (d) => { jsonResponse = d; } }; } };

      await blueprintController.generateAIRender4K(req, res);

      assert.strictEqual(statusCode, 202);
      assert.ok(jsonResponse.jobId.startsWith('job_bp_'));
      assert.ok(jsonResponse.enhancedPrompt.includes('Calacatta white marble'));
      assert.ok(jsonResponse.enhancedPrompt.includes('same camera angle'));

      const job = await new Promise((resolve, reject) => {
        blueprintJobQueue.once(`completed:${jsonResponse.jobId}`, resolve);
        blueprintJobQueue.once(`failed:${jsonResponse.jobId}`, (j) => reject(new Error(j.error)));
      });

      assert.strictEqual(received.mimeType, 'image/png');
      assert.strictEqual(received.imageBase64, Buffer.from('snapshot').toString('base64'));
      assert.strictEqual(job.result.simulated, false);
      assert.strictEqual(job.result.model, 'gemini-test-image');
      assert.strictEqual(job.result.width, 1);
      assert.strictEqual(job.result.height, 1);
      assert.ok(/render_ai_luxury_marble_\d+\.png$/.test(job.result.renderUrl) || job.result.renderUrl.startsWith('http'));
      // Ảnh base64 không được nằm trong payload của job (job được trả qua API/SSE)
      assert.strictEqual(job.payload.imageBase64, undefined);
      assert.strictEqual(job.payload.ownerId, 'user_render_1');
      // Dọn file ảnh do test sinh ra
      const localFile = /\/cdn\/renders\/(.+)$/.exec(job.result.renderUrl);
      if (localFile) fs.rmSync(path.resolve(__dirname, '../uploads/renders', localFile[1]), { force: true });
    } finally {
      geminiImage.renderImage = original;
    }
  });

  test('getJobStatus hides jobs owned by another user', async () => {
    const job = blueprintJobQueue.createJob('ai_render', { ownerId: 'owner_a' });
    const call = async (auth) => {
      let statusCode = null;
      const res = { status: (code) => { statusCode = code; return { json: () => {} }; } };
      await blueprintController.getJobStatus({ params: { jobId: job.id }, auth }, res);
      return statusCode;
    };
    assert.strictEqual(await call({ id: 'owner_a' }), 200);
    assert.strictEqual(await call({ id: 'someone_else' }), 404);
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


describe('Blueprint render size & route protection', () => {
  test('readPngSize reads width/height from a real PNG header', () => {
    const header = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
    header.writeUInt32BE(1920, 16);
    header.writeUInt32BE(1080, 20);
    assert.deepStrictEqual(blueprintController.readPngSize(header), { width: 1920, height: 1080 });
    assert.strictEqual(blueprintController.readPngSize(Buffer.from('not-a-png')), null);
  });

  test('write routes of /api/blueprint and /api/ai/complete require authentication', () => {
    const { attachUser } = require('../src/middlewares/planMiddleware');
    const routeHandlers = (router, method, routePath) => {
      const layer = router.stack.find((l) => l.route && l.route.path === routePath && l.route.methods[method]);
      assert.ok(layer, `missing route ${method.toUpperCase()} ${routePath}`);
      return layer.route.stack.map((s) => s.handle);
    };

    const blueprintRoutes = require('../src/routes/blueprintRoutes');
    for (const p of ['/upload-glb', '/compress-glb', '/ai-render-4k']) {
      assert.ok(routeHandlers(blueprintRoutes, 'post', p).includes(attachUser), `${p} must use attachUser`);
    }
    assert.ok(routeHandlers(blueprintRoutes, 'get', '/jobs/:jobId').includes(attachUser));
    // Dựng 3D mô phỏng đã bị gỡ
    assert.ok(!blueprintRoutes.stack.some((l) => l.route && l.route.path === '/queue-job'));
    // Đọc GLB/ảnh qua CDN vẫn công khai
    assert.ok(!routeHandlers(blueprintRoutes, 'get', '/cdn/:filename').includes(attachUser));

    const aiRoutes = require('../src/routes/aiRoutes');
    assert.ok(routeHandlers(aiRoutes, 'post', '/complete').includes(attachUser));
  });
});
