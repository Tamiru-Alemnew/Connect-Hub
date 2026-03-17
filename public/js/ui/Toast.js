export class Toast {
  static show(message, type = "info", duration = 4000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const icons = {
      info: "fa-info-circle",
      success: "fa-check-circle",
      warning: "fa-exclamation-triangle",
      error: "fa-times-circle",
    };

    const toast = document.createElement("div");
    toast.className = "toast";

    toast.innerHTML = `
      <div class="toast__icon-wrapper toast__icon-wrapper--${type}">
        <i class="fas ${icons[type] || icons.info}"></i>
      </div>
      <div class="toast__text">${message}</div>
      <div class="toast__progress">
        <div class="toast__progress-bar toast__progress-bar--${type}"></div>
      </div>
    `;

    container.appendChild(toast);

    const totalDuration = Math.max(duration, 800);
    const progressBar = toast.querySelector(".toast__progress-bar");
    if (progressBar) {
      progressBar.style.animationDuration = `${totalDuration}ms`;
    }

    setTimeout(() => {
      toast.classList.add("toast--dismissing");
      setTimeout(() => toast.remove(), 250);
    }, totalDuration - 250);
  }
}
