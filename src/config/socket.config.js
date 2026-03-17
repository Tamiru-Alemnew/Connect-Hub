const config = require("./index");

function getSocketIOOptions() {
  const isProd = config.NODE_ENV === "production";

  return {
    cors: {
      origin: isProd ? false : "*",
      methods: ["GET", "POST"],
    },
  };
}

module.exports = {
  getSocketIOOptions,
};

