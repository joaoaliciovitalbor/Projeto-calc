/* Local PDF merge */
(() => {
  "use strict";

  const form = document.querySelector("#merge-pdf-form");
  const fileInput = document.querySelector("#merge-pdf-files");
  const fileList = document.querySelector("#merge-pdf-list");
  const result = document.querySelector("#merge-pdf-result");
  const status = document.querySelector("#merge-pdf-status");
  const downloadButton = document.querySelector("#merge-pdf-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  let mergedBlob = null;
  let statusKey = "";
  let statusValues = {};
  let orderedFiles = [];

  if (!form || !fileInput || !fileList || !result || !status || !downloadButton || !submitButton || !i18n || !fileTools) {
    return;
  }

  const showStatus = (key, values = {}) => {
    statusKey = key;
    statusValues = values;
    status.textContent = i18n.t(key, values);
  };

  const renderFileList = () => {
    fileList.replaceChildren();
    orderedFiles.forEach((file, index) => {
      const item = document.createElement("li");
      item.className = "file-order-item";
      const name = document.createElement("span");
      name.className = "file-order-name";
      name.textContent = file.name;

      const controls = document.createElement("div");
      controls.className = "file-order-controls";
      [
        { label: "Move up", offset: -1, disabled: index === 0 },
        { label: "Move down", offset: 1, disabled: index === orderedFiles.length - 1 }
      ].forEach(({ label, offset, disabled }) => {
        const button = document.createElement("button");
        button.className = "button button-secondary";
        button.type = "button";
        button.textContent = i18n.t(label);
        button.setAttribute("aria-label", i18n.t(`Move ${offset < 0 ? "up" : "down"} file: {name}`, {
          name: file.name
        }));
        button.disabled = disabled;
        button.addEventListener("click", () => {
          const targetIndex = index + offset;
          [orderedFiles[index], orderedFiles[targetIndex]] = [orderedFiles[targetIndex], orderedFiles[index]];
          renderFileList();
        });
        controls.append(button);
      });

      item.append(name, controls);
      fileList.append(item);
    });
  };

  fileInput.addEventListener("change", () => {
    orderedFiles = Array.from(fileInput.files);
    renderFileList();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const files = orderedFiles;
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    result.hidden = false;
    downloadButton.hidden = true;

    if (files.length < 2) {
      showStatus("pdfMerge.needsTwo");
      return;
    }
    if (totalBytes > 100 * 1024 * 1024) {
      showStatus("pdfMerge.fileLimit");
      return;
    }
    showStatus("file.loadingLibraries");
    submitButton.disabled = true;
    try {
      if (!window.PDFLib) {
        await fileTools.loadLibrary("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
      }
      if (!window.PDFLib) {
        throw new Error("file.librariesMissing");
      }

      showStatus("pdfMerge.processing");
      const mergedPdf = await window.PDFLib.PDFDocument.create();
      for (const file of files) {
        const sourcePdf = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const bytes = await mergedPdf.save({ useObjectStreams: true });
      mergedBlob = new Blob([bytes], { type: "application/pdf" });
      showStatus("pdfMerge.complete", { files: files.length, pages: mergedPdf.getPageCount() });
      downloadButton.hidden = false;
    } catch (error) {
      mergedBlob = null;
      showStatus(error instanceof Error && error.message === "file.librariesMissing"
        ? error.message
        : "pdfMerge.failed");
    } finally {
      submitButton.disabled = false;
    }
  });

  downloadButton.addEventListener("click", () => {
    if (mergedBlob) {
      fileTools.downloadBlob(mergedBlob, "merged-document.pdf");
    }
  });

  document.addEventListener("site-language-change", () => {
    renderFileList();
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadButton.textContent = i18n.t("pdfMerge.download");
  });
})();
