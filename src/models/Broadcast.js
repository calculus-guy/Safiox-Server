const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Broadcast message is required'],
      trim: true,
      maxlength: [500, 'Broadcast message cannot exceed 500 characters'],
    },
    sentToCount: {
      type: Number,
      default: 0,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // org admin/staff who triggered the broadcast
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
broadcastSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('Broadcast', broadcastSchema);
