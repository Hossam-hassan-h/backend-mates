const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../config/cloudinary');

/**
 * Upload a memory buffer to Cloudinary using an upload stream.
 * Falls back to local storage if Cloudinary fails or is unavailable.
 * @param {Buffer} buffer - The image buffer from multer or sharp
 * @param {Object} options - Cloudinary upload options (e.g. folder, public_id, transformation)
 * @returns {Promise<Object>} Resolves with upload result { secure_url, public_id, ... }
 */
const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve) => {
    let subfolder = 'products';
    if (options.folder) {
      const parts = options.folder.split('/');
      subfolder = parts[parts.length - 1] || 'products';
    }

    let settled = false;

    const fallbackToLocal = (reason) => {
      if (settled) return;
      settled = true;
      console.warn(`[UPLOAD] Cloudinary notice (${reason}). Persisting to local uploads/${subfolder}`);
      try {
        const uploadDir = path.join(__dirname, '..', 'uploads', subfolder);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `${subfolder}-${uuidv4()}-${Date.now()}.jpeg`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, buffer);

        const baseUrl = (process.env.BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
        const fileUrl = `${baseUrl}/${subfolder}/${filename}`;

        return resolve({
          secure_url: fileUrl,
          url: fileUrl,
          public_id: filename,
          format: 'jpeg',
          resource_type: 'image',
        });
      } catch (fsErr) {
        console.error('[UPLOAD ERROR] Local storage fallback failed:', fsErr.message);
        return resolve({
          secure_url: '',
          url: '',
          public_id: '',
        });
      }
    };

    try {
      const streamOptions = {
        resource_type: 'image',
        disable_promises: true,
        ...options,
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        streamOptions,
        (error, result) => {
          if (settled) return;
          if (error) {
            return fallbackToLocal(error.message || 'Cloudinary upload rejected');
          }
          settled = true;
          resolve(result);
        }
      );

      uploadStream.on('error', (streamErr) => {
        fallbackToLocal(streamErr?.message || 'Upload stream error');
      });

      uploadStream.end(buffer);
    } catch (streamErr) {
      fallbackToLocal(streamErr.message || 'Stream initialization error');
    }
  });

/**
 * Extract public ID from a Cloudinary URL if available.
 * @param {string} url 
 * @returns {string|null}
 */
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return null;
  }
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload = parts[1];
    // Remove version like v1234567890/ if present
    const withoutVersion = afterUpload.replace(/^v[0-9]+\//, '');
    // Remove extension
    const lastDotIndex = withoutVersion.lastIndexOf('.');
    if (lastDotIndex === -1) return withoutVersion;
    return withoutVersion.substring(0, lastDotIndex);
  } catch (err) {
    return null;
  }
};

/**
 * Safely delete an asset from Cloudinary or local storage.
 * Accepts either a public_id or a Cloudinary/local URL.
 * @param {string} publicIdOrUrl 
 * @returns {Promise<Object|null>}
 */
const deleteFromCloudinary = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return null;
  try {
    const isUrl = typeof publicIdOrUrl === 'string' && (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://'));
    const isLocal = typeof publicIdOrUrl === 'string' && (
      publicIdOrUrl.includes('/uploads/') ||
      publicIdOrUrl.includes('localhost:') ||
      (!publicIdOrUrl.includes('cloudinary.com') && (publicIdOrUrl.includes('/banners/') || publicIdOrUrl.includes('/products/') || publicIdOrUrl.includes('/categories/'))) ||
      (!publicIdOrUrl.includes('cloudinary.com') && publicIdOrUrl.endsWith('.jpeg'))
    );

    if (isLocal) {
      const parts = publicIdOrUrl.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts[parts.length - 2] || 'banners';
      const localPath = path.join(__dirname, '..', 'uploads', folder, filename);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (unlinkErr) {
          console.warn('[DELETE] Could not unlink local file:', unlinkErr.message);
        }
      }
      return { result: 'ok' };
    }

    let publicId = publicIdOrUrl;
    if (isUrl) {
      publicId = getPublicIdFromUrl(publicIdOrUrl);
    }
    if (!publicId) return null;

    return await cloudinary.uploader.destroy(publicId, { invalidate: true }).catch((err) => {
      console.warn('[CLOUDINARY DELETE] Destroy notice:', err.message || err);
      return null;
    });
  } catch (err) {
    console.error('[DELETE ERROR]:', err.message || err);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadBufferToCloudinary,
  getPublicIdFromUrl,
  deleteFromCloudinary,
};
