import { MessageTypes } from "../signaling/messageTypes.js";
import { PeerConnectionManager } from "./PeerConnectionManager.js";
import { DataChannelManager } from "./DataChannelManager.js";

export class MeshNetwork {
  constructor(localPeerId, signalingClient, mediaManager, iceConfig) {
    this.localPeerId = localPeerId;
    this.signalingClient = signalingClient;
    this.mediaManager = mediaManager;
    this.iceConfig = iceConfig;
    this.connections = new Map(); // peerId -> PeerConnectionManager
    this.dataChannels = new Map(); // peerId -> DataChannelManager

    this.onPeerStream = null;
    this.onPeerDisconnected = null;
    this.onPeerStateChange = null;
    this.onPeerDataMessage = null;
    // Keep WebRTC layer minimal (PeerJS-style):
    // - no HeartbeatManager
    // - no AdaptiveRecoveryManager
    // - no getStats monitor during connection setup

    this.setupSignalingHandlers();
  }

  get localStream() {
    return this.mediaManager.localStream;
  }

  setupSignalingHandlers() {
    this.signalingClient.onSignal(MessageTypes.SDP_OFFER, (msg) =>
      this.handleIncomingOffer(msg)
    );
    this.signalingClient.onSignal(MessageTypes.SDP_ANSWER, (msg) =>
      this.handleIncomingAnswer(msg)
    );
    this.signalingClient.onSignal(MessageTypes.ICE_CANDIDATE, (msg) =>
      this.handleIncomingICE(msg)
    );
    this.signalingClient.onPeerJoined((msg) => this.handlePeerJoined(msg));
    this.signalingClient.onPeerLeft((msg) => this.handlePeerLeft(msg));
  }

  async connectToPeer(remotePeerId) {
    if (remotePeerId === this.localPeerId) return;
    if (this.connections.has(remotePeerId)) return;
    if (!this.localStream) {
      // eslint-disable-next-line no-console
      console.warn("[MeshNetwork] Local stream not ready, cannot connect");
      return;
    }

    const pcm = new PeerConnectionManager(remotePeerId, this.iceConfig);
    pcm.setLocalStream(this.localStream);

    pcm.onRemoteStream = (stream) => {
      if (this.onPeerStream) this.onPeerStream(remotePeerId, stream);
    };

    pcm.onStateChange = (state) => {
      if (this.onPeerStateChange) this.onPeerStateChange(remotePeerId, state);
    };

    pcm.onICECandidate = (candidate) => {
      this.signalingClient.send({
        type: MessageTypes.ICE_CANDIDATE,
        from: this.localPeerId,
        to: remotePeerId,
        payload: candidate,
      });
    };

    const dcm = new DataChannelManager(pcm);
    dcm.createChannel("chat");
    dcm.onMessage = (label, data) => {
      // eslint-disable-next-line no-console
      console.log("[ChatFlow] incoming datachannel message", {
        from: remotePeerId,
        label,
        data,
      });
      if (this.onPeerDataMessage) this.onPeerDataMessage(remotePeerId, data);
    };

    this.connections.set(remotePeerId, pcm);
    this.dataChannels.set(remotePeerId, dcm);

    const offer = await pcm.createOffer();
    this.signalingClient.send({
      type: MessageTypes.SDP_OFFER,
      from: this.localPeerId,
      to: remotePeerId,
      payload: {
        sdp: offer.sdp,
        type: offer.type,
      },
    });
  }

