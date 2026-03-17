import { Toast } from "../ui/Toast.js";

export class MediaManager {
  constructor() {
    this.localStream = null;
    this.audioEnabled = true;
    this.videoEnabled = true;
  }

  async getLocalStream(constraints = { video: true, audio: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (err) {
      const name = err && err.name;
      // eslint-disable-next-line no-console
      console.error("[MediaManager] getUserMedia error", err);

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        Toast.show(
          "Camera/microphone permission denied. Please allow access in your browser settings.",
          "error"
        );
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          this.videoEnabled = false;
          return this.localStream;
        } catch (audioErr) {
          // eslint-disable-next-line no-console
          console.error(
            "[MediaManager] Audio-only getUserMedia failed after permission denial",
            audioErr
          );
          Toast.show(
            "Failed to access audio devices. Joining without media.",
            "error"
          );
          this.localStream = await this.createBlackSilentStream();
          this.audioEnabled = false;
          this.videoEnabled = false;
          return this.localStream;
        }
      }

      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        Toast.show(
          "No camera or microphone found. You can still join to listen.",
          "warning"
        );
        this.localStream = await this.createBlackSilentStream();
        this.audioEnabled = false;
        this.videoEnabled = false;
        return this.localStream;
      }

      if (name === "NotReadableError" || name === "TrackStartError") {
        Toast.show(
          "Camera/microphone is being used by another application.",
          "error"
        );
      }

      if (name === "OverconstrainedError") {
        // eslint-disable-next-line no-console
        console.warn(
          "[MediaManager] OverconstrainedError, retrying with lower constraints"
        );
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: true,
          });
          return this.localStream;
        } catch (e2) {
          // eslint-disable-next-line no-console
          console.error(
            "[MediaManager] Retry with lower constraints failed",
            e2
          );
        }
      }

      Toast.show("Failed to access media devices.", "error");
      this.localStream = await this.createBlackSilentStream();
      this.audioEnabled = false;
      this.videoEnabled = false;
      return this.localStream;
    }
  }

  toggleAudio() {
    if (!this.localStream) return this.audioEnabled;
    this.audioEnabled = !this.audioEnabled;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = this.audioEnabled;
    });
    return this.audioEnabled;
  }

  toggleVideo() {
    if (!this.localStream) return this.videoEnabled;
    this.videoEnabled = !this.videoEnabled;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = this.videoEnabled;
    });
    return this.videoEnabled;
  }

  getAudioTrack() {
    if (!this.localStream) return null;
    return this.localStream.getAudioTracks()[0] || null;
  }

  getVideoTrack() {
    if (!this.localStream) return null;
    return this.localStream.getVideoTracks()[0] || null;
  }

  stopAllTracks() {
    if (!this.localStream) return;
    this.localStream.getTracks().forEach((track) => track.stop());
  }

  replaceTrack(oldTrack, newTrack) {
    if (!this.localStream || !oldTrack || !newTrack) return;
    const senders = this.localStream.getTracks().flatMap(() => []);
    // Note: actual sender replacement should be done on RTCPeerConnection senders;
    // left as a placeholder hook.
  }

  async createBlackSilentStream() {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const blackStream = canvas.captureStream(5);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const dst = oscillator.connect(audioContext.createMediaStreamDestination());
    oscillator.frequency.setValueAtTime(0, audioContext.currentTime);
    oscillator.start();

    const stream = new MediaStream();
    const videoTrack = blackStream.getVideoTracks()[0];
    if (videoTrack) stream.addTrack(videoTrack);
    const audioTrack = dst.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);

    return stream;
  }
}

