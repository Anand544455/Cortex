const multer = require('multer');

/**
 * Memory storage (not disk) - CSV files are parsed immediately and
 * never need to persist on the server's filesystem. Capped at 10MB,
 * comfortably larger than any realistic backlink export.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.csv$/i;
    if (!allowedExtensions.test(file.originalname)) {
      return cb(new Error('Only .csv files are accepted.'));
    }
    cb(null, true);
  },
});

module.exports = upload;
