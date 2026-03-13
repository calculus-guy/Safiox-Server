const mongoose = require('mongoose');

const communityAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sosAlertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SOSAlert',
    },
    description: {
      type: String,
      required: [true, 'Please describe the situation'],
      trim: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    radius: {
      type: Number,
      required: true,
      enum: [1000, 3000, 10000], // meters (1km, 3km, 10km)
      default: 3000,
    },
    visibility: {
      type: String,
      enum: ['anonymous', 'show_id'],
      default: 'show_id',
    },
    alertOfficialServices: { type: Boolean, default: false },
    notifyEmergencyContacts: { type: Boolean, default: false },
    shareLocation: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },

    // ── Responder tracking ──
    responders: [
      {
        responderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityResponder' },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        status: {
          type: String,
          enum: ['notified', 'viewed', 'accepted', 'declined', 'arrived'],
          default: 'notified',
        },
        acceptedAt: Date,
        arrivedAt: Date,
        eta: String,
        distance: String,
      },
    ],

    // ── Session ──
    duration: { type: Number, default: 0 }, // seconds
    completedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
communityAlertSchema.index({ userId: 1 });
communityAlertSchema.index({ location: '2dsphere' });
communityAlertSchema.index({ status: 1 });
communityAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CommunityAlert', communityAlertSchema);
