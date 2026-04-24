const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Organization = require("../models/Organization");
const ApiError = require("../utils/ApiError");
const { generateTokenPair } = require("../utils/generateToken");
const EmailService = require("./email.service");
const generateUsername = require("../utils/generateUsername");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  /**
   * Register an individual user.
   */
  static async register({ name, email, phone, password }) {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict("An account with this email already exists");
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: "personal",
      username: await generateUsername(name),
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email (don't block on failure)
    try {
      await EmailService.sendVerificationEmail(user, verificationToken);
    } catch (err) {
      console.error("Failed to send verification email:", err.message);
    }

    // Generate tokens
    const tokens = generateTokenPair(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: user.toSafeObject(),
      ...tokens,
    };
  }

  /**
   * Register an organization (multi-step wizard).
   */
  static async registerOrganization(data, files) {
    const {
      name,
      email,
      phone,
      address,
      orgType,
      password,
      branch,
      fleet,
      staffCount,
      verificationCode,
    } = data;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict("An account with this email already exists");
    }

    // Create the user account for the org admin
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: "organization",
    });

    // Upload verification documents to Cloudinary from multer memory buffers
    const cloudinary = require("../config/cloudinary");
    const { Readable } = require("stream");
    const verificationDocuments = [];

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "safiox/org-documents", resource_type: "auto" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              },
            );
            const readable = new Readable();
            readable.push(file.buffer);
            readable.push(null);
            readable.pipe(stream);
          });
          verificationDocuments.push(uploadResult.secure_url);
        } catch (uploadErr) {
          console.error("Failed to upload org document:", uploadErr.message);
        }
      }
    }

    // Generate verification code if not provided
    const generatedCode =
      verificationCode ||
      `VER-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Create organization document
    const org = await Organization.create({
      userId: user._id,
      name,
      email,
      phone,
      address,
      type: orgType,
      verificationStatus: "pending",
      verificationDocuments,
      verificationCode: generatedCode,
      location: {
        type: "Point",
        coordinates: [
          parseFloat(branch.longitude) || 0,
          parseFloat(branch.latitude) || 0,
        ],
      },
      operatingHours: branch.operatingHours || {},
      hotlineNumbers: branch.hotlineNumbers || [],
      branches: [
        {
          name: branch.name,
          address: branch.address,
          location: {
            type: "Point",
            coordinates: [
              parseFloat(branch.longitude) || 0,
              parseFloat(branch.latitude) || 0,
            ],
          },
          operatingHours: branch.operatingHours || {},
          hotlineNumbers: branch.hotlineNumbers || [],
        },
      ],
      fleetInfo: fleet || { vehicleCount: 0, vehicleTypes: [] },
      staffCount: parseInt(staffCount, 10) || 0,
    });

    // Generate tokens
    const tokens = generateTokenPair(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Send registration confirmation email
    try {
      await EmailService.sendOrgRegistrationEmail(org);
    } catch (err) {
      console.error("Failed to send org registration email:", err.message);
    }

    return {
      user: user.toSafeObject(),
      organization: org,
      ...tokens,
    };
  }

  /**
   * Login with email + password.
   */
  static async login({ email, password, role }) {
    // Find user with password field
    const user = await User.findOne({ email }).select(
      "+password +refreshToken",
    );
    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Check if account is deactivated
    if (user.isDeactivated) {
      throw ApiError.unauthorized(
        "Account has been deactivated. Please contact support.",
      );
    }

    // Check login lockout
    if (user.isLocked()) {
      throw ApiError.tooMany(
        "Account temporarily locked due to too many failed attempts. Try again in 30 minutes.",
      );
    }

    // Verify role matches
    if (role && user.role !== role && user.role !== "admin") {
      throw ApiError.unauthorized("Invalid credentials for this account type");
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = Date.now() + 5 * 60 * 1000; // 5 min
      }
      await user.save();
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;

    // Generate tokens
    const tokens = generateTokenPair(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // For organization users, also fetch org data
    let organization = null;
    if (user.role === "organization") {
      organization = await Organization.findOne({ userId: user._id });
    }

    return {
      user: user.toSafeObject(),
      organization,
      ...tokens,
    };
  }

  /**
   * Google SSO authentication.
   */
  static async googleAuth({ idToken }) {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      // Link Google account if logging in with existing email
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true;
      }
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
    } else {
      // Create new user
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        phone: "",
        googleId,
        avatar: picture || "",
        role: "personal",
        isEmailVerified: true,
        username: await generateUsername(name || email.split("@")[0]),
      });
    }

    // Check deactivation
    if (user.isDeactivated) {
      throw ApiError.unauthorized("Account has been deactivated");
    }

    // Generate tokens
    const tokens = generateTokenPair(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
      user: user.toSafeObject(),
      ...tokens,
      isNewUser: !user.phone, // new Google users won't have phone yet
    };
  }

  /**
   * Refresh access token.
   */
  static async refreshToken(refreshToken) {
    const jwt = require("jsonwebtoken");

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    // Find user and verify stored refresh token matches
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    if (user.isDeactivated) {
      throw ApiError.unauthorized("Account has been deactivated");
    }

    // Rotate tokens
    const tokens = generateTokenPair(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  }

  /**
   * Request password reset.
   */
  static async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that the user doesn't exist
      return {
        message:
          "If an account with that email exists, a reset link has been sent.",
      };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    try {
      await EmailService.sendPasswordResetEmail(user, resetToken);
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw ApiError.internal("Failed to send reset email. Please try again.");
    }

    return {
      message:
        "If an account with that email exists, a reset link has been sent.",
    };
  }

  /**
   * Reset password with token.
   */
  static async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      throw ApiError.badRequest("Invalid or expired reset token");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    return { message: "Password reset successfully" };
  }

  /**
   * Verify email with token.
   */
  static async verifyEmail(token) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw ApiError.badRequest("Invalid or expired verification token");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return { message: "Email verified successfully" };
  }

  /**
   * Logout — invalidate refresh token.
   */
  static async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return { message: "Logged out successfully" };
  }
}

module.exports = AuthService;
