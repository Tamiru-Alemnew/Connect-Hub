export const logger = {
  debug: (...args) => console.debug("[Client][DEBUG]", ...args),
  info: (...args) => console.info("[Client][INFO]", ...args),
  warn: (...args) => console.warn("[Client][WARN]", ...args),
  error: (...args) => console.error("[Client][ERROR]", ...args),
};

