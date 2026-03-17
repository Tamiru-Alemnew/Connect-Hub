import { MediaManager } from "./webrtc/MediaManager.js";
import { MeshNetwork } from "./webrtc/MeshNetwork.js";
import { SignalingClient } from "./signaling/SignalingClient.js";
import { VideoGrid } from "./ui/VideoGrid.js";
import { ChatPanel } from "./ui/ChatPanel.js";
import { Controls } from "./ui/Controls.js";
import { Toast } from "./ui/Toast.js";
import { MeetingTimer } from "./ui/Timer.js";
import { DebugPanel } from "./ui/DebugPanel.js";
import { createSpeakingDetector } from "./utils/SpeakingDetector.js";

// Simple ICE config — single STUN server, matching PeerJS's minimal approach.
// For cross-network / production use, add a TURN server:
//
// const iceConfig = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     {
//       urls: "turn:your-turn-host:3478",
//       username: "your-username",
//       credential: "your-credential",
//     },
//   ],
// };
const iceConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// ─── Pre-join state ─────────────────────────────────────────────────────
let localDisplayName = "Guest";
let previewStream = null;
let prejoinMicOn = true;
let prejoinVideoOn = true;

async function initializePrejoin() {
  const roomId = ROOM_ID;
  const roomIdShort =
    typeof roomId === "string" ? `${roomId.substring(0, 8)}...` : "";

  const prejoinRoomIdEl = document.getElementById("prejoinRoomId");
  if (prejoinRoomIdEl) prejoinRoomIdEl.textContent = roomIdShort;

  const prejoinVideo = document.getElementById("prejoinVideo");
  const prejoinNoVideo = document.getElementById("prejoinNoVideo");
  const micToggle = document.getElementById("prejoinMicToggle");
  const videoToggle = document.getElementById("prejoinVideoToggle");
  const nameInput = document.getElementById("displayName");
  const avatarSpan = document.querySelector("#prejoinAvatar span");

  try {
    previewStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    if (prejoinVideo) prejoinVideo.srcObject = previewStream;
  } catch (err) {
    console.warn("[Prejoin] getUserMedia failed", err);
    previewStream = null;
    if (prejoinVideo && prejoinNoVideo) {
      prejoinVideo.style.display = "none";
      prejoinNoVideo.style.display = "flex";
    }
    prejoinVideoOn = false;
    prejoinMicOn = false;
    if (micToggle) {
      micToggle.classList.remove("prejoin__toggle--active");
      micToggle.classList.add("prejoin__toggle--muted");
      const icon = micToggle.querySelector("i");
      if (icon) icon.className = "fas fa-microphone-slash";
    }
    if (videoToggle) {
      videoToggle.classList.remove("prejoin__toggle--active");
      videoToggle.classList.add("prejoin__toggle--muted");
      const icon = videoToggle.querySelector("i");
      if (icon) icon.className = "fas fa-video-slash";
    }
  }

  if (previewStream && micToggle) {
    micToggle.addEventListener("click", function () {
      prejoinMicOn = !prejoinMicOn;
      previewStream.getAudioTracks().forEach((t) => (t.enabled = prejoinMicOn));
      this.classList.toggle("prejoin__toggle--active", prejoinMicOn);
      this.classList.toggle("prejoin__toggle--muted", !prejoinMicOn);
      const icon = this.querySelector("i");
      if (icon) {
        icon.className = prejoinMicOn
          ? "fas fa-microphone"
          : "fas fa-microphone-slash";
      }
    });
  }

  if (previewStream && videoToggle && prejoinVideo && prejoinNoVideo) {
    videoToggle.addEventListener("click", function () {
      prejoinVideoOn = !prejoinVideoOn;
      previewStream
        .getVideoTracks()
        .forEach((t) => (t.enabled = prejoinVideoOn));
      this.classList.toggle("prejoin__toggle--active", prejoinVideoOn);
      this.classList.toggle("prejoin__toggle--muted", !prejoinVideoOn);
      const icon = this.querySelector("i");
      if (icon) {
        icon.className = prejoinVideoOn
          ? "fas fa-video"
          : "fas fa-video-slash";
      }
      prejoinVideo.style.display = prejoinVideoOn ? "block" : "none";
      prejoinNoVideo.style.display = prejoinVideoOn ? "none" : "flex";
    });
  }

  if (nameInput && avatarSpan) {
    nameInput.addEventListener("input", function () {
      const value = this.value.trim();
      const letter = value ? value[0].toUpperCase() : "?";
      avatarSpan.textContent = letter;
    });
  }

  const joinBtn = document.getElementById("btnJoinRoom");
  if (joinBtn) {
    joinBtn.addEventListener("click", () => {
      const value = nameInput ? nameInput.value.trim() : "";
      localDisplayName = value || "Guest";
      startMeeting(roomId);
    });
  }

  if (nameInput) {
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (joinBtn) joinBtn.click();
      }
    });
  }
}

