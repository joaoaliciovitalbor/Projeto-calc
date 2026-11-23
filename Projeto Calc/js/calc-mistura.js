/* INÍCIO DA CALCULADORA DE PROPORÇÃO E MISTURA */
(() => {
  "use strict";

  const form = document.querySelector("#mix-form");
  const result = document.querySelector("#mix-result");
  const componentsOutput = document.querySelector("#mix-components");
  const costOutput = document.querySelector("#mix-cost");
  const i18n = window.SiteI18n;

  if (!form || !result || !componentsOutput || !costOutput || !i18n) {
    return;
  }

  const formatNumber = (value, maximumFractionDigits = 3) => new Intl.NumberFormat(i18n.locale, {
    maximumFractionDigits
  }).format(value);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const total = Number(form.elements.namedItem("total-volume").value);
    const unit = form.elements.namedItem("volume-unit").value;
    const diluentParts = Number(form.elements.namedItem("ratio-parts").value);
    const concentrateCost = Number(form.elements.namedItem("concentrate-cost").value);
    const totalParts = 1 + diluentParts;
    const concentrate = total / totalParts;
    const diluent = total - concentrate;
    const litersPerUnit = unit === "mL" ? 1000 : 1;
    const costPerFinishedLiter = (concentrateCost / totalParts);
    const currency = new Intl.NumberFormat(i18n.locale, {
      style: "currency",
      currency: "BRL"
    });

    componentsOutput.textContent = i18n.t("mix.components", {
      concentrate: formatNumber(concentrate),
      diluent: formatNumber(diluent),
      unit,
      parts: formatNumber(diluentParts)
    });
    costOutput.textContent = i18n.t("mix.cost", {
      cost: currency.format(costPerFinishedLiter)
    });
    if (unit === "mL") {
      componentsOutput.textContent += ` ${i18n.t("mix.equivalent", {
        concentrate: formatNumber(concentrate / litersPerUnit, 4),
        diluent: formatNumber(diluent / litersPerUnit, 4)
      })}`;
    }
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
/* FIM DA CALCULADORA DE PROPORÇÃO E MISTURA */
