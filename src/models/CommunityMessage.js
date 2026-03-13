const mongoose = require('mongoose');

const communityMessageSchema = new mongoose.Schema(
  {
    communityAlertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityAlert',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      trim: true,
    },
    mediaUrl: {
      type: String, // Cloudinary URL for voice messages
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'voice', 'system'],
      default: 'text',
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
communityMessageSchema.index({ communityAlertId: 1, createdAt: 1 });

module.exports = mongoose.model('CommunityMessage', communityMessageSchema);
