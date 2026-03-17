const messageTypes = Object.freeze({
  SDP_OFFER: "sdp_offer",
  SDP_ANSWER: "sdp_answer",
  ICE_CANDIDATE: "ice_candidate",
  PEER_JOINED: "peer_joined",
  PEER_LEFT: "peer_left",
  ROOM_FULL: "room_full",
  HEARTBEAT: "heartbeat",
  HEARTBEAT_ACK: "heartbeat_ack",
  RECONNECT_REQUEST: "reconnect_request",
  RECONNECT_ACCEPT: "reconnect_accept",
  ERROR: "signal_error",
});

module.exports = messageTypes;

