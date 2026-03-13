const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['cctv', 'iot'],
      required: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    streamUrl: {
      type: String, // RTSP URL for CCTV cameras (most common protocol)
      trim: true,
    },
    connectionType: {
      type: String,
      enum: ['qr', 'bluetooth', 'wifi', 'manual'],
      default: 'manual',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // flexible for IoT sensor data
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
deviceSchema.index({ userId: 1 });
deviceSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Device', deviceSchema);
