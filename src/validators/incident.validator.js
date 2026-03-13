const Joi = require('joi');

const reportIncidentSchema = Joi.object({
  organizationId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required(),
  type: Joi.string().valid('SOS', 'Medical', 'Fire', 'Security', 'Report').required(),
  severity: Joi.string().valid('High', 'Medium', 'Low').default('Medium'),
  description: Joi.string().trim().max(1000),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().trim().allow(''),
  }).required(),
});

module.exports = { reportIncidentSchema };
