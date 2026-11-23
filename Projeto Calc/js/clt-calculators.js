/* Brazilian payroll and time calculators */
(() => {
  "use strict";

  const i18n = window.SiteI18n;
  if (!i18n) {
    return;
  }

  const formatCurrency = (value) => new Intl.NumberFormat(i18n.locale, {
    style: "currency",
    currency: "BRL"
  }).format(value);

  const overtimeForm = document.querySelector("#overtime-form");
  if (overtimeForm) {
    const result = document.querySelector("#overtime-result");
    const hourlyOutput = document.querySelector("#overtime-hourly");
    const totalOutput = document.querySelector("#overtime-total");

    overtimeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!overtimeForm.reportValidity()) {
        return;
      }

      const salary = Number(overtimeForm.elements.namedItem("salary").value);
      const monthlyHours = Number(overtimeForm.elements.namedItem("monthly-hours").value);
      const hours = Number(overtimeForm.elements.namedItem("hours").value);
      const premium = Number(overtimeForm.elements.namedItem("premium").value) / 100;
      const hourlyRate = salary / monthlyHours;
      const overtimePay = hourlyRate * hours * (1 + premium);

      hourlyOutput.textContent = i18n.t("overtime.hourlyRate", { value: formatCurrency(hourlyRate) });
      totalOutput.textContent = i18n.t("overtime.total", { value: formatCurrency(overtimePay) });
      result.hidden = false;
    });

    document.addEventListener("site-language-change", () => {
      if (!result.hidden && overtimeForm.checkValidity()) {
        overtimeForm.requestSubmit();
      }
    });
  }

  const vacationForm = document.querySelector("#vacation-form");
  if (vacationForm) {
    const result = document.querySelector("#vacation-result");
    const baseOutput = document.querySelector("#vacation-base");
    const thirdOutput = document.querySelector("#vacation-third");
    const totalOutput = document.querySelector("#vacation-total");

    vacationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!vacationForm.reportValidity()) {
        return;
      }

      const salary = Number(vacationForm.elements.namedItem("salary").value);
      const days = Number(vacationForm.elements.namedItem("days").value);
      const base = salary * days / 30;
      const constitutionalThird = base / 3;

      baseOutput.textContent = i18n.t("vacation.base", { value: formatCurrency(base) });
      thirdOutput.textContent = i18n.t("vacation.third", { value: formatCurrency(constitutionalThird) });
      totalOutput.textContent = i18n.t("vacation.total", {
        value: formatCurrency(base + constitutionalThird)
      });
      result.hidden = false;
    });

    document.addEventListener("site-language-change", () => {
      if (!result.hidden && vacationForm.checkValidity()) {
        vacationForm.requestSubmit();
      }
    });
  }

  const bankHoursForm = document.querySelector("#bank-hours-form");
  if (bankHoursForm) {
    const result = document.querySelector("#bank-hours-result");
    const totalOutput = document.querySelector("#bank-hours-total");
    const decimalOutput = document.querySelector("#bank-hours-decimal");

    bankHoursForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!bankHoursForm.reportValidity()) {
        return;
      }

      const previous = Number(bankHoursForm.elements.namedItem("previous").value);
      const credit = Number(bankHoursForm.elements.namedItem("credit").value);
      const debit = Number(bankHoursForm.elements.namedItem("debit").value);
      const balanceMinutes = Math.round((previous + credit - debit) * 60);
      const sign = balanceMinutes < 0 ? "−" : balanceMinutes > 0 ? "+" : "";
      const absoluteMinutes = Math.abs(balanceMinutes);
      const hours = Math.floor(absoluteMinutes / 60);
      const minutes = absoluteMinutes % 60;
      const decimalHours = balanceMinutes / 60;

      totalOutput.textContent = i18n.t("bankHours.balance", {
        sign,
        hours,
        minutes: String(minutes).padStart(2, "0")
      });
      decimalOutput.textContent = i18n.t("bankHours.decimal", {
        value: new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 2 }).format(decimalHours)
      });
      result.hidden = false;
    });

    document.addEventListener("site-language-change", () => {
      if (!result.hidden && bankHoursForm.checkValidity()) {
        bankHoursForm.requestSubmit();
      }
    });
  }

  const netSalaryForm = document.querySelector("#net-salary-form");
  if (netSalaryForm) {
    const result = document.querySelector("#net-salary-result");
    const inssOutput = document.querySelector("#net-salary-inss");
    const irrfOutput = document.querySelector("#net-salary-irrf");
    const otherOutput = document.querySelector("#net-salary-other-output");
    const totalOutput = document.querySelector("#net-salary-total");
    const inssBrackets = [
      { limit: 1621, rate: 0.075 },
      { limit: 2902.84, rate: 0.09 },
      { limit: 4354.27, rate: 0.12 },
      { limit: 8475.55, rate: 0.14 }
    ];
    const irrfBrackets = [
      { limit: 2428.80, rate: 0, deduction: 0 },
      { limit: 2826.65, rate: 0.075, deduction: 182.16 },
      { limit: 3751.05, rate: 0.15, deduction: 394.16 },
      { limit: 4664.68, rate: 0.225, deduction: 675.49 },
      { limit: Infinity, rate: 0.275, deduction: 908.73 }
    ];
    const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

    netSalaryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!netSalaryForm.reportValidity()) {
        return;
      }

      const gross = Number(netSalaryForm.elements.namedItem("gross").value);
      const dependents = Number(netSalaryForm.elements.namedItem("dependents").value);
      const otherDeductions = Number(netSalaryForm.elements.namedItem("other").value);
      let previousLimit = 0;
      let inss = 0;

      inssBrackets.forEach(({ limit, rate }) => {
        const taxablePortion = Math.max(0, Math.min(gross, limit) - previousLimit);
        inss += taxablePortion * rate;
        previousLimit = limit;
      });
      inss = roundMoney(inss);

      const dependentDeduction = dependents * 189.59;
      const simplifiedDeduction = 607.20;
      const taxableBase = Math.max(0, gross - Math.max(inss + dependentDeduction, simplifiedDeduction));
      const irrfBracket = irrfBrackets.find(({ limit }) => taxableBase <= limit);
      let irrf = Math.max(0, taxableBase * irrfBracket.rate - irrfBracket.deduction);
      let taxReduction = 0;

      if (gross <= 5000) {
        taxReduction = 312.89;
      } else if (gross <= 7350) {
        taxReduction = Math.max(0, 978.62 - 0.133145 * gross);
      }

      irrf = roundMoney(Math.max(0, irrf - taxReduction));
      const netSalary = roundMoney(gross - inss - irrf - otherDeductions);

      inssOutput.textContent = i18n.t("netSalary.inss", { value: formatCurrency(inss) });
      irrfOutput.textContent = i18n.t("netSalary.irrf", { value: formatCurrency(irrf) });
      otherOutput.textContent = i18n.t("netSalary.other", {
        value: formatCurrency(otherDeductions)
      });
      totalOutput.textContent = i18n.t("netSalary.total", { value: formatCurrency(netSalary) });
      result.hidden = false;
    });

    document.addEventListener("site-language-change", () => {
      if (!result.hidden && netSalaryForm.checkValidity()) {
        netSalaryForm.requestSubmit();
      }
    });
  }

  const severanceForm = document.querySelector("#severance-form");
  if (severanceForm) {
    const result = document.querySelector("#severance-result");
    const itemsOutput = document.querySelector("#severance-items");
    const totalOutput = document.querySelector("#severance-total");
    const scenarioInput = severanceForm.elements.namedItem("type");
    const thirteenthField = severanceForm.elements.namedItem("thirteenth-months").closest(".field-group");
    const proportionalVacationField = severanceForm.elements.namedItem("vacation-months").closest(".field-group");
    const noticeField = severanceForm.elements.namedItem("notice-days").closest(".field-group");
    const fgtsField = severanceForm.elements.namedItem("fgts").closest(".field-group");

    const setFieldVisibility = (field, visible) => {
      field.hidden = !visible;
      field.querySelector("input").disabled = !visible;
    };

    const updateScenarioFields = () => {
      const scenario = scenarioInput.value;
      const justCause = scenario === "just-cause";
      const noticePayable = scenario === "without-cause" || scenario === "agreement";

      setFieldVisibility(thirteenthField, !justCause);
      setFieldVisibility(proportionalVacationField, !justCause);
      setFieldVisibility(noticeField, noticePayable);
      setFieldVisibility(fgtsField, noticePayable);
    };

    scenarioInput.addEventListener("change", updateScenarioFields);
    updateScenarioFields();

    severanceForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!severanceForm.reportValidity()) {
        return;
      }

      const salary = Number(severanceForm.elements.namedItem("salary").value);
      const daysWorked = Number(severanceForm.elements.namedItem("days-worked").value);
      const thirteenthMonths = Number(severanceForm.elements.namedItem("thirteenth-months").value);
      const vacationMonths = Number(severanceForm.elements.namedItem("vacation-months").value);
      const accruedDays = Number(severanceForm.elements.namedItem("accrued-days").value);
      const noticeDays = Number(severanceForm.elements.namedItem("notice-days").value);
      const fgtsBalance = Number(severanceForm.elements.namedItem("fgts").value);
      const scenario = severanceForm.elements.namedItem("type").value;
      const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
      const rows = [
        ["severance.salaryBalance", roundMoney(salary * daysWorked / 30)]
      ];

      if (scenario !== "just-cause") {
        rows.push(
          ["severance.thirteenth", roundMoney(salary * thirteenthMonths / 12)],
          ["severance.proportionalVacation", roundMoney(salary * vacationMonths / 12 * 4 / 3)]
        );
      }

      if (accruedDays > 0) {
        rows.push(["severance.accruedVacation", roundMoney(salary * accruedDays / 30 * 4 / 3)]);
      }

      if (scenario === "without-cause" || scenario === "agreement") {
        const noticeFactor = scenario === "agreement" ? 0.5 : 1;
        const noticePay = roundMoney(salary * noticeDays / 30 * noticeFactor);
        const fineRate = scenario === "agreement" ? 0.2 : 0.4;
        rows.push(
          ["severance.notice", noticePay],
          ["severance.fgtsFine", roundMoney(fgtsBalance * fineRate)]
        );
      }

      const payableRows = rows.filter(([, amount]) => amount > 0);
      const total = roundMoney(payableRows.reduce((sum, [, amount]) => sum + amount, 0));
      itemsOutput.replaceChildren();

      payableRows.forEach(([key, amount]) => {
        const item = document.createElement("li");
        item.textContent = i18n.t(key, { value: formatCurrency(amount) });
        itemsOutput.append(item);
      });

      totalOutput.textContent = i18n.t("severance.total", { value: formatCurrency(total) });
      result.hidden = false;
    });

    document.addEventListener("site-language-change", () => {
      if (!result.hidden && severanceForm.checkValidity()) {
        severanceForm.requestSubmit();
      }
    });
  }
})();
