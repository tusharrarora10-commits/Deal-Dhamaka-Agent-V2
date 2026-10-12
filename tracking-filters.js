
/*
 * Deal Dhamaka Agent V2 — Tracking Filters Fix
 * Searchable multi-select Brand, Product Type and Recipient.
 * Adds recipient totals without modifying saved application data.
 */
(() => {
  "use strict";

  const FILTERS = [
    { id: "filterBrand", placeholder: "Search brands..." },
    { id: "filterType", placeholder: "Search product types..." },
    { id: "filterRecipient", placeholder: "Search recipients..." }
  ];

  const $ = id => document.getElementById(id);
  let refreshQueued = false;

  const style = document.createElement("style");
  style.textContent = `
    .tracking-filter-card .filter-search {
      display:block;
      width:100%;
      box-sizing:border-box;
      margin:0 0 8px;
      padding:11px 12px;
      border:1px solid #d1d5db;
      border-radius:10px;
      background:#fff;
      color:#121827;
      font:inherit;
      font-size:14px;
    }
    .tracking-filter-card .filter-search:focus {
      outline:2px solid #3478f6;
      outline-offset:1px;
    }
    .tracking-filter-card .filter-option[hidden] {
      display:none!important;
    }
    .recipient-total-row {
      display:flex;
      align-items:center;
      justify-content:space-between;
      flex-wrap:wrap;
      gap:8px;
      margin-top:8px;
      padding:13px 4px;
      border-top:2px solid #3478f6;
      font-size:14px;
    }
    .recipient-total-row strong {
      white-space:nowrap;
    }
  `;
  document.head.appendChild(style);

  function applySearch(container) {
    const search = container.querySelector(".filter-search");
    const query = (search ? search.value : "")
      .trim()
      .toLocaleLowerCase();

    container.querySelectorAll(".filter-option").forEach(option => {
      const label = (
        option.querySelector("span")?.textContent ||
        option.textContent ||
        ""
      ).trim().toLocaleLowerCase();

      option.hidden = !label.includes(query);
    });
  }

  function addSearch(config) {
    const container = $(config.id);
    if (!container) return;

    let search = container.querySelector(".filter-search");

    if (!search) {
      search = document.createElement("input");
      search.type = "search";
      search.className = "filter-search";
      search.placeholder = config.placeholder;
      search.setAttribute("aria-label", config.placeholder);
      search.autocomplete = "off";

      container.insertBefore(search, container.firstChild);

      search.addEventListener("input", () => {
        applySearch(container);
      });
    }

    applySearch(container);
  }

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

    const rows = [...report.querySelectorAll(".report-row")];
    let recipients = 0;
    let shares = 0;

    rows.forEach(row => {
      const strong = row.querySelector("strong");
      if (!strong) return;

      const firstText =
        row.querySelector("span")?.textContent || "";

      if (/^\s*total\b/i.test(firstText)) return;

      const value = Number(
        strong.textContent.trim().replace(/,/g, "")
      );

      if (!Number.isFinite(value)) return;

      recipients += 1;
      shares += value;
    });

    const summary = document.createElement("div");
    summary.className = "report-row recipient-total-row";

    const label = document.createElement("span");
    const bold = document.createElement("b");
    bold.textContent = "TOTAL";

    label.append(
      bold,
      document.createTextNode(" · " + recipients + " recipients")
    );

    const count = document.createElement("strong");
    count.textContent = shares + " shares";

    summary.append(label, count);
    totalBox.replaceChildren(summary);
  }

  function enhanceAll() {
    FILTERS.forEach(addSearch);
    updateRecipientTotal();
  }

  function queueEnhance() {
    if (refreshQueued) return;

    refreshQueued = true;

    requestAnimationFrame(() => {
      refreshQueued = false;
      enhanceAll();
    });
  }

  function installObservers() {
    FILTERS.forEach(config => {
      const container = $(config.id);
      if (!container) return;

      const observer = new MutationObserver(() => {
        queueEnhance();
      });

      observer.observe(container, {
        childList: true
      });
    });

    const report = $("recipientCounts");

    if (report) {
      const observer = new MutationObserver(() => {
        queueEnhance();
      });

      observer.observe(report, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  function install() {
    enhanceAll();
    installObservers();

    document.querySelectorAll(
      '.tabbar button[data-page="tracking"]'
    ).forEach(button => {
      button.addEventListener("click", queueEnhance);
    });

    $("refreshTracking")?.addEventListener(
      "click",
      queueEnhance
    );

    $("clearFilters")?.addEventListener("click", () => {
      requestAnimationFrame(() => {
        FILTERS.forEach(config => {
          const container = $(config.id);
          const search =
            container?.querySelector(".filter-search");

          if (search) search.value = "";
          if (container) applySearch(container);
        });

        updateRecipientTotal();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, {
      once: true
    });
  } else {
    install();
  }
})();
