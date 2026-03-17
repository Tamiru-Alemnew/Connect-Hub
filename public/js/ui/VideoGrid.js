const AVATAR_GRADIENTS = [
  ["#6366f1", "#8b5cf6"],
  ["#ec4899", "#f43f5e"],
  ["#14b8a6", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#10b981", "#6366f1"],
  ["#f97316", "#eab308"],
  ["#06b6d4", "#3b82f6"],
];

function hashName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getAvatarGradient(name) {
  const idx = hashName(name) % AVATAR_GRADIENTS.length;
  const [a, b] = AVATAR_GRADIENTS[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export class VideoGrid {
  constructor() {
    this.container = document.getElementById("videoGrid");
    this.tiles = new Map();
    this.waitingStateEl = null;
  }

  addVideo(peerId, stream, isLocal = false, displayName = null) {
    let tile = this.tiles.get(peerId);
    const name = displayName || (isLocal ? "You" : `Peer ${peerId.substring(0, 6)}`);

    if (!tile) {
      tile = document.createElement("div");
      tile.className = "video-tile" + (isLocal ? " video-tile--local" : "");
      tile.dataset.peerId = peerId;

      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = isLocal;
      video.srcObject = stream;

      const overlay = document.createElement("div");
      overlay.className = "video-tile__overlay";
      overlay.innerHTML = `
        <div class="video-tile__name">
          <span>${this._escapeHtml(name)}</span>
          <i class="fas fa-microphone-slash mic-status"></i>
        </div>
        <div class="video-tile__indicators">
          <div class="indicator indicator--connection quality-good">
            <div class="signal-bar"></div>
            <div class="signal-bar"></div>
            <div class="signal-bar"></div>
            <div class="signal-bar"></div>
          </div>
        </div>
      `;

      const noVideo = document.createElement("div");
      noVideo.className = "video-tile__no-video";
      noVideo.style.display = "none";
      const initials = getInitials(name);
      const gradient = getAvatarGradient(name);
      noVideo.innerHTML = `
        <div class="avatar-circle" style="background: ${gradient}">
          <span>${initials}</span>
        </div>
      `;

      tile.appendChild(video);
      tile.appendChild(overlay);
      tile.appendChild(noVideo);

      this.container.appendChild(tile);
      this.tiles.set(peerId, tile);

      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    } else {
      const video = tile.querySelector("video");
      if (video) {
        video.srcObject = stream;
        video.muted = isLocal;
      }
    }

    this.updateGridLayout();
  }

  removeVideo(peerId) {
    const tile = this.tiles.get(peerId);
    if (tile) {
      tile.classList.add("video-tile--leaving");
      setTimeout(() => {
        tile.remove();
        this.tiles.delete(peerId);
        this.updateGridLayout();
      }, 300);
    }
  }

  updateGridLayout() {
    if (!this.container) return;
    const count = this.tiles.size;
    const classes = ["grid-1", "grid-2", "grid-3", "grid-4", "grid-5-6", "grid-7-9", "grid-10-plus"];
    this.container.classList.remove(...classes);

    if (count === 1) this.container.classList.add("grid-1");
    else if (count === 2) this.container.classList.add("grid-2");
    else if (count === 3) this.container.classList.add("grid-3");
    else if (count === 4) this.container.classList.add("grid-4");
    else if (count <= 6) this.container.classList.add("grid-5-6");
    else if (count <= 9) this.container.classList.add("grid-7-9");
    else this.container.classList.add("grid-10-plus");

    if (count === 1) {
      this.showWaitingState();
    } else {
      this.hideWaitingState();
    }
  }

  showNoVideo(peerId) {
    const tile = this.tiles.get(peerId);
    if (!tile) return;
    const video = tile.querySelector("video");
    const placeholder = tile.querySelector(".video-tile__no-video");
    if (video) video.style.display = "none";
    if (placeholder) placeholder.style.display = "flex";
  }

  showVideo(peerId) {
    const tile = this.tiles.get(peerId);
    if (!tile) return;
    const video = tile.querySelector("video");
    const placeholder = tile.querySelector(".video-tile__no-video");
    if (video) video.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
  }

  updateConnectionIndicator(peerId, quality) {
    const tile = this.tiles.get(peerId);
    if (!tile) return;
    const indicator = tile.querySelector(".indicator--connection");
    if (!indicator) return;
    indicator.classList.remove("quality-good", "quality-fair", "quality-poor");
    indicator.classList.add(`quality-${quality}`);
  }

  getTileCount() {
    return this.tiles.size;
  }

  setSpeaking(peerId, isSpeaking) {
    const tile = this.tiles.get(peerId);
    if (!tile) return;
    tile.classList.toggle("video-tile--speaking", isSpeaking);
  }

  showWaitingState() {
    if (!this.container || this.waitingStateEl) return;
    const el = document.createElement("div");
    el.className = "waiting-state";
    el.id = "waitingState";
    el.innerHTML = `
      <div class="waiting-state__content">
        <div class="waiting-state__icon">
          <i class="fas fa-user-plus"></i>
        </div>
        <h3>Waiting for others to join...</h3>
        <p>Share this link to invite participants:</p>
        <div class="waiting-state__link">
          <code id="waitingRoomLink"></code>
          <button class="waiting-state__copy" id="waitingCopyBtn" title="Copy link">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
    `;
    this.container.appendChild(el);
    this.waitingStateEl = el;

    const linkEl = el.querySelector("#waitingRoomLink");
    const copyBtn = el.querySelector("#waitingCopyBtn");
    if (linkEl) linkEl.textContent = window.location.href;
    if (copyBtn && linkEl) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(linkEl.textContent || "");
          copyBtn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500);
        } catch { /* ignore */ }
      });
    }
  }

  hideWaitingState() {
    if (!this.waitingStateEl) return;
    this.waitingStateEl.remove();
    this.waitingStateEl = null;
  }

  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
