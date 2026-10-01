/**
 * Upload Routes — Admin only
 * POST   /api/upload/images              — Upload images to Cloudinary
 * DELETE /api/upload/images/:publicId     — Delete image from Cloudinary
 */
import express from 'express';
import { upload, uploadImages, deleteImage } from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/rbac.js';

const router = express.Router();

// All upload routes require admin authentication
router.use(protect, authorize('admin'));

router.post('/images', upload.array('images', 10), uploadImages);
router.delete('/images/:publicId', deleteImage);

export default router;
