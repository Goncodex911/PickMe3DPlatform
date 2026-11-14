const fs = require('fs');
const path = require('path');
const blueprintJobQueue = require('../services/blueprintJobQueue');
const geminiImage = require('../services/geminiImage');
const glbCompressor = require('../services/glbCompressor');
const { uploadBuffer, uploadMedia } = require('../services/cloudinaryService');

/**
 * Đọc kích thước thật từ header PNG (IHDR: width/height ở byte 16..23).
 * Trả null nếu buffer không phải PNG hợp lệ.
 */
function readPngSize(buffer) {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer || buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
exports.readPngSize = readPngSize;

/**
 * Upload .GLB 3D model to Cloudinary / CDN
 * POST /api/blueprint/upload-glb
 */
exports.upload3DModel = async (req, res) => {
  try {
    let fileBuffer = null;
    let filename = req.body?.filename || `model_3d_${Date.now()}.glb`;

    // 1. From Multer file upload
    if (req.file) {
      fileBuffer = req.file.buffer;
      filename = req.file.originalname || filename;
    }
    // 2. From Base64 data URI in body
    else if (req.body?.fileData) {
      const base64Data = req.body.fileData.replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy dữ liệu tệp 3D .GLB hợp lệ.',
      });
    }

    let cdnUrl = null;
    let publicId = null;

    // Check Cloudinary environment config
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const uploadRes = await uploadBuffer(fileBuffer, {
          folder: 'pickme3d/models_3d',
          resource_type: 'raw',
          public_id: path.parse(filename).name,
        });
        cdnUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
      } catch (cloudErr) {
        console.warn('Cloudinary upload fallback to local storage:', cloudErr.message);
      }
    }

    // Local CDN static storage fallback
    if (!cdnUrl) {
      const storageDir = path.resolve(__dirname, '../../uploads/models_3d');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      const safeFilename = `${Date.now()}_${path.basename(filename)}`;
      const localFilePath = path.join(storageDir, safeFilename);
      fs.writeFileSync(localFilePath, fileBuffer);
      cdnUrl = `/api/blueprint/cdn/${safeFilename}`;
      publicId = safeFilename;
    }

    return res.status(200).json({
      success: true,
      url: cdnUrl,
      publicId,
      filename,
      sizeBytes: fileBuffer.length,
      sizeKb: Math.round(fileBuffer.length / 1024),
      format: 'glb',
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in upload3DModel:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi tải lên mô hình 3D .GLB',
    });
  }
};

/**
 * Get background job status
 * GET /api/blueprint/jobs/:jobId
 */
exports.getJobStatus = async (req, res) => {
  const { jobId } = req.params;
  const job = blueprintJobQueue.getJob(jobId);

  // Tác vụ của người khác trả 404 như không tồn tại (không lộ kết quả render của người khác)
  const requesterId = String((req.auth && req.auth.id) || (req.user && req.user.id) || '');
  const ownerId = job && job.payload && job.payload.ownerId;
  if (!job || (ownerId && ownerId !== requesterId)) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy tác vụ có mã ${jobId}`,
    });
  }

  return res.status(200).json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  });
};

/**
 * Stream real-time job progress via Server-Sent Events (SSE)
 * GET /api/blueprint/jobs/:jobId/events
 */
exports.streamJobEvents = (req, res) => {
  const { jobId } = req.params;
  const job = blueprintJobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy tác vụ có mã ${jobId}`,
    });
  }

  // Setup Server-Sent Events (SSE) Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial event
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  if (job.status === 'completed' || job.status === 'failed') {
    return res.end();
  }

  // Listener for ongoing progress
  const progressHandler = (updatedJob) => {
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
  };

  const completedHandler = (finalJob) => {
    res.write(`data: ${JSON.stringify(finalJob)}\n\n`);
    cleanup();
    res.end();
  };

  const failedHandler = (failedJob) => {
    res.write(`data: ${JSON.stringify(failedJob)}\n\n`);
    cleanup();
    res.end();
  };

  const cleanup = () => {
    blueprintJobQueue.off(`progress:${jobId}`, progressHandler);
    blueprintJobQueue.off(`completed:${jobId}`, completedHandler);
    blueprintJobQueue.off(`failed:${jobId}`, failedHandler);
  };

  blueprintJobQueue.on(`progress:${jobId}`, progressHandler);
  blueprintJobQueue.on(`completed:${jobId}`, completedHandler);
  blueprintJobQueue.on(`failed:${jobId}`, failedHandler);

  req.on('close', cleanup);
};

