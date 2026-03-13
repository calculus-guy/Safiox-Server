const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned by default
    },
    role: {
      type: String,
      enum: ['individual', 'organization', 'admin'],
      default: 'individual',
    },
    avatar: {
      type: String, // Cloudinary URL
      default: '',
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    status: {
      type: String,
      enum: ['safe', 'unsafe'],
      default: 'safe',
    },

    // ── Notification preferences ──
    settings: {
      pushNotifications: { type: Boolean, default: true },
      emergencyAlerts: { type: Boolean, default: true },
      nearbyIncidents: { type: Boolean, default: true },
      safeZoneNotifications: { type: Boolean, default: true },
      systemUpdates: { type: Boolean, default: false },
      darkMode: { type: Boolean, default: false },
      language: { type: String, default: 'en' },
      locationPermissions: { type: Boolean, default: true },
      discreetMode: {
        enabled: { type: Boolean, default: false },
        pin: { type: String, default: '' },
      },
    },

    // ── SOS preferences ──
    sosSettings: {
      countdownEnabled: { type: Boolean, default: true },
      countdownDuration: { type: Number, default: 5, enum: [5, 10, 15] },
      silentMode: { type: Boolean, default: false },
      voiceTrigger: { type: Boolean, default: true },
      voiceTriggerPhrase: { type: String, default: 'Hey SafeGuard' },
      flashlight: { type: Boolean, default: true },
      communityRespondersEnabled: { type: Boolean, default: false },
    },

    // ── Fake call config ──
    fakeCallConfig: {
      callerName: { type: String, default: 'Mum' },
      callerNumber: { type: String, default: '' },
      delay: { type: Number, default: 5, enum: [5, 10, 30] },
    },

    // ── Push notification tokens ──
    deviceTokens: [{ type: String }],

    // ── Last known location ──
    lastLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },

    // ── Auth tokens ──
    refreshToken: {
      type: String,
      select: false,
    },

    // ── Account management (soft-delete for App Store compliance) ──
    isDeactivated: {
      type: Boolean,
      default: false,
    },
    deactivatedAt: Date,

    // ── Login security ──
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ lastLocation: '2dsphere' });
userSchema.index({ role: 1 });

// ── Pre-save hook: hash password ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare passwords ──
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: check if account is locked ──
userSchema.methods.isLocked = function () {
  if (this.lockUntil && this.lockUntil > Date.now()) {
    return true;
  }
  return false;
};

// ── Instance method: return safe user object (no sensitive fields) ──
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
