const { upload } = require('../middleware/upload');

// Test that upload is a valid multer instance
console.log('Upload type:', typeof upload);
console.log('Has array method:', typeof upload.array === 'function');
console.log('Has single method:', typeof upload.single === 'function');
console.log('Has fields method:', typeof upload.fields === 'function');

// Test the upload middleware
const testMiddleware = upload.array('files', 10);
console.log('Array middleware created:', typeof testMiddleware === 'function');