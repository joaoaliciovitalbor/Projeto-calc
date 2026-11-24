/* Percentage calculator */
(() => {
  "use strict";

  const form = document.querySelector("#percentage-form");
  const result = document.querySelector("#percentage-result");
  const output = document.querySelector("#percentage-output");
  const i18n = window.SiteI18n;

  if (!form || !result || !output || !i18n) {
    return;
  }

  const numberFormat = new Intl.NumberFormat(i18n.locale, {
    maximumFractionDigits: 4
  });

  const calculate = () => {
    if (!form.checkValidity()) {
      result.hidden = true;
      return;
    }

    const operation = form.elements.namedItem("operation").value;
    const percentage = Number(form.elements.namedItem("percentage").value);
    const base = Number(form.elements.namedItem("base").value);
    const fraction = percentage / 100;
    let value;
    let message;

    if (operation === "increase") {
      value = base * (1 + fraction);
      message = "percentage.increase";
    } else if (operation === "decrease") {
      value = base * (1 - fraction);
      message = "percentage.decrease";
    } else {
      value = base * fraction;
      message = "percentage.of";
    }

    if (!Number.isFinite(value)) {
      return;
    }

    output.textContent = i18n.t(message, {
      percent: numberFormat.format(percentage),
      base: numberFormat.format(base),
      result: numberFormat.format(value)
    });
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
