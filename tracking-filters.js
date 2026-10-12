
/*
 * Deal Dhamaka Agent V2
 * Searchable Tracking Filters + Recipient Total
 *
 * Keeps the existing app.js and localStorage data intact.
 * Supports multiple selections for Brand, Product Type and Recipient.
 */
(() => {
  "use strict";

  const FILTERS = [
    {
      id: "filterBrand",
      label: "Search brands...",
      summaryId: "brandFilterSummary",
      allLabel: "All Brands"
    },
    {
      id: "filterType",
      label: "Search product types...",
      summaryId: "typeFilterSummary",
      allLabel: "All Product Types"
    },
    {
      id: "filterRecipient",
      label: "Search recipients...",
      summaryId: "recipientFilterSummary",
      allLabel: "All Recipients"
    }
  ];

  const $ = id => document.getElementById(id);

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  const style = document.createElement("style");

  style.textContent = `
    .tracking-filter-card .filter-search {
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin: 0 0 8px;
      padding: 11px 12px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #fff;
      color: #121827;
      font: inherit;
      font-size: 14px;
    }

    .tracking-filter-card .filter-search:focus {
      outline: 2px solid #3478f6;
      outline-offset: 1px;
      border-color: #3478f6;
    }

    .tracking-filter-card .filter-option[hidden] {
      display: none !important;
    }

    .tracking-filter-card .filter-search-status {
      padding: 7px 3px;
      color: #6b7280;
      font-size: 12px;
    }

    .recipient-total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
      padding: 13px 4px;
      border-top: 2px solid #3478f6;
      font-size: 14px;
    }

    .recipient-total-row strong {
      white-space: nowrap;
    }
  `;

  document.head.appendChild(style);

  /*
   * Add a search field to each existing multi-select filter.
   * Existing checkboxes and selections are preserved.
   */
  function enhanceFilter(config) {
    const container = $(config.id);
    if (!container) return;

    let search = container.querySelector(".filter-search");

    if (!search) {
      search = document.createElement("input");
      search.type = "search";
      search.className = "filter-search";
      search.placeholder = config.label;
      search.setAttribute("aria-label", config.label);
      search.autocomplete = "off";

      container.insertBefore(search, container.firstChild);

      search.addEventListener("input", () => {
        filterOptions(container, search.value);
      });
    }

    filterOptions(container, search.value);
  }

  function filterOptions(container, searchText) {
    const query = String(searchText || "")
      .trim()
      .toLocaleLowerCase();

    const options = [
      ...container.querySelectorAll(".filter-option")
    ];

    let visibleCount = 0;

    options.forEach(option => {
      const text = option.textContent
        .trim()
        .toLocaleLowerCase();

      const visible = text.includes(query);
      option.hidden = !visible;

      if (visible) visibleCount++;
    });

    let status = container.querySelector(
      ".filter-search-status"
    );

    if (!status) {
      status = document.createElement("div");
      status.className = "filter-search-status";
      status.setAttribute("aria-live", "polite");
      container.appendChild(status);
    }

    if (query && options.length) {
      status.textContent = visibleCount
        ? `${visibleCount} matching option(s)`
        : "No matching options";
      status.hidden = false;
    } else {
      status.textContent = "";
      status.hidden = true;
    }
  }

  /*
   * Read the currently visible Recipient-wise Count report.
   * The existing app.js renders each recipient as .report-row.
   */
  function updateRecipientTotal() {
    const report = $("recipientCounts");
    if (!report) return;

    let totalBox = $("recipientCountTotal");

    if (!totalBox) {
      totalBox = document.createElement("div");
      totalBox.id = "recipientCountTotal";
      totalBox.className = "report";

      report.insertAdjacentElement("afterend", totalBox);
    }

    const rows = [
      ...report.querySelectorAll(".report-row")
    ];

    let recipientCount = 0;
    let shareCount = 0;

    rows.forEach(row => {
      const label = row.querySelector("span");
      const number = row.querySelector("strong");

      if (!number) return;

      const name = (label?.textContent || "")
        .trim()
        .toLocaleLowerCase();

      // Do not count a pre-existing TOTAL row as a recipient.
      if (name === "total" || name.startsWith("total ")) {
        return;
      }

      const countText = number.textContent
        .trim()
        .replace(/,/g, "");

      const count = Number(countText);

      if (!Number.isFinite(count)) return;

      recipientCount++;
      shareCount += count;
    });

    totalBox.innerHTML = `
      <div class="report-row recipient-total-row">
        <span>
          <b>TOTAL</b> · ${recipientCount} recipient(s)
        </span>
        <strong>${shareCount} shares</strong>
      </div>
    `;
  }

  /*
   * Preserve the existing filters' selected values.
   * Search text only hides options; it never unchecks them.
   */
  function enhanceAll() {
    FILTERS.forEach(enhanceFilter);
    updateRecipientTotal();
  }

  /*
   * app.js may rebuild the filter lists and report after a selection,
   * refresh, date change, or order-status change. Observe those updates
   * so search boxes and totals remain available.
   */
  function installObservers() {
    const filterCard = document.querySelector(
      ".tracking-filter-card"
    );

    if (filterCard) {
      const filterObserver = new MutationObserver(() => {
        FILTERS.forEach(config => {
          const container = $(config.id);
          if (container) {
            enhanceFilter(config);
          }
        });
      });

      filterObserver.observe(filterCard, {
        childList: true,
        subtree: true
      });
    }

    const report = $("recipientCounts");

    if (report) {
      const reportObserver = new MutationObserver(() => {
        updateRecipientTotal();
      });

      reportObserver.observe(report, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  function install() {
    enhanceAll();
    installObservers();

    // Reapply enhancements when the Tracking tab is opened.
    document.querySelectorAll(
      '.tabbar button[data-page="tracking"]'
    ).forEach(button => {
      button.addEventListener("click", () => {
        window.setTimeout(enhanceAll, 0);
      });
    });

    // Keep the total current when the existing Refresh button is used.
    const refresh = $("refreshTracking");

    if (refresh) {
      refresh.addEventListener("click", () => {
        window.setTimeout(enhanceAll, 0);
      });
    }

    // Clear search text when Clear Filters is used.
    const clear = $("clearFilters");

    if (clear) {
      clear.addEventListener("click", () => {
        window.setTimeout(() => {
          FILTERS.forEach(config => {
            const container = $(config.id);
            const search = container?.querySelector(
              ".filter-search"
            );

            if (search) search.value = "";
            if (container) filterOptions(container, "");
          });

          updateRecipientTotal();
        }, 0);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, {
      once: true
    });
  } else {
    install();
  }
})();
