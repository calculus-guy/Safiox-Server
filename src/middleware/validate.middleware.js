const ApiError = require('../utils/ApiError');

/**
 * Express middleware factory that validates req.body against a Joi schema.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), controller.register);
 *
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - 'body' | 'query' | 'params' (default: 'body')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,   // collect all errors
      stripUnknown: true,  // remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }

    // Replace source data with validated + sanitized value
    req[source] = value;
    next();
  };
};

module.exports = validate;
