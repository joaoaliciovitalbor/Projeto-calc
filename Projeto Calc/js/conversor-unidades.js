/* Unit converter */
(() => {
  "use strict";

  const form = document.querySelector("#unit-form");
  const categorySelect = document.querySelector("#unit-category");
  const fromSelect = document.querySelector("#unit-from");
  const toSelect = document.querySelector("#unit-to");
  const result = document.querySelector("#unit-result");
  const output = document.querySelector("#unit-output");
  const details = document.querySelector("#unit-details");
  const i18n = window.SiteI18n;

  if (!form || !categorySelect || !fromSelect || !toSelect || !result || !output || !details || !i18n) {
    return;
  }

  const units = {
    length: [
      { id: "m", label: "Meters (m)", factor: 1 },
      { id: "km", label: "Kilometers (km)", factor: 1000 },
      { id: "cm", label: "Centimeters (cm)", factor: 0.01 },
      { id: "mm", label: "Millimeters (mm)", factor: 0.001 },
      { id: "in", label: "Inches (in)", factor: 0.0254 },
      { id: "ft", label: "Feet (ft)", factor: 0.3048 },
      { id: "mi", label: "Miles (mi)", factor: 1609.344 }
    ],
    mass: [
      { id: "kg", label: "Kilograms (kg)", factor: 1 },
      { id: "g", label: "Grams (g)", factor: 0.001 },
      { id: "mg", label: "Milligrams (mg)", factor: 0.000001 },
      { id: "lb", label: "Pounds (lb)", factor: 0.45359237 },
      { id: "oz", label: "Ounces (oz)", factor: 0.028349523125 }
    ],
    volume: [
      { id: "l", label: "Liters (L)", factor: 1 },
      { id: "ml", label: "Milliliters (mL)", factor: 0.001 },
      { id: "gal", label: "US gallons (gal)", factor: 3.785411784 },
      { id: "cup", label: "US cups (cup)", factor: 0.2365882365 }
    ],
    temperature: [
      { id: "c", label: "Celsius (°C)" },
      { id: "f", label: "Fahrenheit (°F)" },
      { id: "k", label: "Kelvin (K)" }
    ]
  };

  const getCategoryUnits = () => units[categorySelect.value] || [];

  const populateUnitOptions = () => {
    const previousFrom = fromSelect.value;
    const previousTo = toSelect.value;
    const categoryUnits = getCategoryUnits();

    [fromSelect, toSelect].forEach((select) => {
      select.replaceChildren();
      categoryUnits.forEach((unit) => {
        const option = document.createElement("option");
        option.value = unit.id;
        option.textContent = i18n.t(unit.label);
        select.append(option);
      });
    });

    fromSelect.value = categoryUnits.some((unit) => unit.id === previousFrom)
      ? previousFrom
      : categoryUnits[0].id;
    toSelect.value = categoryUnits.some((unit) => unit.id === previousTo)
      ? previousTo
      : categoryUnits[Math.min(1, categoryUnits.length - 1)].id;
  };

  const convertTemperature = (value, from, to) => {
    let celsius;
    if (from === "c") {
      celsius = value;
    } else if (from === "f") {
      celsius = (value - 32) * (5 / 9);
    } else {
      celsius = value - 273.15;
    }

    if (to === "c") {
      return celsius;
    }
    if (to === "f") {
      return (celsius * (9 / 5)) + 32;
    }
    return celsius + 273.15;
  };

  const convert = () => {
    const valueInput = form.elements.namedItem("value");
    valueInput.setCustomValidity("");
    if (!form.checkValidity()) {
      result.hidden = true;
      return;
    }

    const value = Number(valueInput.value);
    const from = fromSelect.value;
    const to = toSelect.value;

    if (categorySelect.value === "temperature") {
      const minimumCelsius = from === "c" ? value : from === "f" ? (value - 32) * (5 / 9) : value - 273.15;
      if (minimumCelsius < -273.15) {
        valueInput.setCustomValidity(i18n.t("unit.invalidTemperature"));
        form.reportValidity();
        result.hidden = true;
        return;
      }
    }

    const categoryUnits = getCategoryUnits();
    const sourceUnit = categoryUnits.find((unit) => unit.id === from);
    const targetUnit = categoryUnits.find((unit) => unit.id === to);
    const converted = categorySelect.value === "temperature"
      ? convertTemperature(value, from, to)
      : (value * sourceUnit.factor) / targetUnit.factor;

    if (!Number.isFinite(converted)) {
      return;
    }

    const formattedValue = new Intl.NumberFormat(i18n.locale, {
      maximumSignificantDigits: 10
    }).format(converted);
    output.textContent = i18n.t("unit.result", {
      value: formattedValue,
      unit: i18n.t(targetUnit.label)
    });
    details.textContent = i18n.t("unit.details", {
      from: i18n.t(sourceUnit.label),
      to: i18n.t(targetUnit.label)
    });
    result.hidden = false;
  };

  categorySelect.addEventListener("change", () => {
    form.elements.namedItem("value").setCustomValidity("");
    populateUnitOptions();
    result.hidden = true;
  });

  form.elements.namedItem("value").addEventListener("input", (event) => {
    event.currentTarget.setCustomValidity("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.elements.namedItem("value").setCustomValidity("");
    if (form.reportValidity()) {
      convert();
    }
  });

  document.addEventListener("site-language-change", () => {
    populateUnitOptions();
    if (!result.hidden) {
      convert();
    }
  });

  populateUnitOptions();
})();
