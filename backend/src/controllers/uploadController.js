const { uploadBuffer, uploadMedia, deleteMedia } = require('../services/cloudinaryService');

/**
 * @desc    Upload single file (multipart form-data)
 * @route   POST /api/upload
 * @access  Public / Protected
 */
exports.uploadSingle = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file để tải lên' });
    }

    const folder = req.body.folder || 'pickme3d/media';
    const resourceType = req.body.resourceType || 'auto';

    const result = await uploadBuffer(req.file.buffer, {
      folder,
      resourceType,
    });

    res.status(200).json({
      success: true,
      message: 'Tải lên Cloudinary thành công',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload base64 data URI or remote URL
 * @route   POST /api/upload/base64
 * @access  Public / Protected
 */
exports.uploadBase64 = async (req, res, next) => {
  try {
    const { file, dataUri, url, folder = 'pickme3d/media', resourceType = 'auto' } = req.body;
    const mediaSource = file || dataUri || url;

    if (!mediaSource) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu media (base64 data URI hoặc url)' });
    }

    const result = await uploadMedia(mediaSource, {
      folder,
      resourceType,
    });

    res.status(200).json({
      success: true,
      message: 'Tải lên Cloudinary thành công',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        duration: result.duration,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload multiple files
 * @route   POST /api/upload/multiple
 * @access  Public / Protected
 */
exports.uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một file' });
    }

    const folder = req.body.folder || 'pickme3d/media';
    const resourceType = req.body.resourceType || 'auto';

    const uploads = req.files.map((file) =>
      uploadBuffer(file.buffer, {
        folder,
        resourceType,
      })
    );

    const results = await Promise.all(uploads);

    res.status(200).json({
      success: true,
      message: `Đã tải lên ${results.length} files lên Cloudinary`,
      data: results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
        format: r.format,
        resourceType: r.resource_type,
        bytes: r.bytes,
        width: r.width,
        height: r.height,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete media from Cloudinary
 * @route   DELETE /api/upload/:publicId
 * @access  Protected
 */
exports.deleteAsset = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({ success: false, message: 'Thiếu publicId' });
    }

    const result = await deleteMedia(publicId, resourceType);

    res.status(200).json({
      success: true,
      message: 'Đã xóa media khỏi Cloudinary',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
