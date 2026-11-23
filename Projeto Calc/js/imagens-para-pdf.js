/* Local image-to-PDF conversion */
(() => {
  "use strict";

  const form = document.querySelector("#images-pdf-form");
  const fileInput = document.querySelector("#images-pdf-files");
  const pageSizeSelect = document.querySelector("#images-pdf-size");
  const result = document.querySelector("#images-pdf-result");
  const status = document.querySelector("#images-pdf-status");
  const downloadButton = document.querySelector("#images-pdf-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  let pdfBlob = null;
  let statusKey = "";
  let statusValues = {};

  if (!form || !fileInput || !pageSizeSelect || !result || !status || !downloadButton || !submitButton || !i18n || !fileTools) {
    return;
  }

  const showStatus = (key, values = {}) => {
    statusKey = key;
    statusValues = values;
    status.textContent = i18n.t(key, values);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const files = Array.from(fileInput.files);
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    result.hidden = false;
    downloadButton.hidden = true;

    if (files.length === 0 || files.length > 20 || files.some((file) => file.size > 20 * 1024 * 1024) || totalBytes > 100 * 1024 * 1024) {
      showStatus("imagesPdf.fileLimit");
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

      showStatus("imagesPdf.processing", { count: files.length });
      const pdf = await window.PDFLib.PDFDocument.create();
      const pageSize = pageSizeSelect.value === "letter"
        ? [612, 792]
        : [595.28, 841.89];
      const margin = 28;

      for (const file of files) {
        const extension = file.name.split(".").pop().toLowerCase();
        const isJpeg = file.type === "image/jpeg" || extension === "jpg" || extension === "jpeg";
        const isPng = file.type === "image/png" || extension === "png";
        if (!isJpeg && !isPng) {
          throw new Error("imagesPdf.unsupportedImage");
        }

        const imageBytes = await file.arrayBuffer();
        const image = isJpeg ? await pdf.embedJpg(imageBytes) : await pdf.embedPng(imageBytes);
        const page = pdf.addPage(pageSize);
        const maxWidth = pageSize[0] - margin * 2;
        const maxHeight = pageSize[1] - margin * 2;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;

        page.drawImage(image, {
          x: (pageSize[0] - width) / 2,
          y: (pageSize[1] - height) / 2,
          width,
          height
        });
      }

      const bytes = await pdf.save({ useObjectStreams: true });
      pdfBlob = new Blob([bytes], { type: "application/pdf" });
      showStatus(files.length === 1 ? "imagesPdf.completeOne" : "imagesPdf.complete", {
        count: files.length
      });
      downloadButton.hidden = false;
    } catch (error) {
      pdfBlob = null;
      const errorKey = error instanceof Error ? error.message : "";
      showStatus(errorKey.startsWith("imagesPdf.") || errorKey === "file.librariesMissing"
        ? errorKey
        : "imagesPdf.failed");
    } finally {
      submitButton.disabled = false;
    }
  });

  downloadButton.addEventListener("click", () => {
    if (pdfBlob) {
      fileTools.downloadBlob(pdfBlob, "images.pdf");
    }
  });

  document.addEventListener("site-language-change", () => {
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadButton.textContent = i18n.t("imagesPdf.download");
  });
})();
