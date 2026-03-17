export class ChatPanel {
  constructor() {
    this.messagesContainer = document.getElementById("chatMessages");
    this.input = document.getElementById("chatInput");
    this.sendBtn = document.getElementById("chatSendBtn");
    this.badge = document.getElementById("chatBadge");
    this.notification = document.getElementById("chatNotification");
    this.unreadCount = 0;
    this.isPanelVisible = false;
    this.onSendMessage = null;
    this.localDisplayName = "You";
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.input) {
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
    }
    if (this.sendBtn) {
      this.sendBtn.addEventListener("click", () => this.handleSend());
    }
  }

  handleSend() {
    if (!this.input) return;
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = "";
    if (this.onSendMessage) this.onSendMessage(text);
    this.addMessage(this.localDisplayName || "You", text, true);
  }

  setLocalDisplayName(name) {
    this.localDisplayName = name || "You";
  }

  addMessage(sender, text, isOwn = false) {
    if (!this.messagesContainer) return;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const messageEl = document.createElement("div");
    messageEl.className = "chat-message" + (isOwn ? " chat-message--own" : "");

    messageEl.innerHTML = `
      <span class="chat-message__sender">${this.escapeHtml(sender)}</span>
      <div class="chat-message__body">${this.escapeHtml(text)}</div>
      <span class="chat-message__time">${time}</span>
    `;

    this.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();

    if (!isOwn && !this.isPanelVisible) {
      this.incrementUnread();
    }
  }

  addSystemMessage(text) {
    if (!this.messagesContainer) return;
    const messageEl = document.createElement("div");
    messageEl.className = "chat-message chat-message--system";
    messageEl.innerHTML = `<span>${this.escapeHtml(text)}</span>`;
    this.messagesContainer.appendChild(messageEl);
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (!this.messagesContainer) return;
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  incrementUnread() {
    this.unreadCount += 1;
    if (this.badge) {
      this.badge.textContent = String(this.unreadCount);
      this.badge.style.display = "inline-flex";
    }
    if (this.notification) {
      this.notification.textContent = String(this.unreadCount);
      this.notification.style.display = "flex";
    }
  }

  clearUnread() {
    this.unreadCount = 0;
    if (this.badge) {
      this.badge.style.display = "none";
    }
    if (this.notification) {
      this.notification.style.display = "none";
    }
  }

  setPanelVisible(visible) {
    this.isPanelVisible = visible;
    if (visible) {
      this.clearUnread();
      if (this.input) this.input.focus();
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
