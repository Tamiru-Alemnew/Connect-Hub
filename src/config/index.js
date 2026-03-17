const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const parseStunUrls = (value) => {
  if (!value) {
    return [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
    ];
  }
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const config = Object.freeze({
  PORT: process.env.PORT || 3030,
  NODE_ENV: process.env.NODE_ENV || "development",
  STUN_URLS: parseStunUrls(process.env.STUN_URLS),
  TURN_URL: process.env.TURN_URL || "",
  TURN_USERNAME: process.env.TURN_USERNAME || "",
  TURN_CREDENTIAL: process.env.TURN_CREDENTIAL || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "debug",
});

module.exports = config;

