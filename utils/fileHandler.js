const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Validate file type
 * @param {Object} file - Multer file object
 * @param {Array} allowedTypes - Allowed MIME types
 * @returns {Boolean} Is file type valid
 */
const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.mimetype);
};

/**
 * Validate file size
 * @param {Object} file - Multer file object
 * @param {Number} maxSize - Maximum file size in bytes
 * @returns {Boolean} Is file size valid
 */
const validateFileSize = (file, maxSize) => {
  return file.size <= maxSize;
};

/**
 * Generate unique filename
 * @param {String} originalName - Original file name
 * @returns {String} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName);
  const basename = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  
  return `${basename}_${timestamp}_${randomString}${extension}`;
};

/**
 * Get file type category
 * @param {String} mimetype - File MIME type
 * @returns {String} File category
 */
const getFileCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'document';
  if (mimetype.startsWith('video/')) return 'video';
  return 'other';
};

/**
 * Format file size for display
 * @param {Number} bytes - File size in bytes
 * @returns {String} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Delete file from disk
 * @param {String} filePath - Path to file
 * @returns {Promise<void>}
 */
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await unlinkAsync(filePath);
      console.log(`File deleted: ${filePath}`.green);
    }
  } catch (error) {
    console.error(`Error deleting file: ${error.message}`.red);
    throw error;
  }
};

/**
 * Ensure directory exists
 * @param {String} dirPath - Directory path
 */
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Get file metadata
 * @param {String} filePath - Path to file
 * @returns {Object} File metadata
 */
const getFileMetadata = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      extension: path.extname(filePath),
      filename: path.basename(filePath),
    };
  } catch (error) {
    console.error(`Error getting file metadata: ${error.message}`.red);
    return null;
  }
};

/**
 * Check if file exists
 * @param {String} filePath - Path to file
 * @returns {Boolean} File exists
 */
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

/**
 * Get allowed file extensions based on type
 * @param {String} type - File type category
 * @returns {Array} Allowed extensions
 */
const getAllowedExtensions = (type) => {
  const extensionMap = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    document: ['.pdf', '.doc', '.docx', '.txt'],
    video: ['.mp4', '.avi', '.mov', '.wmv'],
  };
  
  return extensionMap[type] || [];
};

module.exports = {
  validateFileType,
  validateFileSize,
  generateUniqueFilename,
  getFileCategory,
  formatFileSize,
  deleteFile,
  ensureDirectoryExists,
  getFileMetadata,
  fileExists,
  getAllowedExtensions,
};