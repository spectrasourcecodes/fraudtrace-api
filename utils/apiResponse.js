/**
 * Standardized API Response Handler
 */

class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {String} [message] - Success message
   * @param {Number} [statusCode] - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created response
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {String} [message] - Success message
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} [statusCode] - HTTP status code
   * @param {*} [errors] - Additional error details
   */
  static error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    if (process.env.NODE_ENV === 'development') {
      response.stack = new Error().stack;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Bad request response
   * @param {Object} res - Express response object
   * @param {String} [message] - Error message
   * @param {*} [errors] - Validation errors
   */
  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {String} [message] - Error message
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {String} [message] - Error message
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {String} [message] - Error message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Conflict response
   * @param {Object} res - Express response object
   * @param {String} [message] - Error message
   */
  static conflict(res, message = 'Resource already exists') {
    return this.error(res, message, 409);
  }

  /**
   * Validation error response
   * @param {Object} res - Express response object
   * @param {Array} errors - Validation errors array
   */
  static validationError(res, errors) {
    return this.badRequest(res, 'Validation Error', errors);
  }

  /**
   * Too many requests response
   * @param {Object} res - Express response object
   * @param {String} [message] - Error message
   */
  static tooManyRequests(res, message = 'Too many requests') {
    return this.error(res, message, 429);
  }

  /**
   * Paginated response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {Object} pagination - Pagination metadata
   * @param {String} [message] - Success message
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;