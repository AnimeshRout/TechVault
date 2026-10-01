/**
 * User Routes
 * All routes require authentication (protect middleware)
 *
 * GET    /api/users/profile             — Get user profile
 * PUT    /api/users/profile             — Update profile (name, avatar)
 * PUT    /api/users/password            — Change password
 * POST   /api/users/address             — Add address
 * PUT    /api/users/address/:addressId  — Update address
 * DELETE /api/users/address/:addressId  — Remove address
 * GET    /api/users/wishlist            — Get wishlist
 * POST   /api/users/wishlist            — Add to wishlist
 * DELETE /api/users/wishlist/:productId — Remove from wishlist
 */
import express from 'express';
import multer from 'multer';
import {
  getMe,
  updateProfile,
  updatePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { updatePasswordSchema, addressSchema } from '../validators/authValidator.js';

const router = express.Router();

// Multer config for avatar upload (memory storage → Cloudinary)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// All user routes require authentication
router.use(protect);

// Profile
router.get('/profile', getMe);
router.put('/profile', avatarUpload.single('avatar'), updateProfile);
router.put('/password', validate(updatePasswordSchema), updatePassword);

// Addresses
router.post('/address', validate(addressSchema), addAddress);
router.put('/address/:addressId', validate(addressSchema), updateAddress);
router.delete('/address/:addressId', deleteAddress);

// Wishlist
router.get('/wishlist', getWishlist);
router.post('/wishlist', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

export default router;
