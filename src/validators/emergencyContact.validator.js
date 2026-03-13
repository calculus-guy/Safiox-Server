const Joi = require('joi');

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

const createContactSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  phone: Joi.string().trim().required(),
  relation: Joi.string().trim().max(50).default('other'),
  isPrimary: Joi.boolean().default(false),
});

const updateContactSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  phone: Joi.string().trim(),
  relation: Joi.string().trim().max(50),
  isPrimary: Joi.boolean(),
});

const contactIdParam = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid contact ID',
  }),
});

module.exports = {
  createContactSchema,
  updateContactSchema,
  contactIdParam,
};
