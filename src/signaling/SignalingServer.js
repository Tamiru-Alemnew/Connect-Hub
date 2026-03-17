const messageTypes = require("./messageTypes");
const { validateSignalingMessage } = require("./messageValidator");
const logger = require("../utils/logger");

class SignalingServer {
  constructor(io, roomManager) {
    this.io = io;
    this.roomManager = roomManager;
  }

  initialize() {
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    logger.info("[Signaling] New connection", { socketId: socket.id });

    socket.on("join-room", (roomId, peerId) => {
      logger.debug("[Signaling] join-room", { roomId, peerId, socketId: socket.id });
      try {
        const existingPeers = this.roomManager.addPeer(roomId, peerId, socket.id);
        socket.join(roomId);

        const joinedMessage = {
          type: messageTypes.PEER_JOINED,
          from: peerId,
          timestamp: Date.now(),
        };
        socket.to(roomId).emit("signal", joinedMessage);

        socket.emit("room-peers", existingPeers);
      } catch (err) {
        if (err && err.message === "Room is full") {
          const fullMsg = {
            type: messageTypes.ROOM_FULL,
            from: "server",
            timestamp: Date.now(),
          };
          socket.emit("signal", fullMsg);
        } else {
          logger.error("[Signaling] Error in join-room", { error: err.message });
        }
      }
    });

    socket.on("signal", (message) => {
      const result = validateSignalingMessage(message);
      if (!result.valid) {
        logger.warn("[Signaling] Invalid message", {
          error: result.error,
          message,
        });
        socket.emit("signal", {
          type: messageTypes.ERROR,
          from: "server",
          to: message.from,
          timestamp: Date.now(),
          payload: { error: result.error },
        });
        return;
      }

      this.routeMessage(socket, message);
    });

    socket.on("disconnect", () => {
      const info = this.roomManager.findRoomBySocketId(socket.id);
      if (!info) {
        logger.debug("[Signaling] Disconnect with no room", { socketId: socket.id });
        return;
      }

      const { roomId, peerId } = info;
      logger.info("[Signaling] Peer disconnected", { roomId, peerId, socketId: socket.id });
      this.roomManager.removePeer(roomId, peerId);

      const leftMessage = {
        type: messageTypes.PEER_LEFT,
        from: peerId,
        timestamp: Date.now(),
      };
      socket.to(roomId).emit("signal", leftMessage);
    });
  }

  routeMessage(socket, message) {
    const { type, from, to } = message;

    switch (type) {
      case messageTypes.SDP_OFFER:
      case messageTypes.SDP_ANSWER:
      case messageTypes.ICE_CANDIDATE:
      case messageTypes.RECONNECT_REQUEST:
      case messageTypes.RECONNECT_ACCEPT:
      case messageTypes.HEARTBEAT:
      case messageTypes.HEARTBEAT_ACK: {
        const roomInfo = this.roomManager.findRoomBySocketId(socket.id);
        if (!roomInfo) {
          logger.warn("[Signaling] Cannot route message, sender not in room", {
            from,
            to,
          });
          return;
        }
        const targetSocketId = this.roomManager.getSocketId(roomInfo.roomId, to);
        if (!targetSocketId) {
          logger.warn("[Signaling] Target peer not found", { to });
          return;
        }
        this.io.to(targetSocketId).emit("signal", message);
        break;
      }
      default: {
        socket.emit("signal", {
          type: messageTypes.ERROR,
          from: "server",
          to: from,
          timestamp: Date.now(),
          payload: { error: "Unknown message type" },
        });
      }
    }
  }
}

module.exports = SignalingServer;

