const multer = require('multer');
const ApiError = require('../utils/ApiError');

/**
 * Multer memory storage — files are kept in memory as Buffer objects
 * and then uploaded to Cloudinary by the controller/service.
 */
const storage = multer.memoryStorage();

/**
 * File filter — accept images, videos, and PDFs.
 */
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `File type ${file.mimetype} is not allowed`), false);
  }
};

/**
 * Upload middleware for verification documents (max 5 files, 10MB each).
 */
const uploadVerificationDocs = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
}).array('verificationDocuments', 5);

/**
 * Upload middleware for single avatar image (max 5MB).
 */
const uploadAvatar = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed for avatars'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single('avatar');

/**
 * Upload middleware for post media (max 5 files, 50MB each).
 */
const uploadPostMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 5,
  },
}).array('media', 5);

/**
 * Upload middleware for incident report media (max 5 files, 20MB each).
 */
const uploadIncidentMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 5,
  },
}).array('media', 5);

module.exports = {
  uploadVerificationDocs,
  uploadAvatar,
  uploadPostMedia,
  uploadIncidentMedia,
};
