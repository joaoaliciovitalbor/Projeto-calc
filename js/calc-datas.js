/* INÍCIO DA CALCULADORA DE DIAS E PRAZOS */
(() => {
  "use strict";

  const form = document.querySelector("#dates-form");
  const result = document.querySelector("#dates-result");
  const rangeOutput = document.querySelector("#dates-range");
  const calendarDaysOutput = document.querySelector("#calendar-days");
  const businessDaysOutput = document.querySelector("#business-days");
  const i18n = window.SiteI18n;

  if (!form || !result || !rangeOutput || !calendarDaysOutput || !businessDaysOutput || !i18n) {
    return;
  }

  const parseDateAsUtc = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };

  const formatDate = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(i18n.locale, {
      timeZone: "UTC",
      dateStyle: "long"
    }).format(new Date(Date.UTC(year, month - 1, day)));
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const startValue = form.elements.namedItem("start-date").value;
    const endValue = form.elements.namedItem("end-date").value;
    const start = parseDateAsUtc(startValue);
    const end = parseDateAsUtc(endValue);

    if (end < start) {
      form.elements.namedItem("end-date").setCustomValidity(i18n.t("dates.endBeforeStart"));
      form.reportValidity();
      form.elements.namedItem("end-date").setCustomValidity("");
      return;
    }

    const dayMilliseconds = 24 * 60 * 60 * 1000;
    const calendarDays = Math.round((end - start) / dayMilliseconds);
    let businessDays = 0;

    for (let date = start + dayMilliseconds; date <= end; date += dayMilliseconds) {
      const weekday = new Date(date).getUTCDay();
      if (weekday !== 0 && weekday !== 6) {
        businessDays += 1;
      }
    }

    rangeOutput.textContent = i18n.t("dates.period", {
      start: formatDate(startValue),
      end: formatDate(endValue)
    });
    calendarDaysOutput.textContent = i18n.t(calendarDays === 1 ? "dates.calendarDay" : "dates.calendarDays", {
      count: calendarDays
    });
    businessDaysOutput.textContent = i18n.t(businessDays === 1 ? "dates.businessDay" : "dates.businessDays", {
      count: businessDays
    });
    result.hidden = false;
  });

  document.addEventListener("site-language-change", () => {
    if (!result.hidden) {
      if (form.checkValidity()) {
        form.requestSubmit();
      } else {
        result.hidden = true;
      }
    }
  });
})();
/* FIM DA CALCULADORA DE DIAS E PRAZOS */