// ─── Meeting start ──────────────────────────────────────────────────────
async function startMeeting(roomId) {
  const prejoin = document.getElementById("prejoinScreen");
  const app = document.getElementById("app");

  if (prejoin) {
    prejoin.classList.add("prejoin--hidden");
    setTimeout(() => prejoin.remove(), 450);
  }

  if (app) {
    app.classList.add("app--active");
    app.style.opacity = "0";
    app.style.transform = "scale(1.02)";
    requestAnimationFrame(() => {
      app.style.transition = "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)";
      app.style.opacity = "1";
      app.style.transform = "scale(1)";
    });
  }

  const localPeerId =
    (crypto && crypto.randomUUID && crypto.randomUUID()) ||
    `peer-${Math.random().toString(36).slice(2)}`;

  console.log("[Main] Starting ConnectHub client", {
    roomId,
    localPeerId,
    localDisplayName,
  });

  const mediaManager = new MediaManager();
  const localStream = await mediaManager.getLocalStream();

  const signalingClient = new SignalingClient();
  const videoGrid = new VideoGrid();
  const chatPanel = new ChatPanel();
  chatPanel.setLocalDisplayName(localDisplayName);
  const controls = new Controls(mediaManager);
  const timer = new MeetingTimer();

  videoGrid.addVideo("local", localStream, true, localDisplayName);

  const speakingDetectors = new Map();
  speakingDetectors.set("local", createSpeakingDetector(localStream, (speaking) => {
    videoGrid.setSpeaking("local", speaking);
  }));

  if (!prejoinMicOn) controls.toggleMic();
  if (!prejoinVideoOn) controls.toggleVideo();
  timer.start();

  const meshNetwork = new MeshNetwork(
    localPeerId,
    signalingClient,
    mediaManager,
    iceConfig
  );

  const debugPanel = new DebugPanel(null);
  debugPanel.initialize(localPeerId, roomId);

  // ─── Peer events ────────────────────────────────────────────────
  meshNetwork.onPeerStream = (peerId, stream) => {
    videoGrid.addVideo(peerId, stream, false, `Peer ${peerId.substring(0, 6)}`);
    chatPanel.addSystemMessage("A participant has joined");
    Toast.show("A participant has joined", "info");
    const count = meshNetwork.connections.size + 1;
    updateParticipantCount(count);

    if (speakingDetectors.has(peerId)) speakingDetectors.get(peerId).stop();
    speakingDetectors.set(peerId, createSpeakingDetector(stream, (speaking) => {
      videoGrid.setSpeaking(peerId, speaking);
    }));
  };

  meshNetwork.onPeerDisconnected = (peerId) => {
    videoGrid.removeVideo(peerId);
    chatPanel.addSystemMessage("A participant has left");
    Toast.show("A participant has left", "warning");
    const count = meshNetwork.connections.size + 1;
    updateParticipantCount(count);

    if (speakingDetectors.has(peerId)) {
      speakingDetectors.get(peerId).stop();
      speakingDetectors.delete(peerId);
    }
  };

  meshNetwork.onPeerDataMessage = (peerId, data) => {
    console.log("[CHAT RECV 4] main.js received:", { peerId, data });
    if (data.type === "chat") {
      const senderName = data.senderName || `Peer ${peerId.substring(0, 6)}`;
      console.log("[CHAT RECV 5] Adding to ChatPanel:", senderName, data.text);
      chatPanel.addMessage(senderName, data.text, false);
    }
  };

  const onPeerStateChangeForGrid = (peerId, state) => {
    let quality = "good";
    if (state === "connecting" || state === "checking") quality = "fair";
    else if (state === "failed" || state === "disconnected") quality = "poor";
    videoGrid.updateConnectionIndicator(peerId, quality);
  };

  meshNetwork.onPeerStateChange = (peerId, state) => {
    onPeerStateChangeForGrid(peerId, state);
  };

  // ─── Controls ───────────────────────────────────────────────────
  controls.onLeave = () => {
    speakingDetectors.forEach((d) => d.stop());
    speakingDetectors.clear();
    meshNetwork.disconnectAll();
    signalingClient.disconnect();
    window.location.href = "/";
  };

  controls.onVideoToggle = (enabled) => {
    if (enabled) videoGrid.showVideo("local");
    else videoGrid.showNoVideo("local");
  };

  chatPanel.onSendMessage = (text) => {
    console.log("[CHAT SEND 1] User typed:", text);
    const payload = {
      type: "chat",
      text,
      sender: localPeerId,
      senderName: localDisplayName,
    };
    console.log("[CHAT SEND 2] Calling broadcastData with:", payload);
    meshNetwork.broadcastData(payload);
  };

  setupSidePanel(controls, chatPanel, debugPanel);
  setupTopbar(roomId);
  setupConnectionStatus(signalingClient, meshNetwork);
  setupKeyboardShortcuts(controls);
  setupAutoHide();

  // Join the room via signaling. We do NOT call connectToExistingPeers here:
  // existing peers receive PEER_JOINED and will send us offers.
  await signalingClient.joinRoom(roomId, localPeerId);
}

