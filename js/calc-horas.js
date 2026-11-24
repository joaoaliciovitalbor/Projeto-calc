/* INÍCIO DA CALCULADORA DE HORAS */
(() => {
  "use strict";

  const form = document.querySelector("#hours-form");
  const result = document.querySelector("#hours-result");
  const workedOutput = document.querySelector("#hours-worked");
  const balanceOutput = document.querySelector("#hours-balance");
  const copyButton = document.querySelector("#copy-hours");
  const copyFeedback = document.querySelector("#copy-feedback");
  const i18n = window.SiteI18n;
  let latestSummary = "";

  if (!form || !result || !workedOutput || !balanceOutput || !copyButton || !copyFeedback || !i18n) {
    return;
  }

  const toMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours * 60) + minutes;
  };

  const formatDuration = (minutes) => {
    const absoluteMinutes = Math.abs(minutes);
    const hours = Math.floor(absoluteMinutes / 60);
    const remainder = absoluteMinutes % 60;
    return i18n.t("duration", {
      hours,
      minutes: String(remainder).padStart(2, "0")
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const start = toMinutes(form.elements.namedItem("start-time").value);
    let end = toMinutes(form.elements.namedItem("end-time").value);
    const breakMinutes = Number(form.elements.namedItem("break-minutes").value);
    const expected = toMinutes(form.elements.namedItem("expected-hours").value);

    if (end < start) {
      end += 24 * 60;
    }

    const elapsed = end - start;
    if (breakMinutes > elapsed) {
      form.elements.namedItem("break-minutes").setCustomValidity(i18n.t("hours.breakTooLong"));
      form.reportValidity();
      form.elements.namedItem("break-minutes").setCustomValidity("");
      return;
    }

    const worked = elapsed - breakMinutes;
    const balance = worked - expected;
    const sign = balance > 0 ? "+" : balance < 0 ? "−" : "";
    const balanceText = `${sign}${formatDuration(balance)}`;

    workedOutput.textContent = i18n.t("hours.worked", {
      worked: formatDuration(worked),
      expected: formatDuration(expected)
    });
    balanceOutput.textContent = i18n.t("hours.balance", { balance: balanceText });
    latestSummary = `${workedOutput.textContent} ${balanceOutput.textContent}`;
    copyFeedback.textContent = "";
    result.hidden = false;
  });

  document.addEventListener("site-language-change", () => {
    if (!result.hidden) {
      if (form.checkValidity()) {
        form.requestSubmit();
      } else {
        result.hidden = true;
      }
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!latestSummary) {
      return;
    }
    try {
      await navigator.clipboard.writeText(latestSummary);
      copyFeedback.textContent = i18n.t("copy.success");
    } catch (error) {
      copyFeedback.textContent = i18n.t("copy.failure");
    }
  });
})();
/* FIM DA CALCULADORA DE HORAS */
