const mongoose = require('mongoose');

const fleetUnitSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    unitName: {
      type: String,
      required: [true, 'Unit name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Ambulance', 'Patrol', 'Fire Truck', 'Other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Available', 'Responding', 'On-Scene', 'Offline'],
      default: 'Available',
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    assignedIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
fleetUnitSchema.index({ organizationId: 1 });
fleetUnitSchema.index({ organizationId: 1, status: 1 });
fleetUnitSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('FleetUnit', fleetUnitSchema);
