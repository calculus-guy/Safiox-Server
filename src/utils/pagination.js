/**
 * Parse pagination params from request query and return Mongoose-ready values.
 *
 * Usage:
 *   const { page, limit, skip } = parsePagination(req.query);
 *   const docs = await Model.find().skip(skip).limit(limit);
 *   const total = await Model.countDocuments();
 *   const meta = paginationMeta(total, page, limit);
 */

/**
 * @param {Object} query - Express req.query
 * @param {Object} defaults - { defaultPage, defaultLimit, maxLimit }
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (query, defaults = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
  } = defaults;

  let page = parseInt(query.page, 10) || defaultPage;
  let limit = parseInt(query.limit, 10) || defaultLimit;

  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination metadata for response.
 * @param {number} total - Total document count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {{ page, limit, total, pages }}
 */
const paginationMeta = (total, page, limit) => {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
};

module.exports = { parsePagination, paginationMeta };
