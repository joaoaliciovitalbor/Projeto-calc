/* Pomodoro focus timer */
(() => {
  "use strict";

  const settings = document.querySelector("#pomodoro-settings");
  const display = document.querySelector("#timer-display");
  const status = document.querySelector("#timer-status");
  const startButton = document.querySelector("#timer-start");
  const pauseButton = document.querySelector("#timer-pause");
  const resetButton = document.querySelector("#timer-reset");
  const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
  const i18n = window.SiteI18n;

  if (!settings || !display || !status || !startButton || !pauseButton || !resetButton || modeButtons.length !== 2 || !i18n) {
    return;
  }

  let mode = "focus";
  let remainingSeconds = null;
  let deadline = 0;
  let intervalId = null;
  let statusKey = "Ready when you are.";

  const showStatus = (key) => {
    statusKey = key;
    status.textContent = i18n.t(key);
  };

  const durationForMode = () => {
    const field = mode === "focus" ? "focus" : "break";
    return Number(settings.elements.namedItem(field).value) * 60;
  };

  const renderTime = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    display.textContent = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  const stopInterval = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const updateModeButtons = () => {
    modeButtons.forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("button-secondary", !selected);
    });
  };

  const setMode = (nextMode) => {
    stopInterval();
    mode = nextMode;
    remainingSeconds = null;
    renderTime(durationForMode());
    startButton.disabled = false;
    pauseButton.disabled = true;
    showStatus(mode === "focus" ? "pomodoro.focusSet" : "pomodoro.breakSet");
    updateModeButtons();
  };

  const tick = () => {
    remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    renderTime(remainingSeconds);

    if (remainingSeconds === 0) {
      stopInterval();
      startButton.disabled = false;
      pauseButton.disabled = true;
      showStatus(mode === "focus" ? "pomodoro.focusComplete" : "pomodoro.breakComplete");
    }
  };

  startButton.addEventListener("click", () => {
    if (!settings.reportValidity()) {
      return;
    }
    if (intervalId !== null) {
      return;
    }

    if (remainingSeconds === null || remainingSeconds === 0) {
      remainingSeconds = durationForMode();
    }

    deadline = Date.now() + (remainingSeconds * 1000);
    startButton.disabled = true;
    pauseButton.disabled = false;
    showStatus("pomodoro.running");
    tick();
    if (remainingSeconds > 0) {
      intervalId = window.setInterval(tick, 250);
    }
  });

  pauseButton.addEventListener("click", () => {
    if (intervalId === null) {
      return;
    }

    remainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    stopInterval();
    renderTime(remainingSeconds);
    startButton.disabled = false;
    pauseButton.disabled = true;
    showStatus("pomodoro.paused");
  });

  resetButton.addEventListener("click", () => {
    stopInterval();
    remainingSeconds = null;
    renderTime(durationForMode());
    startButton.disabled = false;
    pauseButton.disabled = true;
    showStatus("pomodoro.reset");
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mode !== mode) {
        setMode(button.dataset.mode);
      }
    });
  });

  settings.addEventListener("change", () => {
    if (!settings.checkValidity()) {
      return;
    }
    if (intervalId === null) {
      remainingSeconds = null;
      renderTime(durationForMode());
      showStatus(mode === "focus" ? "pomodoro.focusSet" : "pomodoro.breakSet");
    }
  });

  document.addEventListener("site-language-change", () => {
    status.textContent = i18n.t(statusKey);
    if (intervalId === null && remainingSeconds === null) {
      renderTime(durationForMode());
    }
    updateModeButtons();
  });

  renderTime(durationForMode());
  updateModeButtons();
})();
