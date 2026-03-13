const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: true,
      // Deterministic key: sorted pair of user IDs, e.g. "userId1_userId2"
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    mediaUrl: {
      type: String, // Cloudinary URL (for voice messages, images)
      trim: true,
    },
    mediaType: {
      type: String,
      enum: ['text', 'image', 'voice'],
      default: 'text',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
messageSchema.index({ conversationKey: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);
