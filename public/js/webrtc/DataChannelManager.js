export class DataChannelManager {
  constructor(peerConnectionManager) {
    this.pcm = peerConnectionManager;
    this.channels = new Map(); // label -> RTCDataChannel
    this.messageBuffers = new Map(); // label -> any[]

    this.onMessage = null; // (label, data) => {}
  }

  createChannel(label) {
    const channel = this.pcm.createDataChannel(label);
    this._setupChannel(label, channel);
    return channel;
  }

  attachChannel(label, channel) {
    this._setupChannel(label, channel);
  }

  _setupChannel(label, channel) {
    this.channels.set(label, channel);
    if (!this.messageBuffers.has(label)) this.messageBuffers.set(label, []);

    channel.onopen = () => {
      // eslint-disable-next-line no-console
      console.log("[DC] channel opened:", label);
      this._flushBuffer(label);
    };

    channel.onclose = () => {
      // eslint-disable-next-line no-console
      console.log("[DC] channel closed:", label);
    };

    channel.onerror = (e) => {
      // eslint-disable-next-line no-console
      console.error("[DC] channel error:", label, e);
    };

    channel.onmessage = (event) => {
      // eslint-disable-next-line no-console
      console.log("[CHAT RECV 1] Raw message received on channel:", label, event.data);
      try {
        const data = JSON.parse(event.data);
        // eslint-disable-next-line no-console
        console.log("[CHAT RECV 2] Parsed data:", data);
        if (this.onMessage) this.onMessage(label, data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[DC] Failed to parse message:", label, e);
      }
    };
  }

  send(label, data) {
    const channel = this.channels.get(label);
    // eslint-disable-next-line no-console
    console.log("[CHAT SEND 4] DCM.send called, channel state:", channel?.readyState);

    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify(data));
      return { sent: true };
    }

    const buffer = this.messageBuffers.get(label) || [];
    buffer.push(data);
    while (buffer.length > 50) buffer.shift();
    this.messageBuffers.set(label, buffer);
    return { queued: true };
  }

  _flushBuffer(label) {
    const buffer = this.messageBuffers.get(label);
    if (!buffer || buffer.length === 0) return;
    const channel = this.channels.get(label);
    if (!channel || channel.readyState !== "open") return;

    while (buffer.length > 0) {
      const msg = buffer.shift();
      channel.send(JSON.stringify(msg));
    }
  }

  closeAll() {
    this.channels.forEach((channel) => channel.close());
    this.channels.clear();
    this.messageBuffers.clear();
  }
}

