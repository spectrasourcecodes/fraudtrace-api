const cloudinary = require('cloudinary').v2;

const configureCloudinary = () => {
  // Check if Cloudinary credentials exist
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️  Cloudinary not configured. Using local file storage.');
    return null;
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  console.log('✅ Cloudinary configured successfully');
  return cloudinary;
};

// Get Cloudinary instance (null if not configured)
const getCloudinary = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return null;
  }
  return cloudinary;
};

// Check if Cloudinary is available
const isCloudinaryAvailable = () => {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && 
            process.env.CLOUDINARY_API_KEY && 
            process.env.CLOUDINARY_API_SECRET);
};

module.exports = {
  configureCloudinary,
  getCloudinary,
  isCloudinaryAvailable,
  cloudinary, // Export the cloudinary instance directly
};