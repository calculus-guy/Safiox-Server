const Joi = require('joi');

const createDeviceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  type: Joi.string().valid('cctv', 'iot').required(),
  streamUrl: Joi.string().trim().allow(''),
  connectionType: Joi.string().valid('qr', 'bluetooth', 'wifi', 'manual').default('manual'),
  metadata: Joi.object().default({}),
});

const updateDeviceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  status: Joi.string().valid('online', 'offline'),
  streamUrl: Joi.string().trim().allow(''),
  metadata: Joi.object(),
});

module.exports = { createDeviceSchema, updateDeviceSchema };
