const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // links to an actual user account if the staff has one
    },
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['Responder', 'Dispatcher', 'Admin'],
      default: 'Responder',
    },
    status: {
      type: String,
      enum: ['On Duty', 'Off Duty'],
      default: 'Off Duty',
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String, // Cloudinary URL
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
staffSchema.index({ organizationId: 1 });
staffSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model('Staff', staffSchema);
