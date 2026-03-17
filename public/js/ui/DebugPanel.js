export class DebugPanel {
  constructor(performanceMonitor) {
    this.monitor = performanceMonitor;
    this.container = document.getElementById("debugPeerStats");
    this.localPeerIdEl = document.getElementById("debugLocalPeerId");
    this.roomIdEl = document.getElementById("debugRoomId");
    this.updateInterval = null;
  }

  initialize(localPeerId, roomId) {
    if (this.localPeerIdEl) {
      this.localPeerIdEl.textContent =
        localPeerId.substring(0, 8) + "...";
    }
    if (this.roomIdEl) {
      this.roomIdEl.textContent = roomId.substring(0, 8) + "...";
    }
  }

  startUpdating() {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => this.update(), 2000);
  }

  stopUpdating() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = null;
  }

  update() {
    if (!this.monitor || !this.container) return;
    const summaries = this.monitor.getAllMetricsSummaries();
    this.container.innerHTML = "";

    if (!summaries.length) {
      this.container.innerHTML =
        '<p style="color: var(--text-tertiary); padding: 12px;">No peer connections</p>';
      return;
    }

    summaries.forEach((summary) => {
      const card = document.createElement("div");
      card.className = "debug-peer-card";
      card.dataset.peerId = summary.peerId;

      card.innerHTML = `
        <h5>Peer: ${summary.peerId.substring(0, 8)}...</h5>
        <div class="debug-item">
          <span class="debug-label">Latency</span>
          <span class="debug-value">${summary.avgLatency.toFixed(1)}ms</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Packet Loss</span>
          <span class="debug-value">${summary.avgPacketLoss.toFixed(2)}%</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Jitter</span>
          <span class="debug-value">${summary.avgJitter.toFixed(1)}ms</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Video Bitrate</span>
          <span class="debug-value">${(
            summary.currentVideoBitrate / 1000
          ).toFixed(0)} kbps</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">NAT Traversal</span>
          <span class="debug-value">${summary.natTraversal || "Detecting..."}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Candidate Type</span>
          <span class="debug-value">${
            summary.candidateType?.local || "—"
          } / ${summary.candidateType?.remote || "—"}</span>
        </div>
      `;

      this.container.appendChild(card);
    });
  }
}

