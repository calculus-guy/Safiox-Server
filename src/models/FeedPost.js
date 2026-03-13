const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [2000, 'Post cannot exceed 2000 characters'],
    },
    media: [
      {
        url: { type: String, required: true }, // Cloudinary URL
        type: { type: String, enum: ['image', 'video'], required: true },
      },
    ],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    isLive: {
      type: Boolean,
      default: false,
    },

    // ── Engagement ──
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },

    // ── Forward to authority ──
    forwardedToAuthority: {
      organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
      forwardedAt: Date,
      incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    },

    // ── Moderation (admin takedown) ──
    isRemoved: { type: Boolean, default: false },
    removedAt: Date,
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin user
    removalReason: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
feedPostSchema.index({ authorId: 1 });
feedPostSchema.index({ createdAt: -1 });
feedPostSchema.index({ location: '2dsphere' });
feedPostSchema.index({ isLive: 1, createdAt: -1 });

module.exports = mongoose.model('FeedPost', feedPostSchema);
