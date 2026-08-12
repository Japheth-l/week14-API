const Article = require('../models/article.model');

// CREATE — POST /api/articles
// req.user is set by requireAuth — the article is always attributed to
// whoever is actually logged in, never to a client-supplied id.
const createArticle = async (req, res, next) => {
  try {
    const newArticle = new Article({
      ...req.body,
      userId: req.user._id,
      author: req.body.author || req.user.name,
    });
    const saved = await newArticle.save();
    res.status(201).json({ message: 'Article created', data: saved });
  } catch (err) {
    next(err);
  }
};

// READ ALL (+ pagination) — GET /api/articles?page=&limit=
const getAllArticles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      Article.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      Article.countDocuments(),
    ]);

    res.status(200).json({
      message: 'Articles fetched',
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: articles,
    });
  } catch (err) {
    next(err);
  }
};

// SEARCH — GET /api/articles/search?q=keyword
// NOTE: this route must be registered BEFORE /:id in routes, or "search"
// will be parsed as an :id value.
const searchArticles = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await Article.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .populate('userId', 'name email');

    res.status(200).json({ message: 'Search results', count: results.length, data: results });
  } catch (err) {
    next(err);
  }
};

// READ ONE — GET /api/articles/:id
const getArticleById = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id).populate('userId', 'name email');
    if (!article) {
      return res.status(404).json({ error: `Article with id ${req.params.id} not found` });
    }
    res.status(200).json({ message: 'Article fetched', data: article });
  } catch (err) {
    next(err);
  }
};

// UPDATE — PUT /api/articles/:id
const updateArticleById = async (req, res, next) => {
  try {
    const updated = await Article.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ error: `Article with id ${req.params.id} not found` });
    }
    res.status(200).json({ message: 'Article updated', data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE — DELETE /api/articles/:id
const deleteArticleById = async (req, res, next) => {
  try {
    const deleted = await Article.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: `Article with id ${req.params.id} not found` });
    }
    res.status(200).json({ message: 'Article deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// UPLOAD COVER IMAGE — PUT /api/articles/:id/cover-image
// requireOwnership has already confirmed req.user owns this article, and
// upload.single('image') has already streamed the file to Cloudinary by the
// time this runs — req.file.path is the hosted image URL, not a local path.
const uploadCoverImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided (field name: "image")' });
    }

    const updated = await Article.findByIdAndUpdate(
      req.params.id,
      { coverImageUrl: req.file.path },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: `Article with id ${req.params.id} not found` });
    }

    res.status(200).json({ message: 'Cover image uploaded', data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createArticle,
  getAllArticles,
  searchArticles,
  getArticleById,
  updateArticleById,
  deleteArticleById,
  uploadCoverImage,
};
