/* INÍCIO DA CALCULADORA DE TOLERÂNCIA */
(() => {
  "use strict";

  const form = document.querySelector("#tolerance-form");
  const result = document.querySelector("#tolerance-result");
  const statusOutput = document.querySelector("#tolerance-status");
  const detailsOutput = document.querySelector("#tolerance-details");
  const rangeOutput = document.querySelector("#tolerance-range");
  const i18n = window.SiteI18n;

  if (!form || !result || !statusOutput || !detailsOutput || !rangeOutput || !i18n) {
    return;
  }

  const formatNumber = (value) => new Intl.NumberFormat(i18n.locale, {
    maximumFractionDigits: 6
  }).format(value);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const nominal = Number(form.elements.namedItem("nominal-value").value);
    const measured = Number(form.elements.namedItem("measured-value").value);
    const lowerTolerance = Number(form.elements.namedItem("lower-tolerance").value);
    const upperTolerance = Number(form.elements.namedItem("upper-tolerance").value);

    if (lowerTolerance < 0 || upperTolerance < 0) {
      return;
    }

    const lowerLimit = nominal - lowerTolerance;
    const upperLimit = nominal + upperTolerance;
    const approved = measured >= lowerLimit && measured <= upperLimit;
    const deviation = measured - nominal;

    statusOutput.textContent = i18n.t(approved ? "tolerance.approved" : "tolerance.rejected");
    statusOutput.classList.toggle("is-error", !approved);
    detailsOutput.textContent = i18n.t("tolerance.details", {
      measured: formatNumber(measured),
      deviation: `${deviation > 0 ? "+" : ""}${formatNumber(deviation)}`
    });
    rangeOutput.textContent = i18n.t("tolerance.range", {
      lower: formatNumber(lowerLimit),
      upper: formatNumber(upperLimit)
    });
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
})();
/* FIM DA CALCULADORA DE TOLERÂNCIA */
