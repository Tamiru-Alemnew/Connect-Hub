<div align="center">

<br>

<img src="https://img.shields.io/badge/WebRTC-Peer_to_Peer-6366f1?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC">
<img src="https://img.shields.io/badge/Socket.IO-Signaling-8b5cf6?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO">
<img src="https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge" alt="MIT License">

<br><br>

# ConnectHub

**Free, open-source video conferencing that just works.**

Create a room. Share the link. Start talking. No accounts, no downloads, no tracking.

[Get Started](#-quick-start) · [Features](#-features) · [Self-Host](#-self-hosting) · [Contribute](#-contributing) · [Report Bug](https://github.com/Tamiru-Alemnew/Connect-Hub/issues)

<br>

</div>

---

## Overview

ConnectHub is a peer-to-peer video conferencing app built from scratch with custom WebRTC signaling over Socket.IO. Video and audio flow directly between browsers — the server only coordinates connections, never touches your media.

```
Browser A ◄──── WebRTC (video/audio/data) ────► Browser B
    │                                                │
    └───── Socket.IO signaling (SDP/ICE) ─────► Server
```

<br>

## Features

| | Feature | Description |
|---|---|---|
| **Video & Audio** | HD Video Calls | Peer-to-peer media streaming with adaptive quality |
| **Chat** | Real-Time Messaging | Data channel chat with message history, read receipts |
| **Screen** | Screen Sharing | Share your entire screen or a specific window |
| **Grid** | Smart Video Grid | Dynamic layout (1→10+ participants) with smooth animations |
| **Speak** | Speaking Detection | Real-time voice activity via AudioContext, with glow indicators |
| **UI** | Premium Dark UI | Glassmorphism, ambient lighting, smooth transitions |
| **Lock** | No Sign Up | Zero accounts. Room links are the only auth |
| **Mobile** | Responsive | Fully functional on mobile with bottom-sheet panels |
| **Key** | Keyboard Shortcuts | `M` mic, `V` camera, `C` chat, `P` people, `F` fullscreen |
| **Debug** | Debug Panel | Live connection stats, ICE candidate types, peer info |

<br>

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules), EJS templates |
| **Styling** | Custom CSS with design tokens, glassmorphism, CSS animations |
| **Real-Time** | WebRTC (RTCPeerConnection, RTCDataChannel), Socket.IO |
| **Server** | Node.js, Express |
| **Signaling** | Custom protocol over Socket.IO (SDP exchange, ICE relay, room management) |

<br>

## Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org))
- **npm** (comes with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/Tamiru-Alemnew/Connect-Hub.git
cd Connect-Hub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

### 4. Open in browser

```
http://localhost:3030
```

Click **Start a Meeting** to create a room, then share the URL with others.

<br>

## Self-Hosting

### Deploy with Node.js

Any VPS or cloud platform that runs Node.js works:

```bash
git clone https://github.com/Tamiru-Alemnew/Connect-Hub.git
cd Connect-Hub
npm install --production
NODE_ENV=production PORT=3030 node src/server.js
```

Put a reverse proxy (Nginx, Caddy) in front for HTTPS — **WebRTC requires a secure context** in production.

### TURN Server (recommended for production)

Direct peer-to-peer connections fail behind strict NATs/firewalls. A TURN server relays media as a fallback.

```env
TURN_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_CREDENTIAL=your-credential
```

Popular options: [coturn](https://github.com/coturn/coturn) (self-hosted), [Twilio TURN](https://www.twilio.com/docs/stun-turn), [Metered TURN](https://www.metered.ca/tools/openrelay/).

### Deploy with Docker (coming soon)

A `Dockerfile` is planned. Contributions welcome.

<br>

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `M` | Toggle microphone |
| `V` | Toggle camera |
| `C` | Toggle chat panel |
| `P` | Toggle participants panel |
| `D` | Toggle debug panel |
| `F` | Toggle fullscreen |
| `Esc` | Close side panel |

<br>

## How It Works

### Signaling Flow

```
1. User A creates a room         → Server assigns UUID
2. User A joins the room          → Server tracks peer in room
3. User B opens the room link     → Server notifies A of new peer
4. A creates RTCPeerConnection    → A generates SDP offer
5. A sends offer via Socket.IO    → Server relays to B
6. B sets remote description      → B generates SDP answer
7. B sends answer via Socket.IO   → Server relays to A
8. ICE candidates exchanged       → Server relays both directions
9. Direct P2P connection opens    → Video/audio/data flows peer-to-peer
```

### Mesh Topology

Every participant connects directly to every other participant. For a room with N people, each peer maintains N-1 connections:

```
    A ◄────► B
    ▲ ╲    ╱ ▲
    │   ╲╱   │
    │   ╱╲   │
    ▼ ╱    ╲ ▼
    D ◄────► C
```

This works well for small groups (2–8 people). For larger meetings, an SFU architecture would be the next step.

<br>

## Contributing

Contributions are welcome and encouraged! ConnectHub is built by the community.

### Getting Started

1. **Fork** the repository
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Connect-Hub.git
   cd Connect-Hub
   ```
3. **Create a branch** for your change:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Install dependencies** and run the dev server:
   ```bash
   npm install
   npm run dev
   ```
5. **Make your changes**, then commit:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
6. **Push** to your fork and **open a Pull Request**.

### Branch Naming

| Prefix | Use Case |
|---|---|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code restructuring |
| `docs/` | Documentation changes |
| `style/` | CSS/UI changes |
| `chore/` | Tooling, config, dependencies |

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add screen recording support
fix: resolve ICE candidate race condition
docs: update self-hosting instructions
style: improve mobile control bar layout
refactor: extract peer state machine
```

### What to Work On

Check [open issues](https://github.com/Tamiru-Alemnew/Connect-Hub/issues) for things to pick up. Good first issues are labeled accordingly. Some ideas:

- **Dockerfile** for easy self-hosting
- **End-to-end encryption** for media streams
- **Virtual backgrounds** using MediaPipe or TensorFlow.js
- **Recording** with MediaRecorder API
- **Lobby/waiting room** before joining
- **SFU mode** for larger meetings (10+ participants)
- **Accessibility** improvements (screen reader support, high contrast)
- **Tests** — unit tests for signaling, integration tests for peer connections

### Code Style

- Vanilla JavaScript (no frameworks on the frontend)
- ES Modules for client-side code
- CommonJS for server-side code
- Meaningful variable names over comments
- Keep PRs focused — one feature or fix per PR

<br>

## Roadmap

- [ ] Docker support
- [ ] End-to-end encryption
- [ ] Virtual backgrounds
- [ ] Meeting recording
- [ ] Lobby / waiting room
- [ ] SFU architecture for large rooms
- [ ] PWA support
- [ ] File sharing over data channels

<br>

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute this software for any purpose.

<br>

---

<div align="center">

**Built with care by [Tamiru Alemnew](https://github.com/Tamiru-Alemnew) and contributors.**

<br>

<a href="https://github.com/Tamiru-Alemnew/Connect-Hub">
  <img src="https://img.shields.io/badge/Star_on-GitHub-6366f1?style=for-the-badge&logo=github&logoColor=white" alt="Star on GitHub">
</a>

</div>
