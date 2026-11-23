/* Spreadsheet, text and pricing utilities */
(() => {
  "use strict";

  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  if (!i18n) {
    return;
  }

  const markupForm = document.querySelector("#markup-form");
  if (markupForm) {
    const result = document.querySelector("#markup-result");
    const priceOutput = document.querySelector("#markup-price");
    const profitOutput = document.querySelector("#markup-profit");
    const marginOutput = document.querySelector("#markup-margin");
    const currency = () => new Intl.NumberFormat(i18n.locale, {
      style: "currency",
      currency: "BRL"
    });

    markupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!markupForm.reportValidity()) {
        return;
      }

      const cost = Number(markupForm.elements.namedItem("cost").value);
      const markupRate = Number(markupForm.elements.namedItem("markup-rate").value) / 100;
      const feeRate = Number(markupForm.elements.namedItem("fee-rate").value) / 100;
      const salePrice = (cost * (1 + markupRate)) / (1 - feeRate);
      const netProfit = salePrice * (1 - feeRate) - cost;
      const netMargin = salePrice === 0 ? 0 : netProfit / salePrice * 100;

      priceOutput.textContent = i18n.t("markup.salePrice", { value: currency().format(salePrice) });
      profitOutput.textContent = i18n.t("markup.netProfit", { value: currency().format(netProfit) });
      marginOutput.textContent = i18n.t("markup.netMargin", {
        value: new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 2 }).format(netMargin)
      });
      result.hidden = false;
    });

    document.addEventListener("site-language-change", () => {
      if (!result.hidden && markupForm.checkValidity()) {
        markupForm.requestSubmit();
      }
    });
  }

  const counterInput = document.querySelector("#character-counter-input");
  if (counterInput) {
    const outputs = {
      characters: document.querySelector("#character-count"),
      noSpaces: document.querySelector("#character-count-no-spaces"),
      words: document.querySelector("#word-count"),
      lines: document.querySelector("#line-count"),
      paragraphs: document.querySelector("#paragraph-count"),
      bytes: document.querySelector("#byte-count")
    };

    const updateCounts = () => {
      const value = counterInput.value;
      const characters = Array.from(value).length;
      const nonWhitespaceCharacters = Array.from(value.replace(/\s/gu, "")).length;
      const words = value.match(/\S+/gu) || [];
      const lines = value ? value.split(/\r\n|\r|\n/).length : 0;
      const paragraphs = value.trim() ? value.trim().split(/(?:\r\n|\r|\n)\s*(?:\r\n|\r|\n)+/u).length : 0;
      const bytes = new TextEncoder().encode(value).length;

      outputs.characters.textContent = String(characters);
      outputs.noSpaces.textContent = String(nonWhitespaceCharacters);
      outputs.words.textContent = String(words.length);
      outputs.lines.textContent = String(lines);
      outputs.paragraphs.textContent = String(paragraphs);
      outputs.bytes.textContent = String(bytes);
    };

    counterInput.addEventListener("input", updateCounts);
    updateCounts();
  }

  const formulaForm = document.querySelector("#formula-form");
  if (formulaForm) {
    const typeSelect = document.querySelector("#formula-type");
    const rangeInput = document.querySelector("#formula-range");
    const referenceInput = document.querySelector("#formula-reference");
    const criterionInput = document.querySelector("#formula-criterion");
    const rangeGroup = document.querySelector("#formula-range-group");
    const referenceGroup = document.querySelector("#formula-reference-group");
    const criterionGroup = document.querySelector("#formula-criterion-group");
    const output = document.querySelector("#formula-output");
    const feedback = document.querySelector("#formula-feedback");
    const copyButton = document.querySelector("#formula-copy");

    const updateFormulaFields = () => {
      const type = typeSelect.value;
      const needsRange = ["sum", "average", "countif", "sumif"].includes(type);
      const needsReference = ["percentage", "percent-change", "if", "sumif"].includes(type);
      const needsCriterion = ["countif", "sumif"].includes(type);
      rangeGroup.hidden = !needsRange && !["percentage", "percent-change", "if"].includes(type);
      referenceGroup.hidden = !needsReference;
      criterionGroup.hidden = !needsCriterion;
      rangeInput.required = !rangeGroup.hidden;
      referenceInput.required = needsReference;
      criterionInput.required = needsCriterion;
      rangeInputLabel.textContent = i18n.t(type === "percentage" || type === "percent-change" || type === "if"
        ? "formula.firstCell"
        : "formula.range");
    };

    const rangeInputLabel = document.querySelector("#formula-range-label");
    const buildFormula = () => {
      const type = typeSelect.value;
      const range = rangeInput.value.trim().toUpperCase();
      const reference = referenceInput.value.trim().toUpperCase();
      const criterion = criterionInput.value.replace(/"/g, '""');
      const semicolon = i18n.language === "pt" ? ";" : ",";
      const names = i18n.language === "pt"
        ? { sum: "SOMA", average: "MÉDIA", if: "SE", countif: "CONT.SE", sumif: "SOMASE" }
        : { sum: "SUM", average: "AVERAGE", if: "IF", countif: "COUNTIF", sumif: "SUMIF" };
      const cellPattern = /^\$?[A-Z]{1,3}\$?\d+$/;
      const rangePattern = /^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+$/;

      if (["sum", "average", "countif", "sumif"].includes(type) ? !rangePattern.test(range) : !cellPattern.test(range)) {
        throw new Error("formula.invalidCell");
      }
      const referenceValid = type === "sumif"
        ? rangePattern.test(reference)
        : cellPattern.test(reference);
      if (["percentage", "percent-change", "if", "sumif"].includes(type) && !referenceValid) {
        throw new Error("formula.invalidCell");
      }
      if (["countif", "sumif"].includes(type) && !criterion) {
        throw new Error("formula.criterionRequired");
      }

      if (type === "sum" || type === "average") {
        return `=${names[type]}(${range})`;
      }
      if (type === "percentage") {
        return `=${range}*${reference}%`;
      }
      if (type === "percent-change") {
        return `=(${reference}-${range})/${range}`;
      }
      if (type === "if") {
        return `=${names.if}(${range}>=${reference}${semicolon}"Yes"${semicolon}"No")`;
      }
      if (type === "countif") {
        return `=${names.countif}(${range}${semicolon}"${criterion}")`;
      }
      return `=${names.sumif}(${range}${semicolon}"${criterion}"${semicolon}${reference})`;
    };

    typeSelect.addEventListener("change", updateFormulaFields);
    updateFormulaFields();

    formulaForm.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        output.value = buildFormula();
        feedback.textContent = i18n.t("formula.ready");
      } catch (error) {
        feedback.textContent = i18n.t(error instanceof Error && error.message.startsWith("formula.")
          ? error.message
          : "formula.failed");
      }
    });

    copyButton.addEventListener("click", async () => {
      if (!output.value) {
        return;
      }
      try {
        await navigator.clipboard.writeText(output.value);
        feedback.textContent = i18n.t("formula.copied");
      } catch (error) {
        feedback.textContent = i18n.t("formula.copyFailed");
      }
    });

    document.addEventListener("site-language-change", () => {
      updateFormulaFields();
      if (output.value) {
        try {
          output.value = buildFormula();
        } catch (error) {
          output.value = "";
        }
      }
    });
  }

  const csvForm = document.querySelector("#csv-table-form");
  if (csvForm && fileTools) {
    const sourceInput = document.querySelector("#csv-table-source");
    const delimiterSelect = document.querySelector("#csv-table-delimiter");
    const headerCheckbox = document.querySelector("#csv-table-header");
    const result = document.querySelector("#csv-table-result");
    const status = document.querySelector("#csv-table-status");
    const preview = document.querySelector("#csv-table-preview");
    const downloadButton = document.querySelector("#csv-table-download");
    let downloadableHtml = "";
    let latestStatus = "";
    let latestStatusValues = {};

    const setStatus = (key, values = {}) => {
      latestStatus = key;
      latestStatusValues = values;
      status.textContent = i18n.t(key, values);
    };

    const detectDelimiter = (text) => {
      const firstLine = text.split(/\r\n|\r|\n/u).find((line) => line.trim()) || "";
      const candidates = [",", ";", "\t"];
      let selected = ",";
      let maximumCount = -1;
      candidates.forEach((candidate) => {
        let insideQuotes = false;
        let count = 0;
        for (let index = 0; index < firstLine.length; index += 1) {
          if (firstLine[index] === '"') {
            if (insideQuotes && firstLine[index + 1] === '"') {
              index += 1;
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (!insideQuotes && firstLine[index] === candidate) {
            count += 1;
          }
        }
        if (count > maximumCount) {
          selected = candidate;
          maximumCount = count;
        }
      });
      return selected;
    };

    const parseCsv = (text, delimiter) => {
      const rows = [];
      let row = [];
      let field = "";
      let insideQuotes = false;
      const input = text.replace(/^\uFEFF/u, "");

      for (let index = 0; index < input.length; index += 1) {
        const character = input[index];
        if (character === '"') {
          if (insideQuotes && input[index + 1] === '"') {
            field += '"';
            index += 1;
          } else if (insideQuotes) {
            insideQuotes = false;
          } else if (!field) {
            insideQuotes = true;
          } else {
            field += character;
          }
        } else if (character === delimiter && !insideQuotes) {
          row.push(field);
          field = "";
        } else if ((character === "\n" || character === "\r") && !insideQuotes) {
          row.push(field);
          if (row.some((cell) => cell !== "")) {
            rows.push(row);
          }
          row = [];
          field = "";
          if (character === "\r" && input[index + 1] === "\n") {
            index += 1;
          }
        } else {
          field += character;
        }
      }

      if (insideQuotes) {
        throw new Error("csvTable.unclosedQuote");
      }
      row.push(field);
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      if (rows.length === 0) {
        throw new Error("csvTable.empty");
      }
      const columnCount = Math.max(...rows.map((currentRow) => currentRow.length));
      return rows.map((currentRow) => currentRow.concat(Array(columnCount - currentRow.length).fill("")));
    };

    const escapeHtml = (value) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const renderTable = (rows, hasHeader, delimiter) => {
      const table = document.createElement("table");
      table.className = "data-preview-table";
      const caption = document.createElement("caption");
      caption.textContent = i18n.t("csvTable.caption", {
        rows: rows.length - (hasHeader ? 1 : 0),
        columns: rows[0].length
      });
      table.append(caption);

      let dataRows = rows;
      if (hasHeader) {
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        rows[0].forEach((value) => {
          const cell = document.createElement("th");
          cell.scope = "col";
          cell.textContent = value;
          headerRow.append(cell);
        });
        thead.append(headerRow);
        table.append(thead);
        dataRows = rows.slice(1);
      }

      const tbody = document.createElement("tbody");
      dataRows.forEach((currentRow) => {
        const rowElement = document.createElement("tr");
        currentRow.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          rowElement.append(cell);
        });
        tbody.append(rowElement);
      });
      table.append(tbody);
      preview.replaceChildren(table);

      const header = hasHeader ? rows[0] : rows[0].map((_, index) => `Column ${index + 1}`);
      const bodyRows = hasHeader ? rows.slice(1) : rows;
      const htmlRows = [header, ...bodyRows].map((currentRow, index) => {
        const tag = hasHeader && index === 0 ? "th" : "td";
        const cells = currentRow.map((value) => `<${tag}>${escapeHtml(value)}</${tag}>`).join("");
        return `<tr>${cells}</tr>`;
      }).join("\n");
      downloadableHtml = `<!doctype html>\n<html lang="${i18n.language === "pt" ? "pt-BR" : "en"}">\n<head>\n<meta charset="utf-8">\n<title>${escapeHtml(i18n.t("csvTable.exportTitle"))}</title>\n</head>\n<body>\n<table>\n${htmlRows}\n</table>\n</body>\n</html>`;
      downloadButton.hidden = false;
      setStatus("csvTable.converted", {
        rows: bodyRows.length,
        columns: rows[0].length,
        delimiter: delimiter === "\t" ? "TAB" : delimiter
      });
    };

    csvForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = sourceInput.value;
      if (!text.trim()) {
        result.hidden = false;
        downloadButton.hidden = true;
        setStatus("csvTable.empty");
        return;
      }
      if (new TextEncoder().encode(text).length > 5 * 1024 * 1024) {
        result.hidden = false;
        downloadButton.hidden = true;
        setStatus("csvTable.fileLimit");
        return;
      }

      try {
        const delimiter = delimiterSelect.value === "auto"
          ? detectDelimiter(text)
          : delimiterSelect.value === "tab"
            ? "\t"
            : delimiterSelect.value;
        const rows = parseCsv(text, delimiter);
        renderTable(rows, headerCheckbox.checked, delimiter);
        result.hidden = false;
      } catch (error) {
        result.hidden = false;
        downloadButton.hidden = true;
        preview.replaceChildren();
        setStatus(error instanceof Error && error.message === "csvTable.unclosedQuote"
          ? error.message
          : "csvTable.failed");
      }
    });

    downloadButton.addEventListener("click", () => {
      if (downloadableHtml) {
        fileTools.downloadBlob(
          new Blob([downloadableHtml], { type: "text/html;charset=utf-8" }),
          "converted-table.html"
        );
        setStatus("csvTable.downloaded");
      }
    });

    document.addEventListener("site-language-change", () => {
      if (latestStatus) {
        setStatus(latestStatus, latestStatusValues);
      }
      if (sourceInput.value.trim() && !result.hidden) {
        csvForm.requestSubmit();
      }
      downloadButton.textContent = i18n.t("csvTable.download");
    });
  }
})();