// ─── Side Panel ─────────────────────────────────────────────────────────
function setupSidePanel(controls, chatPanel, debugPanel) {
  const sidePanel = document.getElementById("sidePanel");
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const closeBtn = document.getElementById("closeSidePanel");
  let activeSidePanelTab = null;

  tabBtns.forEach((btn) => {
    const tabName = btn.dataset.tab;
    if (tabName) {
      btn.addEventListener("click", () => toggleSidePanel(tabName));
    }
  });

  function toggleSidePanel(tabName) {
    if (!sidePanel) return;
    if (activeSidePanelTab === tabName) {
      sidePanel.classList.remove("side-panel--open");
      activeSidePanelTab = null;
    } else {
      sidePanel.classList.add("side-panel--open");
      activeSidePanelTab = tabName;
      tabBtns.forEach((btn) => {
        btn.classList.toggle("tab-btn--active", btn.dataset.tab === tabName);
      });
      tabContents.forEach((content) => {
        content.classList.toggle(
          "tab-content--active",
          content.dataset.tabContent === tabName
        );
      });
    }

    if (tabName === "chat") {
      chatPanel.setPanelVisible(
        sidePanel.classList.contains("side-panel--open")
      );
    }
  }

  controls.onToggleChat = () => toggleSidePanel("chat");
  controls.onToggleParticipants = () => toggleSidePanel("participants");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      sidePanel.classList.remove("side-panel--open");
      activeSidePanelTab = null;
      chatPanel.setPanelVisible(false);
    });
  }

  window.toggleSidePanel = toggleSidePanel;
  window.getSidePanelState = () => ({ activeSidePanelTab, sidePanel });
}

// ─── Top bar ────────────────────────────────────────────────────────────
function setupTopbar(roomId) {
  const meetingIdEl = document.getElementById("meetingId");
  const roomIdDisplay = document.getElementById("roomIdDisplay");
  const debugButton = document.getElementById("btnDebugPanel");

  if (roomIdDisplay) {
    roomIdDisplay.textContent = roomId.substring(0, 8) + "...";
  }

  if (meetingIdEl) {
    meetingIdEl.addEventListener("click", () => {
      navigator.clipboard
        .writeText(roomId)
        .then(() => Toast.show("Room ID copied!", "success", 2000))
        .catch(() => Toast.show("Failed to copy Room ID", "error"));
    });
  }

  if (debugButton) {
    debugButton.addEventListener("click", () => {
      const sidePanel = document.getElementById("sidePanel");
      if (!sidePanel) return;
      sidePanel.classList.add("side-panel--open");
      document
        .querySelectorAll(".tab-btn")
        .forEach((btn) =>
          btn.classList.toggle("tab-btn--active", btn.dataset.tab === "debug")
        );
      document
        .querySelectorAll(".tab-content")
        .forEach((content) =>
          content.classList.toggle(
            "tab-content--active",
            content.dataset.tabContent === "debug"
          )
        );
    });
  }
}

// ─── Connection status ──────────────────────────────────────────────────
function setupConnectionStatus(signalingClient, meshNetwork) {
  const dot = document.querySelector(".status-dot");
  const text = document.querySelector(".status-text");
  if (!dot || !text) return;

  function update(status) {
    dot.className = "status-dot";
    if (status === "connected") {
      dot.classList.add("status-dot--connected");
      text.textContent = "Connected";
    } else if (status === "reconnecting") {
      dot.classList.add("status-dot--reconnecting");
      text.textContent = "Reconnecting...";
    } else if (status === "disconnected") {
      dot.classList.add("status-dot--disconnected");
      text.textContent = "Disconnected";
    }
  }

  update("connected");

  if (signalingClient.socket) {
    signalingClient.socket.on("connect", () => update("connected"));
    signalingClient.socket.on("reconnect", () => update("connected"));
    signalingClient.socket.on("reconnect_attempt", () => update("reconnecting"));
    signalingClient.socket.on("disconnect", () => update("disconnected"));
    signalingClient.socket.on("connect_error", () => update("reconnecting"));
  }

  const prevOnPeerStateChange = meshNetwork.onPeerStateChange;
  meshNetwork.onPeerStateChange = (peerId, state) => {
    if (prevOnPeerStateChange) prevOnPeerStateChange(peerId, state);
    if (state === "failed" || state === "disconnected") {
      update("reconnecting");
    }
  };
}

