/* INÍCIO DA BUSCA E DOS FILTROS DA PÁGINA INICIAL */
(() => {
  "use strict";

  const searchInput = document.querySelector("#tool-search");
  const filterButtons = document.querySelectorAll(".filter-button");
  const toolCards = document.querySelectorAll(".tool-card");
  const emptyState = document.querySelector("#empty-state");
  const currentYear = document.querySelector("#current-year");
  const i18n = window.SiteI18n;

  if (!searchInput || !emptyState || filterButtons.length === 0 || toolCards.length === 0 || !i18n) {
    return;
  }

  let selectedCategory = "todas";

  const normalizeText = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(i18n.locale)
    .trim();

  const updateCards = () => {
    const searchTerm = normalizeText(searchInput.value);
    let visibleCardCount = 0;

    toolCards.forEach((card) => {
      const cardCategory = card.dataset.category || "";
      const searchableText = normalizeText(
        `${card.dataset.search || ""} ${card.textContent || ""}`
      );
      const matchesCategory = selectedCategory === "todas" || cardCategory === selectedCategory;
      const matchesSearch = searchableText.includes(searchTerm);
      const isVisible = matchesCategory && matchesSearch;

      card.hidden = !isVisible;
      if (isVisible) {
        visibleCardCount += 1;
      }
    });

    emptyState.hidden = visibleCardCount > 0;
  };

  searchInput.addEventListener("input", updateCards);

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category || "todas";
      filterButtons.forEach((filterButton) => {
        filterButton.setAttribute(
          "aria-pressed",
          String(filterButton === button)
        );
      });
      updateCards();
    });
  });

  if (currentYear) {
    currentYear.textContent = String(new Date().getFullYear());
  }
})();
/* FIM DA BUSCA E DOS FILTROS DA PÁGINA INICIAL */
