const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryAvailable } = require('../config/cloudinary');

// Ensure local uploads directory exists (as fallback)
const uploadDir = path.join(__dirname, '..', 'uploads', 'evidence');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter for security
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream', // Android compatibility
  ];

  // Allowed extensions
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx',
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  // Check by MIME type OR extension (for Android compatibility)
  const isValidMime = allowedMimeTypes.includes(file.mimetype);
  const isValidExtension = allowedExtensions.includes(fileExtension);

  if (!isValidMime && !isValidExtension) {
    return cb(new Error(`File type not allowed: ${file.originalname}`), false);
  }

  // Check for malicious file names
  const suspiciousPatterns = [
    /\.\./, /%00/, /%2e%2e/, /%2f/, /%5c/,
    /\.php/, /\.asp/, /\.jsp/, /\.cgi/, /\.pl/,
    /<script/i, /javascript:/i, /onload=/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.originalname)) {
      return cb(new Error('Suspicious file name detected'), false);
    }
  }

  cb(null, true);
};

// Choose storage based on Cloudinary availability
const storage = isCloudinaryAvailable()
  ? multer.memoryStorage() // Use memory storage for Cloudinary
  : multer.diskStorage({   // Use disk storage for local
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'evidence-' + uniqueSuffix + ext);
      }
    });

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
    fieldSize: 10 * 1024 * 1024,
  },
});

// Cloudinary upload function
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Check if Cloudinary is available
    if (!isCloudinaryAvailable()) {
      return reject(new Error('Cloudinary is not configured'));
    }

    if (!cloudinary) {
      return reject(new Error('Cloudinary instance not available'));
    }

    const uploadOptions = {
      folder: options.folder || 'fraud-trace-recovery',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'],
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        resolve(result);
      }
    );

    uploadStream.on('error', (error) => {
      console.error('Upload stream error:', error);
      reject(new Error('Upload stream failed'));
    });

    uploadStream.end(fileBuffer);
  });
};

// Upload multiple files to Cloudinary
const uploadMultipleToCloudinary = async (files, options = {}) => {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  if (!isCloudinaryAvailable()) {
    throw new Error('Cloudinary is not configured');
  }

  const uploadPromises = files.map((file) => {
    return uploadToCloudinary(file.buffer, {
      ...options,
      context: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: String(file.size),
      },
    });
  });

  return Promise.all(uploadPromises);
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryAvailable()) {
      return reject(new Error('Cloudinary is not configured'));
    }

    if (!cloudinary) {
      return reject(new Error('Cloudinary instance not available'));
    }

    cloudinary.uploader.destroy(publicId, options, (error, result) => {
      if (error) {
        console.error('Cloudinary delete error:', error);
        return reject(new Error(`Cloudinary delete failed: ${error.message}`));
      }
      resolve(result);
    });
  });
};

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'Upload error';
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 10MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 10 files.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      case 'LIMIT_FIELD_SIZE':
        message = 'Field value too large.';
        break;
      default:
        message = err.message;
    }
    
    return res.status(400).json({
      success: false,
      message: message,
      code: err.code,
    });
  }

  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'INVALID_FILE_TYPE',
    });
  }

  next(err);
};

// Export upload middleware and helpers
module.exports = upload;
module.exports.uploadToCloudinary = uploadToCloudinary;
module.exports.uploadMultipleToCloudinary = uploadMultipleToCloudinary;
module.exports.deleteFromCloudinary = deleteFromCloudinary;
module.exports.handleMulterError = handleMulterError;
module.exports.isCloudinaryAvailable = isCloudinaryAvailable;