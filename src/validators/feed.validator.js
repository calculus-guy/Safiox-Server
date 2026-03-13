const Joi = require('joi');

const createPostSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
  media: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      type: Joi.string().valid('image', 'video').required(),
    })
  ).max(5).default([]),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
  }),
  isLive: Joi.boolean().default(false),
});

const updatePostSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000),
});

const feedQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  filter: Joi.string().valid('all', 'live', 'following').default('all'),
});

const createCommentSchema = Joi.object({
  content: Joi.string().trim().min(1).max(500).required(),
});

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const forwardToAuthoritySchema = Joi.object({
  organizationId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required(),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  feedQuerySchema,
  createCommentSchema,
  searchQuerySchema,
  forwardToAuthoritySchema,
};
