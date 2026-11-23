/* Calendar date calculator */
(() => {
  "use strict";

  const form = document.querySelector("#date-add-form");
  const dateInput = document.querySelector("#base-date");
  const result = document.querySelector("#date-add-result");
  const output = document.querySelector("#date-add-output");
  const i18n = window.SiteI18n;

  if (!form || !dateInput || !result || !output || !i18n) {
    return;
  }

  const localToday = new Date();
  dateInput.value = [
    localToday.getFullYear(),
    String(localToday.getMonth() + 1).padStart(2, "0"),
    String(localToday.getDate()).padStart(2, "0")
  ].join("-");

  const calculate = () => {
    if (!form.checkValidity()) {
      result.hidden = true;
      return;
    }

    const dayCount = Number(form.elements.namedItem("days").value);
    const direction = form.elements.namedItem("direction").value;
    const [year, month, day] = dateInput.value.split("-").map(Number);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCDate(date.getUTCDate() + (direction === "subtract" ? -dayCount : dayCount));

    if (Number.isNaN(date.getTime()) || date.getUTCFullYear() > 9999 || date.getUTCFullYear() < 1) {
      form.elements.namedItem("days").setCustomValidity(i18n.t("date.outOfRange"));
      form.reportValidity();
      form.elements.namedItem("days").setCustomValidity("");
      result.hidden = true;
      return;
    }

    const formattedDate = new Intl.DateTimeFormat(i18n.locale, {
      timeZone: "UTC",
      dateStyle: "long"
    }).format(date);
    output.textContent = i18n.t("date.result", { date: formattedDate });
    result.hidden = false;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (form.reportValidity()) {
      calculate();
    }
  });

  document.addEventListener("site-language-change", () => {
    if (!result.hidden) {
      calculate();
    }
  });
})();
