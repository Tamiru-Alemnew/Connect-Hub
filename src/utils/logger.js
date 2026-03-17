const config = require("../config");

const levels = ["debug", "info", "warn", "error"];

function shouldLog(level) {
  const currentIndex = levels.indexOf(config.LOG_LEVEL) ?? 0;
  const targetIndex = levels.indexOf(level);
  if (targetIndex === -1) return false;
  return targetIndex >= currentIndex;
}

function format(level, message, meta) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    return `${base} ${typeof meta === "string" ? meta : JSON.stringify(meta)}`;
  }
  return base;
}

function log(level, message, meta) {
  if (!shouldLog(level)) return;
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](format(level, message, meta));
}

module.exports = {
  debug: (msg, meta) => log("debug", msg, meta),
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
};

