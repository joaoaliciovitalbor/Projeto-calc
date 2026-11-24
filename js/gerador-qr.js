/* Local QR code generation */
(() => {
  "use strict";

  const form = document.querySelector("#qr-form");
  const contentInput = document.querySelector("#qr-content");
  const sizeSelect = document.querySelector("#qr-size");
  const correctionSelect = document.querySelector("#qr-correction");
  const result = document.querySelector("#qr-result");
  const status = document.querySelector("#qr-status");
  const preview = document.querySelector("#qr-preview");
  const downloadButton = document.querySelector("#qr-download");
  const submitButton = form && form.querySelector('button[type="submit"]');
  const i18n = window.SiteI18n;
  const fileTools = window.FileTools;
  let pngDataUrl = "";
  let statusKey = "";

  if (!form || !contentInput || !sizeSelect || !correctionSelect || !result || !status || !preview || !downloadButton || !submitButton || !i18n || !fileTools) {
    return;
  }

  const showStatus = (key) => {
    statusKey = key;
    status.textContent = i18n.t(key);
  };

  const dataUrlToBlob = (dataUrl) => {
    const [metadata, encoded] = dataUrl.split(",");
    if (!metadata || !encoded || !metadata.includes(";base64")) {
      throw new Error("qr.generateFailed");
    }

    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: "image/png" });
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const text = contentInput.value.trim();
    if (!text) {
      contentInput.focus();
      return;
    }

    result.hidden = false;
    downloadButton.hidden = true;
    preview.replaceChildren();
    pngDataUrl = "";
    showStatus("qr.loading");
    submitButton.disabled = true;
    const formControls = Array.from(form.querySelectorAll("textarea, select"));
    formControls.forEach((control) => {
      control.disabled = true;
    });

    try {
      if (!window.QRCode) {
        await fileTools.loadLibrary("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js");
      }
      if (!window.QRCode) {
        throw new Error("qr.libraryMissing");
      }

      const generated = document.createElement("div");
      new window.QRCode(generated, {
        text,
        width: Number(sizeSelect.value),
        height: Number(sizeSelect.value),
        correctLevel: window.QRCode.CorrectLevel[correctionSelect.value]
      });

      const image = generated.querySelector("img");
      const canvas = generated.querySelector("canvas");
      pngDataUrl = image && image.src.startsWith("data:image/png")
        ? image.src
        : canvas && canvas.toDataURL("image/png");
      if (!pngDataUrl) {
        throw new Error("qr.generateFailed");
      }

      const previewImage = image || canvas;
      previewImage.classList.add("qr-code-image");
      previewImage.setAttribute("aria-label", i18n.t("qr.imageAlt"));
      if (previewImage instanceof HTMLImageElement) {
        previewImage.alt = i18n.t("qr.imageAlt");
      }
      preview.append(previewImage);
      showStatus("qr.generated");
      downloadButton.hidden = false;
    } catch (error) {
      pngDataUrl = "";
      const errorKey = error instanceof Error ? error.message : "";
      showStatus(errorKey === "qr.libraryMissing" || errorKey === "file.librariesMissing"
        ? "qr.libraryMissing"
        : "qr.generateFailed");
    } finally {
      submitButton.disabled = false;
      formControls.forEach((control) => {
        control.disabled = false;
      });
    }
  });

  downloadButton.addEventListener("click", () => {
    if (pngDataUrl) {
      fileTools.downloadBlob(dataUrlToBlob(pngDataUrl), "qr-code.png");
    }
  });

  document.addEventListener("site-language-change", () => {
    if (statusKey) {
      showStatus(statusKey);
    }
    downloadButton.textContent = i18n.t("qr.download");
    const image = preview.querySelector("img, canvas");
    if (image) {
      image.setAttribute("aria-label", i18n.t("qr.imageAlt"));
      if (image instanceof HTMLImageElement) {
        image.alt = i18n.t("qr.imageAlt");
      }
    }
  });
})();