/**
 * Serve .GLB 3D files with optimized CDN Caching Headers (Story 5.2 Task 5.2.2)
 * GET /api/blueprint/cdn/:filename
 */
exports.serveCdnGlb = (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const storageDir = path.resolve(__dirname, '../../uploads/models_3d');
  const filePath = path.join(storageDir, safeFilename);

  // Set High-Performance CDN Caching Headers
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 Year Edge Cache
  res.setHeader('Content-Type', 'model/gltf-binary');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // If local file exists, stream it
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    const readStream = fs.createReadStream(filePath);
    return readStream.pipe(res);
  }

  // Fallback demo response if file not physically created yet
  res.setHeader('X-Fallback-Model', 'demo-generated');
  return res.status(200).send(Buffer.from('glTF-binary-mock-payload'));
};

const STYLE_PROMPTS = {
  scandinavian: 'Scandinavian design, light oak parquet floor with natural timber grain, warm white plaster walls, soft grey fabric upholstery, green indoor plants, gentle morning sunlight through large windows',
  luxury_marble: 'ultra-luxury interior, polished Calacatta white marble floor with crisp reflections, recessed warm LED ceiling spots, full-height glass partitions with matte black trim, high-end Italian furniture, dusk mood lighting',
  modern_minimal: 'modern minimalist interior, vertical wood slat dividers, warm LED cove lighting along ceiling edges, low-profile furniture, smooth microcement flooring, uncluttered',
  casa_serra: 'Mediterranean modern villa, rough warm sand plaster, natural teak wood furniture, dark basalt slate terrace tiles, golden hour sunlight',
  tropical: 'tropical modern residence, lush planters, natural teak plank floor, airy open-plan layout, warm ambient sunlight',
};

