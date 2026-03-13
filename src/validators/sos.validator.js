const Joi = require('joi');

const triggerSOSSchema = Joi.object({
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
  silentMode: Joi.boolean().default(false),
  voiceTrigger: Joi.boolean().default(false),
  communityRespondersEnabled: Joi.boolean().default(false),
  notifyOrganizations: Joi.boolean().default(false),
});

const updateLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
});

module.exports = {
  triggerSOSSchema,
  updateLocationSchema,
};
