const messageTypes = require("./messageTypes");

function invalid(error) {
  return { valid: false, error };
}

function validateSignalingMessage(message) {
  if (!message || typeof message !== "object") {
    return invalid("Message must be an object");
  }

  const { type, from, to, timestamp, payload } = message;

  const validTypes = Object.values(messageTypes);
  if (!validTypes.includes(type)) {
    return invalid("Invalid message type");
  }

  if (!from || typeof from !== "string") {
    return invalid("Field 'from' must be a non-empty string");
  }

  // For broadcast-style events like PEER_JOINED / PEER_LEFT / ROOM_FULL / HEARTBEAT / HEARTBEAT_ACK
  const broadcastTypes = new Set([
    messageTypes.PEER_JOINED,
    messageTypes.PEER_LEFT,
    messageTypes.ROOM_FULL,
    messageTypes.HEARTBEAT,
    messageTypes.HEARTBEAT_ACK,
  ]);

  if (!broadcastTypes.has(type)) {
    if (!to || typeof to !== "string") {
      return invalid("Field 'to' must be a non-empty string");
    }
  }

  if (typeof timestamp !== "number") {
    return invalid("Field 'timestamp' must be a number");
  }

  const needsPayload = new Set([
    messageTypes.SDP_OFFER,
    messageTypes.SDP_ANSWER,
    messageTypes.ICE_CANDIDATE,
  ]);

  if (needsPayload.has(type)) {
    if (!payload || typeof payload !== "object") {
      return invalid("Payload is required for this message type");
    }
  }

  if (type === messageTypes.SDP_OFFER || type === messageTypes.SDP_ANSWER) {
    if (!payload || typeof payload.sdp !== "string") {
      return invalid("SDP payload must include string 'sdp'");
    }
  }

  if (type === messageTypes.ICE_CANDIDATE) {
    if (
      !payload ||
      typeof payload.candidate !== "string" ||
      (payload.sdpMid !== null && typeof payload.sdpMid !== "string") ||
      (payload.sdpMLineIndex !== null &&
        typeof payload.sdpMLineIndex !== "number")
    ) {
      return invalid(
        "ICE payload must include 'candidate' (string), 'sdpMid' (string|null), and 'sdpMLineIndex' (number|null)"
      );
    }
  }

  return { valid: true };
}

module.exports = {
  validateSignalingMessage,
};