/** Prompt image-to-image: giữ nguyên hình khối & góc máy của ảnh WebGL, chỉ nâng chất liệu/ánh sáng. */
function buildRenderPrompt(style, customPrompt) {
  const styleText = STYLE_PROMPTS[style] || STYLE_PROMPTS.casa_serra;
  return [
    'Turn this 3D architectural viewport screenshot into a photorealistic architectural visualization photograph.',
    'Keep EXACTLY the same camera angle, room layout, wall positions, openings and furniture placement; do not add or remove rooms, walls or windows.',
    `Style: ${styleText}.`,
    'Realistic materials, soft global illumination, natural shadows, high detail, no text, no watermark.',
    customPrompt ? `Additional notes: ${String(customPrompt).slice(0, 500)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
exports.buildRenderPrompt = buildRenderPrompt;

/** Kích thước thật của ảnh PNG hoặc JPEG (null nếu không đọc được). */
function readImageSize(buffer) {
  const png = readPngSize(buffer);
  if (png) return png;
  if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    // SOF0..SOF15 (trừ DHT/JPG/DAC) chứa chiều cao/rộng
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}
exports.readImageSize = readImageSize;

const MAX_SNAPSHOT_BASE64_CHARS = 14 * 1024 * 1024; // ~10MB ảnh

/**
 * AI Render phối cảnh bằng Gemini image model (STORY-THUAN-BP16).
 * POST /api/blueprint/ai-render-4k  ->  202 { jobId }; theo dõi qua GET /api/blueprint/jobs/:jobId
 * (Tên route giữ nguyên để tương thích; ảnh trả về có độ phân giải do model quyết định, xem width/height.)
 */
exports.generateAIRender4K = async (req, res) => {
  try {
    const { imageBase64, style = 'casa_serra', customPrompt = '' } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ảnh chụp góc nhìn 3D (imageBase64).',
      });
    }

    const mimeMatch = /^data:(image\/(?:png|jpeg|webp));base64,/.exec(imageBase64);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const rawBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    if (!rawBase64) {
      return res.status(400).json({ success: false, message: 'Ảnh chụp góc nhìn 3D rỗng.' });
    }
    if (rawBase64.length > MAX_SNAPSHOT_BASE64_CHARS) {
      return res.status(413).json({ success: false, message: 'Ảnh chụp quá lớn (tối đa ~10MB).' });
    }

    const prompt = buildRenderPrompt(style, customPrompt);
    const ownerId = String((req.auth && req.auth.id) || (req.user && req.user.id) || '');
    // Không lưu ảnh base64 trong payload của job (job được trả qua API/SSE)
    const job = blueprintJobQueue.createJob('ai_render', { style, ownerId });

    blueprintJobQueue.processJob(job.id, async (_job, update) => {
      update(15, 'Đang gửi ảnh phối cảnh tới Gemini...');
      const startedAt = Date.now();
      const output = await geminiImage.renderImage({
        imageBase64: rawBase64,
        mimeType,
        prompt,
        onAttempt: (model) => update(30, `Gemini (${model}) đang render ảnh chân thực...`),
      });

      update(85, 'Đang lưu ảnh render...');
      const ext = output.mimeType === 'image/jpeg' ? 'jpg' : output.mimeType === 'image/webp' ? 'webp' : 'png';
      const safeStyle = String(style).replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'style';
      const filename = `render_ai_${safeStyle}_${Date.now()}.${ext}`;
      const rendersDir = path.resolve(__dirname, '../../uploads/renders');
      if (!fs.existsSync(rendersDir)) fs.mkdirSync(rendersDir, { recursive: true });
      fs.writeFileSync(path.join(rendersDir, filename), output.buffer);

      let renderUrl = `/api/blueprint/cdn/renders/${filename}`;
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        try {
          const uploadRes = await uploadBuffer(output.buffer, {
            folder: 'pickme3d/renders_ai',
            resource_type: 'image',
            public_id: path.parse(filename).name,
          });
          if (uploadRes && uploadRes.secure_url) renderUrl = uploadRes.secure_url;
        } catch (cloudErr) {
          console.warn('Cloudinary render upload fallback to local storage:', cloudErr.message);
        }
      }

      const size = readImageSize(output.buffer);
      return {
        simulated: false,
        renderUrl,
        model: output.model,
        mimeType: output.mimeType,
        width: size ? size.width : null,
        height: size ? size.height : null,
        resolution: size ? `${size.width}x${size.height}` : 'không xác định',
        style,
        enhancedPrompt: prompt,
        executionTimeMs: Date.now() - startedAt,
      };
    });

    return res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      statusUrl: `/api/blueprint/jobs/${job.id}`,
      enhancedPrompt: prompt,
    });
  } catch (error) {
    console.error('Error in generateAIRender4K:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi khởi tạo AI render',
    });
  }
};

/**
 * Serve Rendered Images with CDN Caching
 * GET /api/blueprint/cdn/renders/:filename
 */
exports.serveCdnRender = (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const storageDir = path.resolve(__dirname, '../../uploads/renders');
  const filePath = path.join(storageDir, safeFilename);

  const RENDER_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Type', RENDER_TYPES[path.extname(safeFilename).toLowerCase()] || 'image/png');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    const readStream = fs.createReadStream(filePath);
    return readStream.pipe(res);
  }

  return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh render' });
};



/**
 * Nén Draco một file GLB (body nhị phân model/gltf-binary), trả lại GLB đã nén.
 * POST /api/blueprint/compress-glb
 * Header phản hồi: X-Original-Bytes, X-Compressed-Bytes, X-Compression-Ratio
 */
exports.compressGlb = async (req, res) => {
  try {
    const input = req.body;
    if (!Buffer.isBuffer(input) || input.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng gửi nội dung file .GLB (Content-Type: model/gltf-binary).',
      });
    }

    const result = await glbCompressor.compressGlbWithDraco(input);
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Length', result.compressedBytes);
    res.setHeader('X-Original-Bytes', String(result.originalBytes));
    res.setHeader('X-Compressed-Bytes', String(result.compressedBytes));
    res.setHeader('X-Compression-Ratio', String(result.ratio));
    res.setHeader('Access-Control-Expose-Headers', 'X-Original-Bytes, X-Compressed-Bytes, X-Compression-Ratio');
    return res.status(200).end(result.buffer);
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Error in compressGlb:', error);
    return res.status(status).json({
      success: false,
      message: status === 400 ? error.message : `Không nén được file GLB: ${error.message}`,
    });
  }
};
