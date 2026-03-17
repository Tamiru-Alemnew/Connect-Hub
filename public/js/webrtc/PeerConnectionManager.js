export class PeerConnectionManager {
  constructor(remotePeerId, iceConfig) {
    this.remotePeerId = remotePeerId;
    this.pc = new RTCPeerConnection(iceConfig);

    this.remoteStream = null;
    this.iceCandidateBuffer = [];

    // Callbacks (wired by MeshNetwork)
    this.onICECandidate = null; // (candidate) => {}
    this.onRemoteStream = null; // (stream) => {}
    this.onStateChange = null; // (state) => {}
    this.onDataChannel = null; // (channel) => {}

    this._setupEventHandlers();
  }

  _setupEventHandlers() {
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onICECandidate) {
        this.onICECandidate({
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        });
      }
    };

    this.pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = event.streams[0];
      }
      if (this.onRemoteStream) this.onRemoteStream(event.streams[0]);
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState;
      // eslint-disable-next-line no-console
      console.log(`[WebRTC] ICE state [${this.remotePeerId}]: ${state}`);

      if (this.onStateChange) this.onStateChange(state);

      if (state === "failed") {
        // eslint-disable-next-line no-console
        console.error(`[WebRTC] ICE failed for ${this.remotePeerId}`);
        this.close();
      }
      if (state === "closed") {
        this.close();
      }
      if (state === "disconnected") {
        // eslint-disable-next-line no-console
        console.warn(
          `[WebRTC] ICE disconnected for ${this.remotePeerId} (browser may self-heal)`
        );
      }
    };

    this.pc.ondatachannel = (event) => {
      if (this.onDataChannel) this.onDataChannel(event.channel);
    };
  }

  setLocalStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(payload) {
    const sdpPayload =
      typeof payload === "string" ? { type: "offer", sdp: payload } : payload;
    await this.pc.setRemoteDescription(
      new RTCSessionDescription(sdpPayload)
    );
    await this.flushICECandidateBuffer();
  }

  async createAnswer() {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(payload) {
    const sdpPayload =
      typeof payload === "string" ? { type: "answer", sdp: payload } : payload;
    await this.pc.setRemoteDescription(
      new RTCSessionDescription(sdpPayload)
    );
    await this.flushICECandidateBuffer();
  }

  async addICECandidate(candidatePayload) {
    if (!candidatePayload) return;
    const candidate = new RTCIceCandidate(candidatePayload);
    if (this.pc.remoteDescription) {
      await this.pc.addIceCandidate(candidate);
    } else {
      this.iceCandidateBuffer.push(candidate);
    }
  }

  async flushICECandidateBuffer() {
    for (const candidate of this.iceCandidateBuffer) {
      // eslint-disable-next-line no-await-in-loop
      await this.pc.addIceCandidate(candidate);
    }
    this.iceCandidateBuffer = [];
  }

  createDataChannel(label) {
    return this.pc.createDataChannel(label, { ordered: true });
  }

  close() {
    try {
      this.pc.close();
    } catch {
      // ignore
    }
  }
}

