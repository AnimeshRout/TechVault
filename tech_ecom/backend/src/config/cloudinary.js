/**
 * Cloudinary Configuration
 * Sets up Cloudinary SDK with environment credentials.
 * Used for product image uploads.
 */
import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log('☁️  Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);
};

export { cloudinary };
export default configureCloudinary;
