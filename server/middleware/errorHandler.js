const { errorResponse } = require('../../shared/types');

/**
 * Global Express error handler
 * Catches all errors thrown in route handlers
 */
function errorHandler(err, req, res, next) {
  console.error('❌ [ERROR]', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const status  = err.status || err.statusCode || 500;
  const message = err.isUserFacing
    ? err.message
    : 'אירעה שגיאה בשרת. אנא נסה שוב מאוחר יותר.';

  return res.status(status).json(errorResponse(message));
}

/**
 * Wrap async route handlers to forward errors to errorHandler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a user-facing error
 */
function userError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.isUserFacing = true;
  return err;
}

module.exports = { errorHandler, asyncHandler, userError };
