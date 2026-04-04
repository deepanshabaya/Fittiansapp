/**
 * Multer configuration for file uploads.
 *
 * Stores files under backend/uploads/<subfolder>/
 * Generates unique filenames using timestamp + random suffix.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads root directory exists
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

/**
 * Creates a multer storage engine that saves files to uploads/<subfolder>/
 * @param {string} subfolder - e.g. 'customers', 'trainers'
 */
const createStorage = (subfolder) => {
  const dir = path.join(UPLOADS_ROOT, subfolder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
};

// File filter: only allow images
const imageFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
  }
};

/**
 * Upload middleware for admin user creation.
 * Accepts up to 2 image fields: upload_photo (customer) and profile (trainer).
 */
const adminUpload = multer({
  storage: createStorage('profiles'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
}).fields([
  { name: 'upload_photo', maxCount: 1 },
  { name: 'profile', maxCount: 1 },
]);

module.exports = {
  adminUpload,
  UPLOADS_ROOT,
};
