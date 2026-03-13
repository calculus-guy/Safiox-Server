const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Location ──
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    locationHistory: [
      {
        coordinates: { type: [Number] },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // ── Status ──
    status: {
      type: String,
      enum: ['active', 'escalated', 'cancelled', 'resolved'],
      default: 'active',
    },

    // ── Settings used when triggered ──
    silentMode: { type: Boolean, default: false },
    voiceTrigger: { type: Boolean, default: false },
    communityRespondersEnabled: { type: Boolean, default: false },

    // ── Escalation ──
    escalatedAt: Date,
    escalatedTo: [
      {
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyContact' },
        contactName: String,
        contactPhone: String,
        method: { type: String, enum: ['sms', 'push', 'email'] },
        sentAt: { type: Date, default: Date.now },
        delivered: { type: Boolean, default: false },
      },
    ],
    notifyOrganizations: { type: Boolean, default: false },

    // ── Resolution / cancellation ──
    cancelledAt: Date,
    resolvedAt: Date,
    resolvedBy: {
      type: String,
      enum: ['user', 'admin', 'organization', 'auto'],
    },

    // ── Community link ──
    communityAlertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunityAlert',
    },

    // ── Public tracking ──
    trackingToken: {
      type: String,
      unique: true,
      required: true,
    },

    // ── Countdown used ──
    countdownDuration: {
      type: Number,
      default: 5,
      enum: [5, 10, 15],
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes (trackingToken already has unique: true on the field) ──
sosAlertSchema.index({ userId: 1, status: 1 });
sosAlertSchema.index({ location: '2dsphere' });
sosAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
