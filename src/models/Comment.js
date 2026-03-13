const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeedPost',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
    // Admin takedown
    isRemoved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ authorId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
