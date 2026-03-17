const logger = require("../utils/logger");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error("[Express] Unhandled error", {
    message: err.message,
    stack: err.stack,
  });

  if (res.headersSent) {
    return;
  }

  res
    .status(err.status || 500)
    .json({ error: "Internal server error" });
}

module.exports = errorHandler;

