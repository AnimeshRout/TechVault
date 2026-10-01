/**
 * ============================================================================
 * UPLOAD CONTROLLER
 * ============================================================================
 * Handles image upload to Cloudinary using multer memory storage.
 * Supports multi-image upload for product galleries.
 * ============================================================================
 */
import multer from 'multer';
import { cloudinary } from '../config/cloudinary.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

// ─── MULTER CONFIG (Memory Storage) ─────────────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed (jpg, png, webp, gif).', 400), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // Max 10 files per upload
  },
});

// ─── UPLOAD IMAGES TO CLOUDINARY ─────────────────────────────────────────────
export const uploadImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image.', 400));
  }

  const uploadPromises = req.files.map((file) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'techvault/products',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto:best', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
        }
      );
      stream.end(file.buffer);
    });
  });

  const uploadedImages = await Promise.all(uploadPromises);

  res.status(200).json({
    status: 'success',
    message: `${uploadedImages.length} image(s) uploaded successfully`,
    data: { images: uploadedImages },
  });
});

// ─── DELETE IMAGE FROM CLOUDINARY ────────────────────────────────────────────
export const deleteImage = catchAsync(async (req, res, next) => {
  const { publicId } = req.params;

  if (!publicId) {
    return next(new AppError('Image public ID is required.', 400));
  }

  // Decode the publicId (URL-encoded slashes)
  const decodedPublicId = decodeURIComponent(publicId);
  const result = await cloudinary.uploader.destroy(decodedPublicId);

  if (result.result !== 'ok') {
    return next(new AppError('Failed to delete image.', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Image deleted successfully',
  });
});