// ─── Auto-hide (topbar + control bar) ───────────────────────────────────
function setupAutoHide() {
  const topbar = document.getElementById("topbar");
  const controlBar = document.getElementById("controlBar");
  const videoArea = document.querySelector(".video-area");
  const sidePanel = document.getElementById("sidePanel");

  let hideTimeout;
  const HIDE_DELAY = 4000;

  function showUI() {
    if (topbar) topbar.classList.remove("topbar--hidden");
    if (controlBar) controlBar.classList.remove("control-bar--hidden");
    clearTimeout(hideTimeout);

    const panelOpen = sidePanel && sidePanel.classList.contains("side-panel--open");
    if (!panelOpen) {
      hideTimeout = setTimeout(hideUI, HIDE_DELAY);
    }
  }

  function hideUI() {
    const panelOpen = sidePanel && sidePanel.classList.contains("side-panel--open");
    if (panelOpen) return;
    if (topbar) topbar.classList.add("topbar--hidden");
    if (controlBar) controlBar.classList.add("control-bar--hidden");
  }

  if (videoArea) {
    videoArea.addEventListener("mousemove", showUI);
    videoArea.addEventListener("mouseenter", showUI);
  }

  if (controlBar) {
    controlBar.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
      if (controlBar) controlBar.classList.remove("control-bar--hidden");
      if (topbar) topbar.classList.remove("topbar--hidden");
    });
    controlBar.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(hideUI, 2000);
    });
  }

  if (topbar) {
    topbar.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
      topbar.classList.remove("topbar--hidden");
      if (controlBar) controlBar.classList.remove("control-bar--hidden");
    });
    topbar.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(hideUI, 2000);
    });
  }

  document.addEventListener("mousemove", (e) => {
    if (e.clientY > window.innerHeight - 100 || e.clientY < 60) {
      showUI();
    }
  });

  showUI();
}

// ─── Keyboard shortcuts ─────────────────────────────────────────────────
function setupKeyboardShortcuts(controls) {
  document.addEventListener("keydown", (e) => {
    const target = e.target;
    if (!target) return;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const sidePanelState =
      typeof window.getSidePanelState === "function"
        ? window.getSidePanelState()
        : { activeSidePanelTab: null, sidePanel: null };
    const { activeSidePanelTab, sidePanel } = sidePanelState;

    switch (e.key.toLowerCase()) {
      case "m":
        controls.toggleMic();
        Toast.show(
          controls.micActive ? "Microphone on" : "Microphone off",
          "info",
          2000
        );
        break;
      case "v":
        controls.toggleVideo();
        Toast.show(
          controls.videoActive ? "Camera on" : "Camera off",
          "info",
          2000
        );
        break;
      case "c":
        if (window.toggleSidePanel) window.toggleSidePanel("chat");
        break;
      case "p":
        if (window.toggleSidePanel) window.toggleSidePanel("participants");
        break;
      case "d":
        if (window.toggleSidePanel) window.toggleSidePanel("debug");
        break;
      case "f":
        controls.toggleFullscreen();
        break;
      case "escape":
        if (sidePanel && activeSidePanelTab) {
          sidePanel.classList.remove("side-panel--open");
          if (window.getSidePanelState) {
            const state = window.getSidePanelState();
            if (state) state.activeSidePanelTab = null;
          }
        }
        break;
      default:
        break;
    }
  });
}

// ─── Participant count ──────────────────────────────────────────────────
function updateParticipantCount(count) {
  const badge = document.getElementById("participantCount");
  if (badge) badge.textContent = String(count);

  const topbarCount = document.getElementById("topbarParticipantCount");
  if (topbarCount) topbarCount.textContent = String(count);
}

// ─── Bootstrap ──────────────────────────────────────────────────────────
const ROOM_ID = typeof window !== "undefined" ? window.ROOM_ID : undefined;

initializePrejoin().catch((err) => {
  console.error("[Prejoin] Unhandled error", err);
  startMeeting(ROOM_ID);
});
