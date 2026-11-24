/* Spreadsheet and tabular data conversion */
(() => {
  "use strict";

  const form = document.querySelector("#spreadsheet-form");
  const fileInput = document.querySelector("#spreadsheet-file");
  const formatSelect = document.querySelector("#spreadsheet-format");
  const result = document.querySelector("#spreadsheet-result");
  const status = document.querySelector("#spreadsheet-status");
  const downloadButton = document.querySelector("#spreadsheet-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  let outputBlob = null;
  let outputName = "";
  let statusKey = "";
  let statusValues = {};

  if (!form || !fileInput || !formatSelect || !result || !status || !downloadButton || !submitButton || !i18n || !fileTools) {
    return;
  }

  const showStatus = (key, values = {}) => {
    statusKey = key;
    statusValues = values;
    status.textContent = i18n.t(key, values);
  };

  const jsonToWorkbook = (text) => {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw new Error("spreadsheet.jsonArray");
    }

    const worksheet = data.length > 0 && data.every((row) => row && typeof row === "object" && !Array.isArray(row))
      ? window.XLSX.utils.json_to_sheet(data)
      : window.XLSX.utils.aoa_to_sheet(data);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    return workbook;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const file = fileInput.files[0];
    if (!file || file.size > 25 * 1024 * 1024) {
      result.hidden = false;
      downloadButton.hidden = true;
      showStatus("file.invalidSpreadsheetSize");
      return;
    }
    result.hidden = false;
    downloadButton.hidden = true;
    showStatus("file.loadingLibraries");
    submitButton.disabled = true;

    try {
      if (!window.XLSX) {
        await fileTools.loadLibrary("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js");
      }
      if (!window.XLSX) {
        throw new Error("file.librariesMissing");
      }

      showStatus("spreadsheet.processing");
      const inputExtension = file.name.split(".").pop().toLowerCase();
      let workbook;
      if (inputExtension === "json") {
        workbook = jsonToWorkbook(await file.text());
      } else {
        workbook = window.XLSX.read(await file.arrayBuffer(), {
          type: "array",
          cellDates: true
        });
      }

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName || !workbook.Sheets[firstSheetName]) {
        throw new Error("spreadsheet.empty");
      }

      const sheet = workbook.Sheets[firstSheetName];
      const format = formatSelect.value;
      let content;
      let mimeType;
      let extension;

      if (format === "xlsx") {
        const convertedWorkbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(convertedWorkbook, sheet, "Data");
        content = window.XLSX.write(convertedWorkbook, { bookType: "xlsx", type: "array" });
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
      } else if (format === "json") {
        const rows = window.XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: ""
        });
        content = JSON.stringify(rows, null, 2);
        mimeType = "application/json;charset=utf-8";
        extension = "json";
      } else {
        content = window.XLSX.utils.sheet_to_csv(sheet, {
          FS: format === "tsv" ? "\t" : ","
        });
        mimeType = format === "tsv" ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8";
        extension = format;
      }

      outputBlob = new Blob([content], { type: mimeType });
      outputName = `${fileTools.sanitizeBaseName(file.name)}.${extension}`;
      showStatus("spreadsheet.converted", { format: extension.toUpperCase() });
      downloadButton.hidden = false;
    } catch (error) {
      outputBlob = null;
      downloadButton.hidden = true;
      const errorKey = error instanceof Error ? error.message : "";
      showStatus(errorKey.startsWith("spreadsheet.") || errorKey === "file.librariesMissing"
        ? errorKey
        : "spreadsheet.conversionFailed");
    } finally {
      submitButton.disabled = false;
    }
  });

  downloadButton.addEventListener("click", () => {
    if (outputBlob) {
      fileTools.downloadBlob(outputBlob, outputName);
    }
  });

  document.addEventListener("site-language-change", () => {
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadButton.textContent = i18n.t("file.downloadConverted");
  });
})();
