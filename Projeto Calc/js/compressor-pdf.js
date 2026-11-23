/* PDF optimization and visual compression */
(() => {
  "use strict";

  const form = document.querySelector("#pdf-compress-form");
  const fileInput = document.querySelector("#pdf-compress-file");
  const modeSelect = document.querySelector("#pdf-compress-mode");
  const qualitySelect = document.querySelector("#pdf-compress-quality");
  const result = document.querySelector("#pdf-compress-result");
  const status = document.querySelector("#pdf-compress-status");
  const progress = document.querySelector("#pdf-compress-progress");
  const downloadButton = document.querySelector("#pdf-compress-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  const maxFileSize = 25 * 1024 * 1024;
  let compressedBlob = null;
  let downloadName = "";
  let statusKey = "";
  let statusValues = {};

  if (!form || !fileInput || !modeSelect || !qualitySelect || !result || !status || !progress || !downloadButton || !submitButton || !i18n || !fileTools) {
    return;
  }

  const localizeValues = (values) => {
    const localized = { ...values };
    if (Number.isFinite(values.before)) {
      localized.before = formatSize(values.before);
    }
    if (Number.isFinite(values.after)) {
      localized.after = formatSize(values.after);
    }
    if (Number.isFinite(values.percent)) {
      localized.percent = new Intl.NumberFormat(i18n.locale, {
        maximumFractionDigits: 1
      }).format(values.percent);
    }
    return localized;
  };

  const showStatus = (key, values = {}) => {
    statusKey = key;
    statusValues = values;
    status.textContent = i18n.t(key, localizeValues(values));
  };

  const formatSize = (bytes) => fileTools.formatBytes(bytes, i18n.locale);

  const loadPdfJs = async () => {
    if (!window.pdfjsLib) {
      window.pdfjsLib = await fileTools.loadModule(
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs"
      );
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs";
    return window.pdfjsLib;
  };

  const renderCompressedPdf = async (file, quality) => {
    const pdfjsLib = await loadPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
    const source = await loadingTask.promise;
    const maximumPages = 50;
    const maximumPixelsPerPage = 20_000_000;
    const maximumImageBytes = 100 * 1024 * 1024;
    if (source.numPages > maximumPages) {
      await loadingTask.destroy();
      throw new Error("pdfCompress.visualPageLimit");
    }

    const settings = {
      low: { dpi: 96, jpegQuality: 0.55 },
      balanced: { dpi: 144, jpegQuality: 0.72 },
      high: { dpi: 200, jpegQuality: 0.82 }
    }[quality] || { dpi: 144, jpegQuality: 0.72 };
    const scale = settings.dpi / 72;
    const output = await window.PDFLib.PDFDocument.create();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      await loadingTask.destroy();
      throw new Error("pdfCompress.canvasUnavailable");
    }

    let imageBytesTotal = 0;
    try {
      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
        showStatus("pdfCompress.pageProgress", {
          current: pageNumber,
          total: source.numPages
        });
        progress.value = Math.round((pageNumber - 1) / source.numPages * 100);

        const sourcePage = await source.getPage(pageNumber);
        const viewport = sourcePage.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        if (canvas.width * canvas.height > maximumPixelsPerPage) {
          throw new Error("pdfCompress.pixelLimit");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await sourcePage.render({
          canvasContext: context,
          viewport
        }).promise;
        const jpegBlob = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("pdfCompress.canvasUnavailable"));
            }
          }, "image/jpeg", settings.jpegQuality);
        });
        imageBytesTotal += jpegBlob.size;
        if (imageBytesTotal > maximumImageBytes) {
          throw new Error("pdfCompress.outputLimit");
        }

        const image = await output.embedJpg(await jpegBlob.arrayBuffer());
        const pageWidth = viewport.width / scale;
        const pageHeight = viewport.height / scale;
        const outputPage = output.addPage([pageWidth, pageHeight]);
        outputPage.drawImage(image, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight
        });

        sourcePage.cleanup();
        canvas.width = 0;
        canvas.height = 0;
        progress.value = Math.round(pageNumber / source.numPages * 100);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      return await output.save({ useObjectStreams: true });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      await loadingTask.destroy();
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const file = fileInput.files[0];
    const mode = modeSelect.value;
    const quality = qualitySelect.value;
    result.hidden = false;
    downloadButton.hidden = true;
    progress.hidden = true;
    progress.value = 0;
    compressedBlob = null;

    if (!file || file.size > maxFileSize) {
      showStatus("file.invalidPdfSize");
      return;
    }

    showStatus("file.loadingLibraries");
    submitButton.disabled = true;
    const formControls = Array.from(form.querySelectorAll("input, select"));
    formControls.forEach((control) => {
      control.disabled = true;
    });
    try {
      if (!window.PDFLib) {
        await fileTools.loadLibrary("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
      }
      if (!window.PDFLib) {
        throw new Error("file.librariesMissing");
      }

      let outputBytes;
      if (mode === "visual") {
        await loadPdfJs();
        progress.hidden = false;
        outputBytes = await renderCompressedPdf(file, quality);
      } else {
        showStatus("pdfCompress.structuralProcessing");
        const document = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
        if (document.getPageCount() > 100) {
          throw new Error("pdfCompress.pageLimit");
        }
        outputBytes = await document.save({ useObjectStreams: true });
      }

      compressedBlob = new Blob([outputBytes], { type: "application/pdf" });
      downloadName = `${fileTools.sanitizeBaseName(file.name)}-compressed.pdf`;
      const values = {
        before: file.size,
        after: compressedBlob.size,
        percent: Math.abs((file.size - compressedBlob.size) / file.size * 100)
      };
      showStatus(compressedBlob.size < file.size
        ? "pdfCompress.smaller"
        : mode === "visual"
          ? "pdfCompress.visualNotSmaller"
          : "pdfCompress.notSmaller", values);
      downloadButton.hidden = false;
    } catch (error) {
      compressedBlob = null;
      const errorKey = error instanceof Error ? error.message : "";
      showStatus(errorKey.startsWith("pdfCompress.") || errorKey === "file.librariesMissing"
        ? errorKey
        : "pdfCompress.failed");
    } finally {
      submitButton.disabled = false;
      formControls.forEach((control) => {
        control.disabled = false;
      });
    }
  });

  downloadButton.addEventListener("click", () => {
    if (compressedBlob) {
      fileTools.downloadBlob(compressedBlob, downloadName);
    }
  });

  document.addEventListener("site-language-change", () => {
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadButton.textContent = i18n.t("pdfCompress.download");
  });
})();
