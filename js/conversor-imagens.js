/* Batch image format conversion */
(() => {
  "use strict";

  const form = document.querySelector("#image-converter-form");
  const fileInput = document.querySelector("#image-files");
  const formatSelect = document.querySelector("#image-format");
  const qualityInput = document.querySelector("#image-quality");
  const qualityOutput = document.querySelector("#image-quality-value");
  const result = document.querySelector("#image-converter-result");
  const status = document.querySelector("#image-converter-status");
  const downloadList = document.querySelector("#image-download-list");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  let statusKey = "";
  let statusValues = {};
  const generatedUrls = new Set();

  if (!form || !fileInput || !formatSelect || !qualityInput || !qualityOutput || !result || !status || !downloadList || !submitButton || !i18n || !fileTools) {
    return;
  }

  const showStatus = (key, values = {}) => {
    statusKey = key;
    statusValues = values;
    status.textContent = i18n.t(key, values);
  };

  const convertImage = (file, mimeType, quality) => new Promise((resolve, reject) => {
    createImageBitmap(file).then((bitmap) => {
      try {
        if (bitmap.width * bitmap.height > 40000000) {
          bitmap.close();
          reject(new Error("image.dimensionLimit"));
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) {
          bitmap.close();
          reject(new Error("image.conversionFailed"));
          return;
        }

        if (mimeType === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        canvas.toBlob((blob) => {
          if (!blob || blob.type !== mimeType) {
            reject(new Error("image.formatUnavailable"));
            return;
          }
          resolve(blob);
        }, mimeType, quality);
      } catch (error) {
        bitmap.close();
        reject(error);
      }
    }).catch(() => reject(new Error("image.decodeFailed")));
  });

  const addDownloadLink = (blob, fileName) => {
    const item = document.createElement("li");
    item.className = "file-download-item";
    const link = document.createElement("a");
    link.className = "button button-secondary image-download-link";
    link.href = URL.createObjectURL(blob);
    generatedUrls.add(link.href);
    link.download = fileName;
    link.textContent = i18n.t("file.downloadConverted");
    item.append(link);
    downloadList.append(item);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const files = Array.from(fileInput.files);
    if (files.length === 0 || files.length > 10 || files.some((file) => file.size > 20 * 1024 * 1024)) {
      result.hidden = false;
      showStatus("image.fileLimit");
      return;
    }

    result.hidden = false;
    generatedUrls.forEach((url) => URL.revokeObjectURL(url));
    generatedUrls.clear();
    downloadList.replaceChildren();
    showStatus("image.processing", { count: files.length });
    submitButton.disabled = true;
    const mimeType = formatSelect.value;
    const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
    const quality = Number(qualityInput.value);
    let convertedCount = 0;
    let firstErrorKey = "";

    for (const file of files) {
      try {
        const blob = await convertImage(file, mimeType, quality);
        const fileName = `${fileTools.sanitizeBaseName(file.name)}.${extension}`;
        addDownloadLink(blob, fileName);
        convertedCount += 1;
      } catch (error) {
        if (!firstErrorKey) {
          firstErrorKey = error instanceof Error && error.message.startsWith("image.")
            ? error.message
            : "image.conversionFailed";
        }
      }
    }

    if (convertedCount > 0) {
      showStatus(firstErrorKey ? "image.partial" : "image.converted", {
        converted: convertedCount,
        total: files.length
      });
    } else {
      showStatus(firstErrorKey || "image.conversionFailed");
    }
    submitButton.disabled = false;
  });

  qualityInput.addEventListener("input", () => {
    qualityOutput.value = `${Math.round(Number(qualityInput.value) * 100)}%`;
  });

  document.addEventListener("site-language-change", () => {
    if (statusKey) {
      showStatus(statusKey, statusValues);
    }
    downloadList.querySelectorAll(".image-download-link").forEach((link) => {
      link.textContent = i18n.t("file.downloadConverted");
    });
  });
})();
