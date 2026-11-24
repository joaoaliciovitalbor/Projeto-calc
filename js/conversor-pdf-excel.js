/* PDF text extraction and spreadsheet export */
(() => {
  "use strict";

  const form = document.querySelector("#pdf-excel-form");
  const fileInput = document.querySelector("#pdf-excel-file");
  const formatSelect = document.querySelector("#pdf-excel-format");
  const result = document.querySelector("#pdf-excel-result");
  const status = document.querySelector("#pdf-excel-status");
  const downloadButton = document.querySelector("#pdf-excel-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  let downloadBlob = null;
  let downloadName = "";
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

  const extractRows = async (pdf) => {
    const sheets = [];
    const textPages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter((item) => typeof item.str === "string" && item.str.trim())
        .map((item) => ({
          text: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          fontSize: Math.abs(item.transform[0]) || 10
        }))
        .sort((left, right) => right.y - left.y || left.x - right.x);

      const lines = [];
      items.forEach((item) => {
        let line = lines[lines.length - 1];
        if (!line || Math.abs(line.y - item.y) > 3) {
          line = { y: item.y, items: [] };
          lines.push(line);
        }
        line.items.push(item);
      });

      const rows = lines.map((line) => {
        const cells = [];
        let previousRight = null;
        let previousFontSize = 10;

        line.items.sort((left, right) => left.x - right.x).forEach((item) => {
          const gap = previousRight === null ? 0 : item.x - previousRight;
          const columnGap = Math.max(18, previousFontSize * 2.5);
          if (cells.length === 0 || gap > columnGap) {
            cells.push(item.text);
          } else {
            const separator = gap > 2 ? " " : "";
            cells[cells.length - 1] = `${cells[cells.length - 1]}${separator}${item.text}`;
          }
          previousRight = item.x + item.width;
          previousFontSize = item.fontSize;
        });

        return cells;
      }).filter((row) => row.length > 0);

      if (rows.length > 0) {
        sheets.push({ name: `Page ${pageNumber}`, rows });
        textPages.push({
          page: pageNumber,
          lines: lines.map((line) => line.items
            .sort((left, right) => left.x - right.x)
            .map((item) => item.text)
            .join(" "))
        });
      }
    }

    return { sheets, textPages };
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
      showStatus("file.invalidPdfSize");
      return;
    }
    result.hidden = false;
    downloadButton.hidden = true;
    showStatus("file.loadingLibraries");
    submitButton.disabled = true;

    try {
      await Promise.all([
        window.pdfjsLib
          ? Promise.resolve()
          : fileTools.loadModule("https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs")
            .then((module) => {
              window.pdfjsLib = module;
            }),
        window.XLSX
          ? Promise.resolve()
          : fileTools.loadLibrary("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js")
      ]);
      if (!window.pdfjsLib || !window.XLSX) {
        throw new Error("file.librariesMissing");
      }

      showStatus("pdf.processing");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs";
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      if (pdf.numPages > 100) {
        throw new Error("pdf.pageLimit");
      }

      const { sheets, textPages } = await extractRows(pdf);
      if (sheets.length === 0) {
        throw new Error("pdf.noText");
      }

      const format = formatSelect.value;
      let output;
      let mimeType;
      let extension;

      if (format === "xlsx") {
        const workbook = window.XLSX.utils.book_new();
        sheets.forEach(({ name, rows }) => {
          window.XLSX.utils.book_append_sheet(
            workbook,
            window.XLSX.utils.aoa_to_sheet(rows),
            name
          );
        });
        output = window.XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
      } else if (format === "csv") {
        const workbook = window.XLSX.utils.book_new();
        const rows = [];
        sheets.forEach(({ name, rows: pageRows }, index) => {
          if (index > 0) {
            rows.push([]);
          }
          rows.push([name]);
          rows.push(...pageRows);
        });
        window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.aoa_to_sheet(rows), "PDF text");
        output = window.XLSX.utils.sheet_to_csv(workbook.Sheets["PDF text"]);
        mimeType = "text/csv;charset=utf-8";
        extension = "csv";
      } else {
        output = textPages
          .map(({ page, lines }) => `${i18n.t("pdf.page", { page })}\n${lines.join("\n")}`)
          .join("\n\n");
        mimeType = "text/plain;charset=utf-8";
        extension = "txt";
      }

      downloadBlob = new Blob([output], { type: mimeType });
      downloadName = `${fileTools.sanitizeBaseName(file.name)}.${extension}`;
      showStatus(pdf.numPages === 1 ? "pdf.convertedOne" : "pdf.converted", {
        pages: pdf.numPages,
        format: extension.toUpperCase()
      });
      downloadButton.hidden = false;
    } catch (error) {
      downloadBlob = null;
      downloadButton.hidden = true;
      const errorKey = error instanceof Error ? error.message : "";
      showStatus(errorKey.startsWith("pdf.") || errorKey === "file.librariesMissing"
        ? errorKey
        : "pdf.conversionFailed");
    } finally {
      submitButton.disabled = false;
    }
  });

  downloadButton.addEventListener("click", () => {
    if (downloadBlob) {
      fileTools.downloadBlob(downloadBlob, downloadName);
    }
  });

  document.addEventListener("site-language-change", () => {
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadButton.textContent = i18n.t("file.downloadConverted");
  });
})();
