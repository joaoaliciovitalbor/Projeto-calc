/* Secure password generator */
(() => {
  "use strict";

  const form = document.querySelector("#password-form");
  const result = document.querySelector("#password-result");
  const output = document.querySelector("#password-output");
  const feedback = document.querySelector("#password-feedback");
  const copyButton = document.querySelector("#copy-password");
  const i18n = window.SiteI18n;

  if (!form || !result || !output || !feedback || !copyButton || !i18n) {
    return;
  }

  const characterSets = [
    { selector: "#include-uppercase", characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
    { selector: "#include-lowercase", characters: "abcdefghijklmnopqrstuvwxyz" },
    { selector: "#include-numbers", characters: "0123456789" },
    { selector: "#include-symbols", characters: "!@#$%^&*()-_=+[]{};:,.?/|~" }
  ];

  const secureIndex = (maximum) => {
    const range = 0x100000000;
    const limit = Math.floor(range / maximum) * maximum;
    const randomValue = new Uint32Array(1);
    do {
      crypto.getRandomValues(randomValue);
    } while (randomValue[0] >= limit);
    return randomValue[0] % maximum;
  };

  const generatePassword = (length, selectedSets) => {
    const characters = selectedSets.map((set) => set.characters).join("");
    const password = selectedSets.map((set) => set.characters[secureIndex(set.characters.length)]);

    while (password.length < length) {
      password.push(characters[secureIndex(characters.length)]);
    }

    for (let index = password.length - 1; index > 0; index -= 1) {
      const swapIndex = secureIndex(index + 1);
      [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
    }

    return password.join("");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    feedback.textContent = "";

    if (!form.reportValidity()) {
      return;
    }

    const selectedSets = characterSets.filter((set) => form.querySelector(set.selector).checked);
    if (selectedSets.length === 0) {
      feedback.textContent = i18n.t("password.noGroups");
      result.hidden = true;
      return;
    }

    if (!globalThis.crypto || typeof crypto.getRandomValues !== "function") {
      feedback.textContent = i18n.t("password.cryptoUnavailable");
      result.hidden = true;
      return;
    }

    const length = Number(form.elements.namedItem("length").value);
    output.value = generatePassword(length, selectedSets);
    result.hidden = false;
    feedback.textContent = i18n.t("password.generated");
  });

  copyButton.addEventListener("click", async () => {
    if (!output.value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      feedback.textContent = i18n.t("password.copied");
    } catch (error) {
      feedback.textContent = i18n.t("password.copyFailed");
    }
  });

  document.addEventListener("site-language-change", () => {
    if (output.value) {
      feedback.textContent = i18n.t("password.generated");
    }
  });
})();
