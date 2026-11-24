/* Local ZIP archive creation */
(() => {
  "use strict";

  const form = document.querySelector("#zip-form");
  const fileInput = document.querySelector("#zip-files");
  const archiveNameInput = document.querySelector("#zip-name");
  const levelSelect = document.querySelector("#zip-level");
  const result = document.querySelector("#zip-result");
  const status = document.querySelector("#zip-status");
  const downloadButton = document.querySelector("#zip-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  let archiveBlob = null;
  let archiveName = "";
  let statusKey = "";
  let statusValues = {};

  if (!form || !fileInput || !archiveNameInput || !levelSelect || !result || !status || !downloadButton || !submitButton || !i18n || !fileTools) {
    return;
  }

  let localizedDefaultName = "files";
  if (i18n.language === "pt" && archiveNameInput.value === localizedDefaultName) {
    archiveNameInput.value = "arquivos";
    localizedDefaultName = "arquivos";
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

  const safeEntryName = (fileName, usedNames) => {
    const sanitized = fileName
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
      .trim() || "file";
    const extensionIndex = sanitized.lastIndexOf(".");
    const baseName = extensionIndex > 0 ? sanitized.slice(0, extensionIndex) : sanitized;
    const extension = extensionIndex > 0 ? sanitized.slice(extensionIndex) : "";
    let candidate = sanitized;
    let suffix = 2;

    while (usedNames.has(candidate.toLocaleLowerCase())) {
      candidate = `${baseName} (${suffix})${extension}`;
      suffix += 1;
    }
    usedNames.add(candidate.toLocaleLowerCase());
    return candidate;
  };

  const createZip = (entries, level) => new Promise((resolve, reject) => {
    window.fflate.zip(entries, { level }, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const files = Array.from(fileInput.files);
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    result.hidden = false;
    downloadButton.hidden = true;
    archiveBlob = null;

    if (files.length === 0 || files.length > 50 || files.some((file) => file.size > 25 * 1024 * 1024) || totalBytes > 50 * 1024 * 1024) {
      showStatus("zip.fileLimit");
      return;
    }
    const enteredArchiveName = archiveNameInput.value.trim();
    if (!enteredArchiveName) {
      showStatus("zip.nameRequired");
      archiveNameInput.focus();
      return;
    }

    const compressionLevel = Number(levelSelect.value);
    showStatus("file.loadingLibraries");
    submitButton.disabled = true;
    const formControls = Array.from(form.querySelectorAll("input, select"));
    formControls.forEach((control) => {
      control.disabled = true;
    });
    try {
      if (!window.fflate) {
        await fileTools.loadLibrary("https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js");
      }
      if (!window.fflate || typeof window.fflate.zip !== "function") {
        throw new Error("file.librariesMissing");
      }

      showStatus("zip.processing", { count: files.length });
      const entries = Object.create(null);
      const usedNames = new Set();
      for (const file of files) {
        entries[safeEntryName(file.name, usedNames)] = new Uint8Array(await file.arrayBuffer());
      }

      const zippedBytes = await createZip(entries, compressionLevel);
      archiveBlob = new Blob([zippedBytes], { type: "application/zip" });
      archiveName = `${fileTools.sanitizeBaseName(enteredArchiveName)}.zip`;

      const values = {
        count: files.length,
        before: totalBytes,
        after: archiveBlob.size,
        percent: totalBytes > 0
          ? Math.abs((totalBytes - archiveBlob.size) / totalBytes * 100)
          : 0
      };
      showStatus(archiveBlob.size < totalBytes ? "zip.smaller" : "zip.notSmaller", values);
      downloadButton.hidden = false;
    } catch (error) {
      archiveBlob = null;
      showStatus(error instanceof Error && error.message === "file.librariesMissing"
        ? error.message
        : "zip.failed");
    } finally {
      submitButton.disabled = false;
      formControls.forEach((control) => {
        control.disabled = false;
      });
    }
  });

  downloadButton.addEventListener("click", () => {
    if (archiveBlob) {
      fileTools.downloadBlob(archiveBlob, archiveName);
    }
  });

  document.addEventListener("site-language-change", () => {
    const nextDefaultName = i18n.language === "pt" ? "arquivos" : "files";
    if (archiveNameInput.value === localizedDefaultName) {
      archiveNameInput.value = nextDefaultName;
    }
    localizedDefaultName = nextDefaultName;
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadButton.textContent = i18n.t("zip.download");
  });
})();
