const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    headline: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 120,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      minlength: 30,
    },
    summary: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    author: {
      type: String,
      default: 'Anonymous',
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['tech', 'lifestyle', 'business', 'tutorial', 'opinion', 'news'],
      default: 'tech',
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    coverImageUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Auto-generate a summary from the body if the client didn't supply one.
articleSchema.pre('save', function (next) {
  if (!this.summary && this.body) {
    this.summary = this.body.length > 150 ? `${this.body.slice(0, 147)}...` : this.body;
  }
  next();
});

// readTimeMinutes is derived, not stored — average adult reading speed ~200 wpm.
articleSchema.virtual('readTimeMinutes').get(function () {
  const words = this.body ? this.body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
});

articleSchema.set('toJSON', { virtuals: true });
articleSchema.set('toObject', { virtuals: true });

// Text index across headline, body, and tags — powers GET /api/articles/search
articleSchema.index({ headline: 'text', body: 'text', tags: 'text' });

module.exports = mongoose.model('Article', articleSchema);
