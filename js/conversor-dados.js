/* INÍCIO DO CONVERSOR DE TEXTO E DADOS */
(() => {
  "use strict";

  const form = document.querySelector("#text-form");
  const source = document.querySelector("#source-text");
  const output = document.querySelector("#result-text");
  const feedback = document.querySelector("#text-feedback");
  const actionButtons = document.querySelectorAll("[data-action]");
  const i18n = window.SiteI18n;
  let latestFeedbackKey = "";

  if (!form || !source || !output || !feedback || actionButtons.length === 0 || !i18n) {
    return;
  }

  const csvEscape = (value) => `"${value.replace(/"/g, '""')}"`;
  const setFeedback = (key) => {
    latestFeedbackKey = key;
    feedback.textContent = i18n.t(key);
  };

  const exportCsv = (text) => {
    const rows = text.split(/\r?\n/).map(csvEscape);
    const blob = new Blob(["\uFEFF", rows.join("\r\n")], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lista.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const inputText = source.value;
      let convertedText = inputText;

      if (action === "remove-duplicates") {
        const seen = new Set();
        convertedText = inputText
          .split(/\r?\n/)
          .filter((line) => {
            const key = line.trim();
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          })
          .join("\n");
        output.value = convertedText;
        setFeedback("text.duplicatesRemoved");
      } else if (action === "uppercase") {
        convertedText = inputText.toLocaleUpperCase(i18n.locale);
        output.value = convertedText;
        setFeedback("text.uppercase");
      } else if (action === "lowercase") {
        convertedText = inputText.toLocaleLowerCase(i18n.locale);
        output.value = convertedText;
        setFeedback("text.lowercase");
      } else if (action === "export-csv") {
        convertedText = output.value || inputText;
        if (!convertedText) {
          setFeedback("text.emptyExport");
          return;
        }
        exportCsv(convertedText);
        setFeedback("text.csvExported");
      }
    });
  });

  document.addEventListener("site-language-change", () => {
    if (latestFeedbackKey) {
      feedback.textContent = i18n.t(latestFeedbackKey);
    }
  });
})();
/* FIM DO CONVERSOR DE TEXTO E DADOS */
