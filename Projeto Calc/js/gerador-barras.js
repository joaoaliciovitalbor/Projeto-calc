/* INÍCIO DO GERADOR DE CÓDIGO DE BARRAS */
(() => {
  "use strict";

  const form = document.querySelector("#barcode-form");
  const formatSelect = document.querySelector("#barcode-format");
  const valueInput = document.querySelector("#barcode-value");
  const hint = document.querySelector("#barcode-hint");
  const errorOutput = document.querySelector("#barcode-error");
  const result = document.querySelector("#barcode-result");
  const canvas = document.querySelector("#barcode-canvas");
  const downloadButton = document.querySelector("#download-barcode");
  const i18n = window.SiteI18n;
  let lastErrorKey = "";

  if (!form || !formatSelect || !valueInput || !hint || !errorOutput || !result || !canvas || !downloadButton || !i18n) {
    return;
  }

  const eanCheckDigit = (digits) => {
    const weightedSum = digits
      .split("")
      .reduce((sum, digit, index) => sum + (Number(digit) * (index % 2 === 0 ? 1 : 3)), 0);
    return String((10 - (weightedSum % 10)) % 10);
  };

  const isValidEan13 = (value) => /^\d{13}$/.test(value) && eanCheckDigit(value.slice(0, 12)) === value[12];

  const updateHint = () => {
    const isEan = formatSelect.value === "EAN13";
    valueInput.inputMode = isEan ? "numeric" : "text";
    valueInput.maxLength = isEan ? 13 : 80;
    hint.textContent = isEan
      ? i18n.t("EAN-13 accepts 12 digits (the check digit is calculated) or 13 digits with a check digit.")
      : i18n.t("Code128 accepts letters, numbers, and other printable characters.");
  };

  const showError = (key) => {
    lastErrorKey = key;
    errorOutput.textContent = i18n.t(key);
    result.hidden = true;
    downloadButton.disabled = true;
  };

  formatSelect.addEventListener("change", updateHint);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    if (typeof window.JsBarcode !== "function") {
      showError("barcode.libraryMissing");
      return;
    }

    const format = formatSelect.value;
    let value = valueInput.value.trim();
    if (format === "EAN13") {
      if (!/^\d{12,13}$/.test(value)) {
        showError("barcode.eanLength");
        return;
      }
      if (value.length === 12) {
        value += eanCheckDigit(value);
      } else if (!isValidEan13(value)) {
        showError("barcode.eanCheck");
        return;
      }
    }

    try {
      window.JsBarcode(canvas, value, {
        format,
        displayValue: true,
        height: 90,
        margin: 12,
        background: "#ffffff",
        lineColor: "#172033"
      });
    } catch (error) {
      showError("barcode.generateFailure");
      return;
    }

    lastErrorKey = "";
    errorOutput.textContent = "";
    result.hidden = false;
    downloadButton.disabled = false;
  });

  downloadButton.addEventListener("click", () => {
    if (canvas.width === 0 || canvas.height === 0) {
      showError("barcode.downloadFirst");
      return;
    }
    const link = document.createElement("a");
    link.download = "codigo-de-barras.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  document.addEventListener("site-language-change", () => {
    updateHint();
    if (lastErrorKey) {
      errorOutput.textContent = i18n.t(lastErrorKey);
    } else if (!result.hidden) {
      if (form.checkValidity()) {
        form.requestSubmit();
      } else {
        result.hidden = true;
      }
    }
  });

  updateHint();
})();
/* FIM DO GERADOR DE CÓDIGO DE BARRAS */
