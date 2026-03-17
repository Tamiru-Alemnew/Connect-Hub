const config = require("./index");

function getICEServers() {
  const iceServers = [];

  if (config.STUN_URLS && Array.isArray(config.STUN_URLS)) {
    iceServers.push({
      urls: config.STUN_URLS,
    });
  }

  if (config.TURN_URL) {
    iceServers.push({
      urls: config.TURN_URL,
      username: config.TURN_USERNAME,
      credential: config.TURN_CREDENTIAL,
    });
  }

  const filtered = iceServers.filter((entry) => !!entry.urls && entry.urls.length);

  return {
    iceServers: filtered,
  };
}

module.exports = {
  getICEServers,
};

