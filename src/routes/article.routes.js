const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const requireOwnership = require('../middleware/requireOwnership');
const Article = require('../models/article.model');
const upload = require('../middleware/upload');
const { validateArticle, validateArticleUpdate } = require('../validators/articleValidator');
const {
  createArticle,
  getAllArticles,
  searchArticles,
  getArticleById,
  updateArticleById,
  deleteArticleById,
  uploadCoverImage,
} = require('../controllers/article.controller');

// Every route below requires a valid Bearer token.
router.use(requireAuth);

// IMPORTANT: /search must come before /:id so Express doesn't treat
// "search" as an :id parameter.
router.get('/search', searchArticles);

router.post('/', validateArticle, createArticle);
router.get('/', getAllArticles);
router.get('/:id', getArticleById);

// requireOwnership runs after requireAuth and before the controller —
// only the article's original creator can update or delete it.
router.put('/:id', requireOwnership(Article), validateArticleUpdate, updateArticleById);
router.delete('/:id', requireOwnership(Article), deleteArticleById);

// Ownership check runs BEFORE upload.single — an unauthorized user's file
// never gets streamed to Cloudinary in the first place.
router.put(
  '/:id/cover-image',
  requireOwnership(Article),
  upload.single('image'),
  uploadCoverImage
);

module.exports = router;
