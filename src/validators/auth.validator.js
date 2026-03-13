const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Name is required' }),
  email: Joi.string().trim().lowercase().email().required()
    .messages({ 'any.required': 'Email is required' }),
  phone: Joi.string().trim().required()
    .messages({ 'any.required': 'Phone number is required' }),
  password: Joi.string().min(8).max(128).required()
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .messages({
      'any.required': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.name': 'Password must contain at least one {#name}',
    }),
  role: Joi.string().valid('individual').default('individual'),
});

const registerOrgSchema = Joi.object({
  // Step 1: Org type
  orgType: Joi.string().valid('hospital', 'police', 'fire', 'ambulance', 'other').required(),

  // Step 2: Org info
  name: Joi.string().trim().min(2).max(200).required(),
  email: Joi.string().trim().lowercase().email().required(),
  phone: Joi.string().trim().required(),
  address: Joi.string().trim().required(),

  // Step 3: Branch setup
  branch: Joi.object({
    name: Joi.string().trim().required(),
    address: Joi.string().trim().required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    operatingHours: Joi.object({
      open: Joi.string().default('08:00'),
      close: Joi.string().default('22:00'),
      is24Hours: Joi.boolean().default(false),
    }).default(),
    hotlineNumbers: Joi.array().items(Joi.string().trim()).default([]),
  }).required(),

  // Step 4: Fleet & staff
  fleet: Joi.object({
    vehicleCount: Joi.number().integer().min(0).default(0),
    vehicleTypes: Joi.array().items(Joi.string().trim()).default([]),
  }).default(),
  staffCount: Joi.number().integer().min(0).default(0),

  // Step 5: Compliance
  verificationCode: Joi.string().trim().allow(''),
  // verificationDocuments handled by multer (file upload)

  // Account password
  password: Joi.string().min(8).max(128).required()
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number'),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required()
    .messages({ 'any.required': 'Email is required' }),
  password: Joi.string().required()
    .messages({ 'any.required': 'Password is required' }),
  role: Joi.string().valid('individual', 'organization').default('individual'),
});

const googleAuthSchema = Joi.object({
  idToken: Joi.string().required()
    .messages({ 'any.required': 'Google ID token is required' }),
  role: Joi.string().valid('individual').default('individual'),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(8).max(128).required()
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number'),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = {
  registerSchema,
  registerOrgSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
};
