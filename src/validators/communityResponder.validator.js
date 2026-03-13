const Joi = require('joi');

const registerResponderSchema = Joi.object({
  specialty: Joi.string().trim().max(100).default('General'),
});

const createAlertSchema = Joi.object({
  description: Joi.string().trim().min(5).max(500).required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  radius: Joi.number().valid(1000, 3000, 10000).default(3000),
  visibility: Joi.string().valid('anonymous', 'show_id').default('show_id'),
  alertOfficialServices: Joi.boolean().default(false),
  notifyEmergencyContacts: Joi.boolean().default(false),
  shareLocation: Joi.boolean().default(true),
});

const updateResponderStatusSchema = Joi.object({
  status: Joi.string().valid('accepted', 'declined', 'arrived').required(),
  eta: Joi.string().trim().allow(''),
  distance: Joi.string().trim().allow(''),
});

const sendMessageSchema = Joi.object({
  text: Joi.string().trim().max(500).allow(''),
  mediaUrl: Joi.string().uri().allow(''),
  type: Joi.string().valid('text', 'voice').default('text'),
}).or('text', 'mediaUrl'); // at least one of text or media

module.exports = {
  registerResponderSchema,
  createAlertSchema,
  updateResponderStatusSchema,
  sendMessageSchema,
};
