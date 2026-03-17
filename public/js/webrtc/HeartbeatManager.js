import { MessageTypes } from "../signaling/messageTypes.js";

export class HeartbeatManager {
  constructor(meshNetwork, signalingClient, options = {}) {
    this.mesh = meshNetwork;
    this.signaling = signalingClient;
    this.interval = options.interval || 15000;
    this.timeout = options.timeout || 20000;
    this.maxMissed = options.maxMissed || 3;
    this.peerState = new Map(); // peerId -> { lastSeen, missed }
    this.heartbeatTimer = null;
    this.checkTimer = null;
    this.startTime = Date.now();

    this.onPeerUnresponsive = null; // (peerId) => {}
  }

  start() {
    if (this.heartbeatTimer || this.checkTimer) return;
    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeats(),
      this.interval
    );
    this.checkTimer = setInterval(
      () => this.checkPeerHealth(),
      this.interval
    );
    // eslint-disable-next-line no-console
    console.info("[Heartbeat] Monitoring started");
  }

  stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.heartbeatTimer = null;
    this.checkTimer = null;
    // eslint-disable-next-line no-console
    console.info("[Heartbeat] Monitoring stopped");
  }

  sendHeartbeats() {
    const now = Date.now();
    for (const peerId of this.mesh.connections.keys()) {
      this.signaling.send({
        type: MessageTypes.HEARTBEAT,
        from: this.mesh.localPeerId,
        to: peerId,
        timestamp: now,
        payload: {
          connectedPeers: Array.from(this.mesh.connections.keys()),
          uptime: now - this.startTime,
        },
      });
    }
  }

  handleHeartbeatReceived(peerId, message) {
    this.peerLastSeen.set(peerId, Date.now());
    this.signaling.send({
      type: MessageTypes.HEARTBEAT_ACK,
      from: this.mesh.localPeerId,
      to: peerId,
      timestamp: Date.now(),
    });
  }

  handleHeartbeatAck(peerId, message) {
    this.peerLastSeen.set(peerId, Date.now());
    const rtt = Date.now() - message.timestamp;
    // eslint-disable-next-line no-console
    console.info(`[Heartbeat] RTT to ${peerId}: ${rtt}ms`);
  }

  checkPeerHealth() {
    const now = Date.now();
    for (const peerId of this.mesh.connections.keys()) {
      const state = this.peerState.get(peerId) || {
        lastSeen: now,
        missed: 0,
      };
      const timeSinceLastSeen = now - state.lastSeen;

      if (timeSinceLastSeen > this.timeout) {
        state.missed += 1;
        this.peerState.set(peerId, state);

        const pcm = this.mesh.connections.get(peerId);
        if (!pcm) continue;
        const iceState = pcm.pc.iceConnectionState;

        // eslint-disable-next-line no-console
        console.warn(
          `[Heartbeat] Missed heartbeat ${state.missed}/${this.maxMissed} from ${peerId} (${timeSinceLastSeen}ms, ICE=${iceState})`
        );

        if (state.missed >= this.maxMissed) {
          if (iceState === "connected" || iceState === "completed") {
            // eslint-disable-next-line no-console
            console.info(
              `[Heartbeat] WebRTC still connected to ${peerId}, likely signaling-only issue`
            );
          } else {
            // eslint-disable-next-line no-console
            console.warn(
              `[Heartbeat] Both signaling and WebRTC down for ${peerId}, marking unresponsive`
            );
            if (this.onPeerUnresponsive) this.onPeerUnresponsive(peerId);
          }
        }
      } else if (timeSinceLastSeen <= this.timeout && state.missed !== 0) {
        // Peer recovered; reset missed counter
        state.missed = 0;
        this.peerState.set(peerId, state);
      }
    }
  }

  removePeer(peerId) {
    this.peerState.delete(peerId);
  }
}

