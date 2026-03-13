const mongoose = require('mongoose');

const communityResponderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Responder name is required'],
      trim: true,
    },
    specialty: {
      type: String,
      trim: true,
      default: 'General', // e.g. 'First Aid / CPR', 'Crowd Control', 'Trauma Response'
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    totalResponses: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    available: {
      type: Boolean,
      default: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes (userId already has unique: true on the field) ──
communityResponderSchema.index({ location: '2dsphere' });
communityResponderSchema.index({ available: 1 });

module.exports = mongoose.model('CommunityResponder', communityResponderSchema);
