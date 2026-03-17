import { MessageTypes } from "../signaling/messageTypes.js";

export class AdaptiveRecoveryManager {
  constructor(meshNetwork, signalingClient) {
    this.mesh = meshNetwork;
    this.signaling = signalingClient;
    this.recoveryAttempts = new Map(); // peerId -> { attempts, strategy, lastAttempt }
    this.maxRetries = 4;
    this.baseDelay = 5000;
    this.maxDelay = 30000;
    this.strategies = [
      "ice-restart",
      "ice-restart",
      "renegotiate",
      "turn-fallback",
      "full-reset",
    ];

    // Callbacks
    this.onPermanentFailure = null; // (peerId) => {}
    this.onRecoveryAttempt = null; // (peerId, strategy, attempt) => {}
    this.onRecoverySuccess = null; // (peerId, strategy) => {}
  }

  getState(peerId) {
    return this.recoveryAttempts.get(peerId) || {
      attempts: 0,
      lastAttempt: null,
      strategy: null,
    };
  }

  calculateBackoff(attempt) {
    const exponential = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return Math.min(exponential + jitter, this.maxDelay);
  }

  handlePermanentFailure(peerId) {
    // eslint-disable-next-line no-console
    console.warn(`[Recovery] Permanent connection failure for peer ${peerId}`);
    this.mesh.disconnectPeer?.(peerId);
    this.recoveryAttempts.delete(peerId);
    if (this.onPermanentFailure) this.onPermanentFailure(peerId);
  }

  async handleConnectionFailure(peerId, failureType) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Recovery] Connection failure detected for peer ${peerId}: ${failureType}`
    );

    const state = this.getState(peerId);

    if (state.attempts >= this.maxRetries) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Recovery] Max retries exhausted for peer ${peerId}`
      );
      this.handlePermanentFailure(peerId);
      return;
    }

    const attempt = state.attempts;
    const strategy = this.strategies[attempt] || "full-reset";
    const delay = this.calculateBackoff(attempt);

    await new Promise((resolve) => setTimeout(resolve, delay));

    // eslint-disable-next-line no-console
    console.info(
      `[Recovery] Attempting strategy '${strategy}' for peer ${peerId} (attempt ${
        attempt + 1
      }/${this.maxRetries})`
    );
    if (this.onRecoveryAttempt) {
      this.onRecoveryAttempt(peerId, strategy, attempt + 1);
    }

    const success = await this.executeStrategy(strategy, peerId);

    if (success) {
      // eslint-disable-next-line no-console
      console.info(
        `[Recovery] Successfully recovered connection to peer ${peerId} using ${strategy}`
      );
      this.recoveryAttempts.delete(peerId);
      if (this.onRecoverySuccess) {
        this.onRecoverySuccess(peerId, strategy);
      }
      return;
    }

    const nextState = {
      attempts: attempt + 1,
      lastAttempt: Date.now(),
      strategy,
    };
    this.recoveryAttempts.set(peerId, nextState);

    await this.handleConnectionFailure(peerId, failureType);
  }

  async executeStrategy(strategy, peerId) {
    switch (strategy) {
      case "ice-restart":
        return this.strategyICERestart(peerId);
      case "renegotiate":
        return this.strategyRenegotiate(peerId);
      case "turn-fallback":
        return this.strategyTURNFallback(peerId);
      case "full-reset":
        return this.strategyFullReset(peerId);
      default:
        return false;
    }
  }

  async waitForConnected(peerId, timeoutMs) {
    const pcm = this.mesh.connections.get(peerId);
    if (!pcm) return false;

    if (
      pcm.pc.iceConnectionState === "connected" ||
      pcm.pc.iceConnectionState === "completed"
    ) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      const originalHandler = pcm.pc.oniceconnectionstatechange;
      pcm.pc.oniceconnectionstatechange = (...args) => {
        if (originalHandler) originalHandler.apply(pcm.pc, args);
        const state = pcm.pc.iceConnectionState;
        if (state === "connected" || state === "completed") {
          clearTimeout(timeout);
          resolve(true);
        }
      };
    });
  }

  async strategyICERestart(peerId) {
    const pcm = this.mesh.connections.get(peerId);
    if (!pcm || !pcm.attemptICERestart) return false;
    try {
      await pcm.attemptICERestart();
      return this.waitForConnected(peerId, 15000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Recovery] ICE restart failed", e);
      return false;
    }
  }

  async strategyRenegotiate(peerId) {
    const pcm = this.mesh.connections.get(peerId);
    if (!pcm) return false;
    try {
      const config = pcm.pc.getConfiguration();
      pcm.pc.close();
      // eslint-disable-next-line no-undef
      pcm.pc = new RTCPeerConnection(config);
      pcm.setupEventHandlers();
      pcm.addLocalTracks();
      await pcm.createOffer();
      return this.waitForConnected(peerId, 20000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Recovery] Renegotiation failed", e);
      return false;
    }
  }

  async strategyTURNFallback(peerId) {
    const pcm = this.mesh.connections.get(peerId);
    if (!pcm) return false;
    try {
      const baseConfig = pcm.pc.getConfiguration();
      const config = {
        ...baseConfig,
        iceTransportPolicy: "relay",
      };
      pcm.pc.close();
      // eslint-disable-next-line no-undef
      pcm.pc = new RTCPeerConnection(config);
      pcm.setupEventHandlers();
      pcm.addLocalTracks();
      await pcm.createOffer();
      // eslint-disable-next-line no-console
      console.info(`[Recovery] Forced TURN relay for peer ${peerId}`);
      return this.waitForConnected(peerId, 20000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Recovery] TURN fallback failed", e);
      return false;
    }
  }

  async strategyFullReset(peerId) {
    const pcm = this.mesh.connections.get(peerId);
    if (!pcm) return false;
    try {
      pcm.close();
      this.mesh.connections.delete(peerId);

      this.signaling.send({
        type: MessageTypes.RECONNECT_REQUEST,
        from: this.mesh.localPeerId,
        to: peerId,
        timestamp: Date.now(),
      });

      await this.mesh.connectToPeer(peerId);
      return this.waitForConnected(peerId, 25000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Recovery] Full reset failed", e);
      return false;
    }
  }
}

