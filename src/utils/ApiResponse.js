/**
 * Standard API success response wrapper.
 * Ensures consistent response format across all endpoints.
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {*} data - Response payload
   * @param {string} message - Optional success message
   */
  constructor(statusCode, data, message = 'Success') {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  /**
   * Send the response through Express res object
   * @param {Object} res - Express response object
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }

  // ── Factory methods ──

  static ok(res, data, message = 'Success') {
    return new ApiResponse(200, data, message).send(res);
  }

  static created(res, data, message = 'Created successfully') {
    return new ApiResponse(201, data, message).send(res);
  }

  static noContent(res) {
    return res.status(204).end();
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
    });
  }
}

module.exports = ApiResponse;
