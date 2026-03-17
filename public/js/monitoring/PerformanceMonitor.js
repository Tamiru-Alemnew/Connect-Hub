export class WebRTCPerformanceMonitor {
  constructor(meshNetwork) {
    this.mesh = meshNetwork;
    this.metrics = new Map(); // peerId -> metrics
    this.monitorInterval = null;
    this.sampleRate = 2000;
  }

  start() {
    if (this.monitorInterval) return;
    this.monitorInterval = setInterval(
      () => this.collectAllStats(),
      this.sampleRate
    );
    // eslint-disable-next-line no-console
    console.info("[Monitor] Performance monitoring started");
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      // eslint-disable-next-line no-console
      console.info("[Monitor] Performance monitoring stopped");
    }
  }

  async collectAllStats() {
    for (const [peerId, pcm] of this.mesh.connections.entries()) {
      try {
        const stats = await pcm.pc.getStats();
        this.processStats(peerId, stats);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Monitor] Failed to get stats for ${peerId}`,
          error.message
        );
      }
    }
  }

  processStats(peerId, stats) {
    if (!this.metrics.has(peerId)) {
      this.metrics.set(peerId, {
        latency: [],
        packetLoss: [],
        jitter: [],
        bitrate: { audio: [], video: [] },
        natType: null,
        candidateType: null,
        timestamp: [],
        _prevVideoBytes: 0,
        _prevVideoTime: Date.now(),
        _prevAudioBytes: 0,
        _prevAudioTime: Date.now(),
      });
    }

    const peerMetrics = this.metrics.get(peerId);
    peerMetrics.timestamp.push(Date.now());
    const maxSamples = 60;

    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        if (report.currentRoundTripTime) {
          peerMetrics.latency.push(report.currentRoundTripTime * 1000);
        }
        const localCandidate = stats.get(report.localCandidateId);
        const remoteCandidate = stats.get(report.remoteCandidateId);
        if (localCandidate) {
          peerMetrics.candidateType = {
            local: localCandidate.candidateType,
            remote: remoteCandidate?.candidateType,
            protocol: localCandidate.protocol,
          };
          peerMetrics.natType = this.determineNATTraversal(
            localCandidate.candidateType,
            remoteCandidate?.candidateType
          );
        }
      }

      if (report.type === "inbound-rtp") {
        if (report.kind === "video") {
          const now = Date.now();
          const prevBytes = peerMetrics._prevVideoBytes || 0;
          const prevTime = peerMetrics._prevVideoTime || now;
          const bitrate =
            ((report.bytesReceived - prevBytes) * 8) /
            ((now - prevTime || 1) / 1000);
          peerMetrics.bitrate.video.push(bitrate);
          peerMetrics._prevVideoBytes = report.bytesReceived;
          peerMetrics._prevVideoTime = now;
        }
        if (report.kind === "audio") {
          const now = Date.now();
          const prevBytes = peerMetrics._prevAudioBytes || 0;
          const prevTime = peerMetrics._prevAudioTime || now;
          const bitrate =
            ((report.bytesReceived - prevBytes) * 8) /
            ((now - prevTime || 1) / 1000);
          peerMetrics.bitrate.audio.push(bitrate);
          peerMetrics._prevAudioBytes = report.bytesReceived;
          peerMetrics._prevAudioTime = now;
        }
        if (
          report.packetsLost !== undefined &&
          report.packetsReceived
        ) {
          const lossRate =
            (report.packetsLost /
              (report.packetsLost + report.packetsReceived)) *
            100;
          peerMetrics.packetLoss.push(lossRate);
        }
        if (report.jitter !== undefined) {
          peerMetrics.jitter.push(report.jitter * 1000);
        }
      }
    });

    ["latency", "packetLoss", "jitter"].forEach((key) => {
      if (peerMetrics[key].length > maxSamples) {
        peerMetrics[key] = peerMetrics[key].slice(-maxSamples);
      }
    });
    ["audio", "video"].forEach((key) => {
      if (peerMetrics.bitrate[key].length > maxSamples) {
        peerMetrics.bitrate[key] = peerMetrics.bitrate[key].slice(-maxSamples);
      }
    });
  }

  determineNATTraversal(localType, remoteType) {
    if (localType === "relay" || remoteType === "relay") {
      return "TURN_RELAY";
    }
    if (localType === "srflx" || remoteType === "srflx") {
      return "STUN_REFLEXIVE";
    }
    if (localType === "host" && remoteType === "host") {
      return "DIRECT_HOST";
    }
    return "UNKNOWN";
  }

  getMetricsSummary(peerId) {
    const m = this.metrics.get(peerId);
    if (!m) return null;
    return {
      peerId,
      avgLatency: this.average(m.latency.slice(-10)),
      avgPacketLoss: this.average(m.packetLoss.slice(-10)),
      avgJitter: this.average(m.jitter.slice(-10)),
      currentVideoBitrate: m.bitrate.video[m.bitrate.video.length - 1] || 0,
      currentAudioBitrate: m.bitrate.audio[m.bitrate.audio.length - 1] || 0,
      natTraversal: m.natType,
      candidateType: m.candidateType,
      sampleCount: m.timestamp.length,
    };
  }

  getAllMetricsSummaries() {
    const summaries = [];
    for (const peerId of this.mesh.connections.keys()) {
      const summary = this.getMetricsSummary(peerId);
      if (summary) summaries.push(summary);
    }
    return summaries;
  }

  average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

