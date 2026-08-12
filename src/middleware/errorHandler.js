const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  console.error(err.message);
  console.error(err.stack || '');

  // Malformed MongoDB ObjectId (e.g. /api/articles/not-a-real-id) → 400, not 500
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid id: ${err.value}` });
  }

  // File too large, wrong field name, etc. — thrown by Multer itself
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Thrown by our own fileFilter in middleware/upload.js
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;

  res.status(status).json({
    error: err.message,
  });
};

module.exports = errorHandler;