  async handleIncomingOffer(message) {
    const { from, payload } = message;
    let pcm = this.connections.get(from);

    if (pcm) {
      // Glare: we already sent an offer to this peer and they sent one to us.
      // Use peer ID comparison as tiebreaker: smaller ID stays as offerer.
      const sigState = pcm.pc.signalingState;
      if (sigState === "have-local-offer") {
        if (this.localPeerId < from) {
          // eslint-disable-next-line no-console
          console.log("[MeshNetwork] Glare with", from, "— we keep our offer (smaller ID)");
          return;
        }
        // eslint-disable-next-line no-console
        console.log("[MeshNetwork] Glare with", from, "— rolling back, accepting their offer");
        pcm.close();
        this.connections.delete(from);
        const existingDcm = this.dataChannels.get(from);
        if (existingDcm) {
          existingDcm.closeAll();
          this.dataChannels.delete(from);
        }
        pcm = null;
      }
    }

    if (!pcm) {
      pcm = new PeerConnectionManager(from, this.iceConfig);
      pcm.setLocalStream(this.localStream);
      pcm.onRemoteStream = (stream) => {
        if (this.onPeerStream) this.onPeerStream(from, stream);
      };
      pcm.onStateChange = (state) => {
        if (this.onPeerStateChange) this.onPeerStateChange(from, state);
      };

      pcm.onICECandidate = (candidate) => {
        this.signalingClient.send({
          type: MessageTypes.ICE_CANDIDATE,
          from: this.localPeerId,
          to: from,
          payload: candidate,
        });
      };

      const dcm = new DataChannelManager(pcm);
      pcm.onDataChannel = (channel) => {
        dcm.attachChannel("chat", channel);
      };
      dcm.onMessage = (label, data) => {
        // eslint-disable-next-line no-console
        console.log("[ChatFlow] incoming datachannel message", {
          from,
          label,
          data,
        });
        if (this.onPeerDataMessage) this.onPeerDataMessage(from, data);
      };

      this.connections.set(from, pcm);
      this.dataChannels.set(from, dcm);
    }
    await pcm.handleOffer(payload);
    const answer = await pcm.createAnswer();
    this.signalingClient.send({
      type: MessageTypes.SDP_ANSWER,
      from: this.localPeerId,
      to: from,
      payload: {
        sdp: answer.sdp,
        type: answer.type,
      },
    });
  }

  async handleIncomingAnswer(message) {
    const { from, payload } = message;
    const pcm = this.connections.get(from);
    if (pcm) {
      await pcm.handleAnswer(payload);
    }
  }

  async handleIncomingICE(message) {
    const { from, payload } = message;
    const pcm = this.connections.get(from);
    if (pcm) {
      await pcm.addICECandidate(payload);
    }
  }

  async handlePeerJoined(message) {
    const { from } = message;
    await this.connectToPeer(from);
  }

  handlePeerLeft(message) {
    const { from } = message;
    const pcm = this.connections.get(from);
    if (pcm) {
      pcm.close();
      this.connections.delete(from);
      const dcm = this.dataChannels.get(from);
      if (dcm) {
        dcm.closeAll();
        this.dataChannels.delete(from);
      }
      if (this.onPeerDisconnected) this.onPeerDisconnected(from);
    }

    if (this.connections.size === 0) {
      // no-op (kept for symmetry)
    }
  }

  async connectToExistingPeers(peerList) {
    for (const peerId of peerList) {
      // eslint-disable-next-line no-await-in-loop
      await this.connectToPeer(peerId);
    }
  }

  broadcastData(data) {
    let sentCount = 0;
    let queuedCount = 0;
    let failedCount = 0;
    this.dataChannels.forEach((dcm, peerId) => {
      const result = dcm.send("chat", data);
      if (result.sent) sentCount += 1;
      else if (result.queued) queuedCount += 1;
      else failedCount += 1;
    });
    if (data.type === "chat") {
      // eslint-disable-next-line no-console
      console.info(
        `[ChatFlow] broadcastData: ${sentCount} sent, ${queuedCount} queued, ${failedCount} failed, ${this.dataChannels.size} peers`
      );
    }
  }

  disconnectAll() {
    this.connections.forEach((pcm) => pcm.close());
    this.connections.clear();
    this.dataChannels.forEach((dcm) => dcm.closeAll());
    this.dataChannels.clear();
  }

  disconnectPeer(peerId) {
    const pcm = this.connections.get(peerId);
    if (pcm) {
      pcm.close();
      this.connections.delete(peerId);
    }
    const dcm = this.dataChannels.get(peerId);
    if (dcm) {
      dcm.closeAll();
      this.dataChannels.delete(peerId);
    }
  }
}

