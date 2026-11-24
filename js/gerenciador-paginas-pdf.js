/* Local PDF page operations */
(() => {
  "use strict";

  const form = document.querySelector("#pdf-pages-form");
  const fileInput = document.querySelector("#pdf-pages-file");
  const actionSelect = document.querySelector("#pdf-pages-action");
  const rangeGroup = document.querySelector("#pdf-pages-range-group");
  const rangeLabel = document.querySelector("#pdf-pages-range-label");
  const rangeInput = document.querySelector("#pdf-pages-range");
  const rangeHelp = document.querySelector("#pdf-pages-range-help");
  const angleGroup = document.querySelector("#pdf-pages-angle-group");
  const angleSelect = document.querySelector("#pdf-pages-angle");
  const result = document.querySelector("#pdf-pages-result");
  const status = document.querySelector("#pdf-pages-status");
  const downloadButton = document.querySelector("#pdf-pages-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  const maxFileSize = 100 * 1024 * 1024;
  const maxPageCount = 500;
  const maxSplitPageCount = 50;
  let outputBlob = null;
  let outputName = "";
  let statusKey = "";
  let statusValues = {};

  if (!form || !fileInput || !actionSelect || !rangeGroup || !rangeLabel || !rangeInput || !rangeHelp || !angleGroup || !angleSelect || !result || !status || !downloadButton || !submitButton || !i18n || !fileTools) {
    return;
  }

  const showStatus = (key, values = {}) => {
    statusKey = key;
    statusValues = values;
    status.textContent = i18n.t(key, values);
  };

  const operationContent = {
    reorder: ["pdfPages.orderLabel", "pdfPages.orderHelp", "pdfPages.orderPlaceholder"],
    rotate: ["pdfPages.rangeLabel", "pdfPages.rangeHelp", "pdfPages.rotatePlaceholder"],
    remove: ["pdfPages.rangeLabel", "pdfPages.rangeHelp", "pdfPages.removePlaceholder"],
    extract: ["pdfPages.rangeLabel", "pdfPages.rangeHelp", "pdfPages.extractPlaceholder"],
    split: ["pdfPages.rangeLabel", "pdfPages.rangeHelp", "pdfPages.splitPlaceholder"]
  };

  const updateOperationFields = () => {
    const action = actionSelect.value;
    const needsPageList = action !== "split";
    const content = operationContent[action] || operationContent.reorder;
    rangeGroup.hidden = !needsPageList;
    rangeInput.required = needsPageList;
    rangeLabel.textContent = i18n.t(content[0]);
    rangeHelp.textContent = i18n.t(action === "split" ? "pdfPages.splitHelp" : content[1]);
    rangeInput.placeholder = i18n.t(content[2]);
    angleGroup.hidden = action !== "rotate";
  };

  const parsePages = (value, pageCount, allowRanges) => {
    const tokens = value.split(",").map((token) => token.trim());
    if (tokens.length === 0 || tokens.some((token) => !token)) {
      throw new Error("pdfPages.rangeInvalid");
    }

    const pages = [];
    const seen = new Set();
    tokens.forEach((token) => {
      const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match || (!allowRanges && match[2])) {
        throw new Error(allowRanges ? "pdfPages.rangeInvalid" : "pdfPages.orderInvalid");
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : start;
      if (start < 1 || end < start || end > pageCount) {
        throw new Error("pdfPages.rangeOutOfBounds");
      }

      for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        if (seen.has(pageNumber)) {
          throw new Error("pdfPages.duplicatePage");
        }
        seen.add(pageNumber);
        pages.push(pageNumber - 1);
      }
    });
    return pages;
  };

  const copyPages = async (source, indices) => {
    const output = await window.PDFLib.PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach((page) => output.addPage(page));
    return output.save({ useObjectStreams: true });
  };

  const processPdf = async (file, action) => {
    const source = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
    const pageCount = source.getPageCount();
    if (pageCount > maxPageCount) {
      throw new Error("pdfPages.pageLimit");
    }

    const baseName = fileTools.sanitizeBaseName(file.name);
    if (action === "reorder") {
      const pageOrder = parsePages(rangeInput.value, pageCount, false);
      if (pageOrder.length !== pageCount) {
        throw new Error("pdfPages.orderCount");
      }
      const bytes = await copyPages(source, pageOrder);
      return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        name: `${baseName}-reordered.pdf`,
        statusKey: "pdfPages.reordered",
        values: { pages: pageCount }
      };
    }

    if (action === "rotate") {
      const selectedPages = parsePages(rangeInput.value, pageCount, true);
      const rotation = Number(angleSelect.value);
      selectedPages.forEach((index) => {
        const page = source.getPage(index);
        const nextAngle = (page.getRotation().angle + rotation) % 360;
        page.setRotation(window.PDFLib.degrees(nextAngle));
      });
      const bytes = await source.save({ useObjectStreams: true });
      return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        name: `${baseName}-rotated.pdf`,
        statusKey: "pdfPages.rotated",
        values: { pages: selectedPages.length }
      };
    }

    if (action === "remove") {
      const removedPages = parsePages(rangeInput.value, pageCount, true);
      if (removedPages.length === pageCount) {
        throw new Error("pdfPages.removeAll");
      }
      const removedSet = new Set(removedPages);
      const remainingPages = source.getPageIndices().filter((index) => !removedSet.has(index));
      const bytes = await copyPages(source, remainingPages);
      return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        name: `${baseName}-pages-removed.pdf`,
        statusKey: "pdfPages.removed",
        values: { removed: removedPages.length, remaining: remainingPages.length }
      };
    }

    if (action === "extract") {
      const selectedPages = parsePages(rangeInput.value, pageCount, true);
      const bytes = await copyPages(source, selectedPages);
      return {
        blob: new Blob([bytes], { type: "application/pdf" }),
        name: `${baseName}-extracted-pages.pdf`,
        statusKey: "pdfPages.extracted",
        values: { pages: selectedPages.length }
      };
    }

    if (action === "split") {
      if (pageCount > maxSplitPageCount) {
        throw new Error("pdfPages.splitLimit");
      }
      if (!window.fflate) {
        await fileTools.loadLibrary("https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js");
      }
      if (!window.fflate) {
        throw new Error("file.librariesMissing");
      }

      const archiveFiles = {};
      let totalBytes = 0;
      for (let index = 0; index < pageCount; index += 1) {
        const pageBytes = await copyPages(source, [index]);
        totalBytes += pageBytes.byteLength;
        if (totalBytes > maxFileSize * 2) {
          throw new Error("pdfPages.outputLimit");
        }
        const pageLabel = String(index + 1).padStart(3, "0");
        archiveFiles[`${baseName}-page-${pageLabel}.pdf`] = new Uint8Array(pageBytes);
      }

      const zippedBytes = window.fflate.zipSync(archiveFiles, { level: 1 });
      return {
        blob: new Blob([zippedBytes], { type: "application/zip" }),
        name: `${baseName}-pages.zip`,
        statusKey: "pdfPages.splitReady",
        values: { pages: pageCount }
      };
    }

    throw new Error("pdfPages.actionInvalid");
  };

  actionSelect.addEventListener("change", updateOperationFields);
  updateOperationFields();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const file = fileInput.files[0];
    const action = actionSelect.value;
    result.hidden = false;
    downloadButton.hidden = true;
    outputBlob = null;

    if (!file || file.size > maxFileSize) {
      showStatus("pdfPages.fileLimit");
      return;
    }

    const formControls = Array.from(form.querySelectorAll("input, select"));
    submitButton.disabled = true;
    formControls.forEach((control) => {
      control.disabled = true;
    });

    try {
      showStatus("file.loadingLibraries");
      if (!window.PDFLib) {
        await fileTools.loadLibrary("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
      }
      if (!window.PDFLib) {
        throw new Error("file.librariesMissing");
      }

      showStatus("pdfPages.processing");
      const output = await processPdf(file, action);
      outputBlob = output.blob;
      outputName = output.name;
      showStatus(output.statusKey, output.values);
      downloadButton.hidden = false;
    } catch (error) {
      outputBlob = null;
      const errorKey = error instanceof Error && error.message.startsWith("pdfPages.")
        ? error.message
        : error instanceof Error && error.message === "file.librariesMissing"
          ? error.message
          : "pdfPages.failed";
      if (errorKey === "pdfPages.failed") {
        console.error("PDF page operation failed.", error);
      }
      showStatus(errorKey);
    } finally {
      submitButton.disabled = false;
      formControls.forEach((control) => {
        control.disabled = false;
      });
      updateOperationFields();
    }
  });

  downloadButton.addEventListener("click", () => {
    if (outputBlob) {
      fileTools.downloadBlob(outputBlob, outputName);
    }
  });

  document.addEventListener("site-language-change", () => {
    updateOperationFields();
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadButton.textContent = i18n.t("pdfPages.download");
  });
})();
