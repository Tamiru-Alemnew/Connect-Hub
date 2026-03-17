export class Controls {
  constructor(mediaManager) {
    this.mediaManager = mediaManager;
    this.micBtn = document.getElementById("btnMic");
    this.videoBtn = document.getElementById("btnVideo");
    this.screenShareBtn = document.getElementById("btnScreenShare");
    this.chatBtn = document.getElementById("btnChat");
    this.participantsBtn = document.getElementById("btnParticipants");
    this.leaveBtn = document.getElementById("btnLeave");
    this.fullscreenBtn = document.getElementById("btnFullscreen");
    this.micActive = true;
    this.videoActive = true;

    this.onToggleChat = null;
    this.onToggleParticipants = null;
    this.onLeave = null;
    this.onVideoToggle = null;
    this.onScreenShare = null;
    this.onScreenShareEnd = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.micBtn) {
      this.micBtn.addEventListener("click", () => this.toggleMic());
    }
    if (this.videoBtn) {
      this.videoBtn.addEventListener("click", () => this.toggleVideo());
    }
    if (this.screenShareBtn) {
      this.screenShareBtn.addEventListener("click", () =>
        this.toggleScreenShare()
      );
    }
    if (this.chatBtn) {
      this.chatBtn.addEventListener("click", () => {
        if (this.onToggleChat) this.onToggleChat();
      });
    }
    if (this.participantsBtn) {
      this.participantsBtn.addEventListener("click", () => {
        if (this.onToggleParticipants) this.onToggleParticipants();
      });
    }
    if (this.leaveBtn) {
      this.leaveBtn.addEventListener("click", () => this.showLeaveConfirmation());
    }
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());
    }

    const cancelLeave = document.getElementById("btnCancelLeave");
    const confirmLeave = document.getElementById("btnConfirmLeave");
    if (cancelLeave) {
      cancelLeave.addEventListener("click", () => this.hideLeaveConfirmation());
    }
    if (confirmLeave) {
      confirmLeave.addEventListener("click", () => {
        if (this.onLeave) this.onLeave();
      });
    }
  }

  toggleMic() {
    const enabled = this.mediaManager.toggleAudio();
    this.micActive = enabled;
    const icon = this.micBtn.querySelector(".control-btn__icon i");
    if (!icon) return;

    if (enabled) {
      icon.className = "fas fa-microphone";
      this.micBtn.classList.add("control-btn--active");
      this.micBtn.classList.remove("control-btn--muted");
    } else {
      icon.className = "fas fa-microphone-slash";
      this.micBtn.classList.remove("control-btn--active");
      this.micBtn.classList.add("control-btn--muted");
    }
  }

  toggleVideo() {
    const enabled = this.mediaManager.toggleVideo();
    this.videoActive = enabled;
    const icon = this.videoBtn.querySelector(".control-btn__icon i");
    if (!icon) return;

    if (enabled) {
      icon.className = "fas fa-video";
      this.videoBtn.classList.add("control-btn--active");
      this.videoBtn.classList.remove("control-btn--muted");
    } else {
      icon.className = "fas fa-video-slash";
      this.videoBtn.classList.remove("control-btn--active");
      this.videoBtn.classList.add("control-btn--muted");
    }

    if (this.onVideoToggle) this.onVideoToggle(enabled);
  }

  async toggleScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      if (this.onScreenShare) this.onScreenShare(screenStream);
      this.screenShareBtn.classList.add("control-btn--active");

      const track = screenStream.getVideoTracks()[0];
      track.onended = () => {
        if (this.onScreenShareEnd) this.onScreenShareEnd();
        this.screenShareBtn.classList.remove("control-btn--active");
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log("Screen share cancelled or failed:", error);
    }
  }

  showLeaveConfirmation() {
    const modal = document.getElementById("leaveModal");
    if (modal) modal.style.display = "flex";
  }

  hideLeaveConfirmation() {
    const modal = document.getElementById("leaveModal");
    if (modal) modal.style.display = "none";
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      this.fullscreenBtn.querySelector("i").className = "fas fa-expand";
    } else {
      document.documentElement.requestFullscreen();
      this.fullscreenBtn.querySelector("i").className = "fas fa-compress";
    }
  }
}

