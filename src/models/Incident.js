const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sosAlertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SOSAlert',
    },

    // ── Requester info (snapshot — in case user is anonymous or non-registered) ──
    userName: { type: String, trim: true },
    userPhone: { type: String, trim: true },
    userRole: { type: String, trim: true },

    // ── Incident details ──
    type: {
      type: String,
      enum: ['SOS', 'Medical', 'Fire', 'Security', 'Report'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'Responding', 'On-Scene', 'Resolved'],
      default: 'Pending',
    },
    outcome: {
      type: String,
      enum: ['Resolved', 'Hospitalized', 'Arrest Made', 'No Action', ''],
      default: '',
    },
    description: {
      type: String,
      trim: true,
    },

    // ── Location ──
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: { type: String, trim: true },
    },

    // ── Assignment ──
    assignedUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FleetUnit',
    },
    assignedStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },

    // ── Response timeline ──
    timeline: [
      {
        action: {
          type: String,
          enum: ['received', 'dispatched', 'on_scene', 'resolved', 'aborted'],
        },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, trim: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ── Media evidence ──
    media: [{ type: String }], // Cloudinary URLs
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
incidentSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
incidentSchema.index({ userId: 1 });
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
