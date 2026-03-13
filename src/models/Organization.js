const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    operatingHours: {
      open: { type: String, default: '08:00' },
      close: { type: String, default: '22:00' },
      is24Hours: { type: Boolean, default: false },
    },
    hotlineNumbers: [{ type: String }],
  },
  { _id: true }
);

const organizationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Organization email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['hospital', 'police', 'fire', 'ambulance', 'other'],
    },

    // ── Verification ──
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationDocuments: [{ type: String }], // Cloudinary URLs
    verificationCode: { type: String },
    verificationRejectionReason: { type: String },

    // ── Location ──
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    coverageArea: {
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: { type: [[[Number]]], default: undefined },
    },

    // ── Operations ──
    operatingHours: {
      open: { type: String, default: '08:00' },
      close: { type: String, default: '22:00' },
      is24Hours: { type: Boolean, default: false },
    },
    hotlineNumbers: [{ type: String }],

    // ── Branches ──
    branches: [branchSchema],

    // ── Fleet & staff (from signup wizard) ──
    fleetInfo: {
      vehicleCount: { type: Number, default: 0 },
      vehicleTypes: [{ type: String }],
    },
    staffCount: { type: Number, default: 0 },

    // ── Stats (computed / updated periodically) ──
    stats: {
      totalIncidents: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 }, // percentage
      activeUnits: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
organizationSchema.index({ location: '2dsphere' });
organizationSchema.index({ type: 1, verificationStatus: 1 });
organizationSchema.index({ userId: 1 });
organizationSchema.index({ email: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
