const logger = require("../utils/logger");

// Very simple in-memory IP-based rate limiter for demo purposes
function createRateLimiter({ windowMs = 60_000, max = 100 } = {}) {
  const hits = new Map();

  function cleanup() {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (now - data.start >= windowMs) {
        hits.delete(ip);
      }
    }
  }

  setInterval(cleanup, windowMs).unref();

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const record = hits.get(ip) || { count: 0, start: now };

    if (now - record.start >= windowMs) {
      record.count = 0;
      record.start = now;
    }

    record.count += 1;
    hits.set(ip, record);

    if (record.count > max) {
      logger.warn("Rate limit exceeded", { ip, count: record.count });
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    next();
  };
}

module.exports = createRateLimiter;

