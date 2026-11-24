/* Shared file conversion helpers */
(() => {
  "use strict";

  const libraryLoads = new Map();
  const moduleLoads = new Map();

  const sanitizeBaseName = (fileName) => {
    const baseName = fileName.replace(/\.[^.]+$/, "");
    const safeName = baseName.replace(/[\\/:*?"<>|]+/g, "_").trim();
    return safeName || "converted-file";
  };

  const formatBytes = (bytes, locale) => {
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    const maximumFractionDigits = unitIndex === 0 ? 0 : 1;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value)} ${units[unitIndex]}`;
  };

  const downloadBlob = (blob, fileName) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const loadLibrary = (source) => {
    if (libraryLoads.has(source)) {
      return libraryLoads.get(source);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => {
        libraryLoads.delete(source);
        script.remove();
        reject(new Error("file.librariesMissing"));
      }, { once: true });
      document.head.append(script);
    });

    libraryLoads.set(source, loadPromise);
    return loadPromise;
  };

  const loadModule = (source) => {
    if (moduleLoads.has(source)) {
      return moduleLoads.get(source);
    }

    const loadPromise = import(source).catch(() => {
      moduleLoads.delete(source);
      throw new Error("file.librariesMissing");
    });
    moduleLoads.set(source, loadPromise);
    return loadPromise;
  };

  window.FileTools = Object.freeze({
    sanitizeBaseName,
    formatBytes,
    downloadBlob,
    loadLibrary,
    loadModule
  });
})();
