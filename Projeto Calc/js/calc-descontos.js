/* Discount calculator */
(() => {
  "use strict";

  const form = document.querySelector("#discount-form");
  const result = document.querySelector("#discount-result");
  const savingsOutput = document.querySelector("#discount-savings");
  const priceOutput = document.querySelector("#discounted-price");
  const taxOutput = document.querySelector("#discount-tax-output");
  const totalOutput = document.querySelector("#discount-total");
  const i18n = window.SiteI18n;

  if (!form || !result || !savingsOutput || !priceOutput || !taxOutput || !totalOutput || !i18n) {
    return;
  }

  const calculate = () => {
    if (!form.checkValidity()) {
      result.hidden = true;
      return;
    }

    const originalPrice = Number(form.elements.namedItem("price").value);
    const discountRate = Number(form.elements.namedItem("discount").value);
    const taxRateInput = form.elements.namedItem("tax");
    const taxRate = taxRateInput.value === "" ? 0 : Number(taxRateInput.value);
    const savings = originalPrice * (discountRate / 100);
    const discountedPrice = originalPrice - savings;
    const taxAmount = discountedPrice * (taxRate / 100);
    const total = discountedPrice + taxAmount;
    const currencyFormat = new Intl.NumberFormat(i18n.locale, {
      style: "currency",
      currency: "BRL"
    });

    if (![savings, discountedPrice, taxAmount, total].every(Number.isFinite)) {
      return;
    }

    savingsOutput.textContent = i18n.t("discount.savings", { amount: currencyFormat.format(savings) });
    priceOutput.textContent = i18n.t("discount.price", { amount: currencyFormat.format(discountedPrice) });
    taxOutput.textContent = i18n.t("discount.tax", { amount: currencyFormat.format(taxAmount) });
    totalOutput.textContent = i18n.t("discount.total", { amount: currencyFormat.format(total) });
    result.hidden = false;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (form.reportValidity()) {
      calculate();
    }
  });

  document.addEventListener("site-language-change", () => {
    if (!result.hidden) {
      calculate();
    }
  });
})();
