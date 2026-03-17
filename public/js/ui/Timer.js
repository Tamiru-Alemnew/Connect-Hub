export class MeetingTimer {
  constructor() {
    this.display = document.getElementById("meetingTimer");
    this.startTime = Date.now();
    this.interval = null;
  }

  start() {
    this.startTime = Date.now();
    this.interval = setInterval(() => this.update(), 1000);
  }

  update() {
    const elapsed = Date.now() - this.startTime;
    const hours = Math.floor(elapsed / 3_600_000)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((elapsed % 3_600_000) / 60_000)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor((elapsed % 60_000) / 1000)
      .toString()
      .padStart(2, "0");

    if (this.display) {
      this.display.textContent = `${hours}:${minutes}:${seconds}`;
    }

    const timeEl = document.getElementById("controlBarTime");
    if (timeEl) {
      timeEl.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}

