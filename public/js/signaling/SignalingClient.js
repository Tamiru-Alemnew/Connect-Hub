import { MessageTypes } from "./messageTypes.js";

export class SignalingClient {
  constructor() {
    this.socket = io("/");
    this.handlers = new Map();

    this.socket.on("signal", (msg) => this.handleIncoming(msg));

    this.roomJoinResolver = null;
    this.socket.on("room-peers", (peers) => {
      if (this.roomJoinResolver) {
        this.roomJoinResolver(peers);
        this.roomJoinResolver = null;
      }
    });
  }

  send(message) {
    const msg = {
      ...message,
      timestamp: message.timestamp || Date.now(),
    };
    // eslint-disable-next-line no-console
    console.log("[SignalingClient] send", msg);
    this.socket.emit("signal", msg);
  }

  joinRoom(roomId, peerId) {
    return new Promise((resolve) => {
      this.roomJoinResolver = resolve;
      this.socket.emit("join-room", roomId, peerId);
    });
  }

  onSignal(type, callback) {
    this.handlers.set(type, callback);
  }

  handleIncoming(message) {
    // eslint-disable-next-line no-console
    console.log("[SignalingClient] received", message);
    const handler = this.handlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  onPeerJoined(callback) {
    this.onSignal(MessageTypes.PEER_JOINED, callback);
  }

  onPeerLeft(callback) {
    this.onSignal(MessageTypes.PEER_LEFT, callback);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

