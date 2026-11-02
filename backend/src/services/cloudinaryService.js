const streamifier = require('stream');
const cloudinary = require('../config/cloudinary');

/**
 * Checks if a string is a data URI (e.g. data:image/png;base64,... or data:video/mp4;base64,...)
 */
function isDataUri(str) {
  return typeof str === 'string' && /^data:(image|video|audio|application)\/[a-zA-Z0-9+.-]+;base64,/.test(str);
}

/**
 * Upload a file buffer or stream to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>}
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'pickme3d/media',
        resource_type: options.resourceType || 'auto',
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    const readable = new streamifier.Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

/**
 * Upload base64 data URI, file path, or remote URL to Cloudinary
 * @param {string} fileOrDataUri - Base64 data URI, URL, or local path
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>}
 */
async function uploadMedia(fileOrDataUri, options = {}) {
  const defaultOptions = {
    folder: options.folder || 'pickme3d/media',
    resource_type: options.resourceType || 'auto',
    ...options,
  };

  return await cloudinary.uploader.upload(fileOrDataUri, defaultOptions);
}

/**
 * Helper to upload if base64, otherwise return original string
 * Ideal for controllers receiving either existing URL or new base64 image
 * @param {string} value - Potential data URI or existing URL
 * @param {string} folder - Destination folder on Cloudinary
 * @returns {Promise<string>} Secure URL on Cloudinary, or original value
 */
async function uploadIfBase64(value, folder = 'pickme3d/media') {
  if (!value || typeof value !== 'string') return value;
  if (!isDataUri(value)) return value;

  try {
    const res = await uploadMedia(value, { folder, resource_type: 'auto' });
    return res.secure_url;
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    throw err;
  }
}

/**
 * Delete a media asset by public ID
 * @param {string} publicId
 * @param {string} resourceType
 * @returns {Promise<Object>}
 */
async function deleteMedia(publicId, resourceType = 'image') {
  return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = {
  cloudinary,
  isDataUri,
  uploadBuffer,
  uploadMedia,
  uploadIfBase64,
  deleteMedia,
};
