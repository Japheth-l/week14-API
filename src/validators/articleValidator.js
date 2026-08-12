const Joi = require('joi');

const CATEGORIES = ['tech', 'lifestyle', 'business', 'tutorial', 'opinion', 'news'];
const STATUSES = ['draft', 'published'];

// Full validation — used on POST (create)
const articleSchema = Joi.object({
  headline: Joi.string().min(5).max(120).required().messages({
    'string.min': 'Headline must be at least 5 characters',
    'string.max': 'Headline cannot exceed 120 characters',
    'string.empty': 'Headline is required',
    'any.required': 'Headline is required',
  }),
  body: Joi.string().min(30).required().messages({
    'string.min': 'Body must be at least 30 characters',
    'string.empty': 'Body is required',
    'any.required': 'Body is required',
  }),
  summary: Joi.string().max(200).allow('').messages({
    'string.max': 'Summary cannot exceed 200 characters',
  }),
  author: Joi.string().trim(),
  category: Joi.string().valid(...CATEGORIES).messages({
    'any.only': `Category must be one of: ${CATEGORIES.join(', ')}`,
  }),
  tags: Joi.array().items(Joi.string().trim()),
  status: Joi.string().valid(...STATUSES).messages({
    'any.only': `Status must be one of: ${STATUSES.join(', ')}`,
  }),
  coverImageUrl: Joi.string().uri().messages({
    'string.uri': 'coverImageUrl must be a valid URL',
  }),
});

// Partial validation — used on PUT (update); at least one field required
const articleUpdateSchema = Joi.object({
  headline: Joi.string().min(5).max(120).messages({
    'string.min': 'Headline must be at least 5 characters',
    'string.max': 'Headline cannot exceed 120 characters',
  }),
  body: Joi.string().min(30).messages({
    'string.min': 'Body must be at least 30 characters',
  }),
  summary: Joi.string().max(200).allow(''),
  author: Joi.string().trim(),
  category: Joi.string().valid(...CATEGORIES).messages({
    'any.only': `Category must be one of: ${CATEGORIES.join(', ')}`,
  }),
  tags: Joi.array().items(Joi.string().trim()),
  status: Joi.string().valid(...STATUSES).messages({
    'any.only': `Status must be one of: ${STATUSES.join(', ')}`,
  }),
  coverImageUrl: Joi.string().uri().messages({
    'string.uri': 'coverImageUrl must be a valid URL',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided to update',
});

const validateArticle = (req, res, next) => {
  const { error, value } = articleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: error.details.map((d) => d.message).join(', '),
    });
  }
  req.body = value;
  next();
};

const validateArticleUpdate = (req, res, next) => {
  const { error, value } = articleUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: error.details.map((d) => d.message).join(', '),
    });
  }
  req.body = value;
  next();
};

module.exports = { validateArticle, validateArticleUpdate };
