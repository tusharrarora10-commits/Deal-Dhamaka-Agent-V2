
(function () {
  "use strict";

  let selectedPeriod = "all";

  const style = document.createElement("style");
  style.textContent = `
    .advanced-dashboard { margin-top:18px; }
    .dashboard-heading {
      display:flex; align-items:center; justify-content:space-between;
      gap:10px; flex-wrap:wrap; margin:22px 0 10px;
    }
    .dashboard-heading h3 { margin:0; font-size:20px; }
    .dashboard-subtitle {
      color:var(--muted); font-size:13px; margin:5px 0 12px;
    }
    .dashboard-period {
      width:100%; margin:8px 0 12px; min-height:46px;
    }
    .dashboard-grid {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px; margin:12px 0;
    }
    .dashboard-metric {
      background:#fff; border:1px solid var(--line);
      border-radius:18px; padding:16px; min-width:0;
    }
    .dashboard-metric .metric-label {
      color:var(--muted); font-size:12px; font-weight:700;
    }
    .dashboard-metric .metric-value {
      display:block; font-size:27px; font-weight:850;
      margin:7px 0 4px; overflow-wrap:anywhere;
    }
    .dashboard-metric .metric-note {
      color:var(--muted); font-size:12px;
    }
    .dashboard-list-item {
      display:flex; align-items:center; justify-content:space-between;
      gap:12px; padding:13px 0; border-bottom:1px solid var(--line);
    }
    .dashboard-list-item:last-child { border-bottom:0; }
    .dashboard-list-item strong {
      display:block; overflow-wrap:anywhere;
    }
    .dashboard-list-item small {
      color:var(--muted); display:block; margin-top:4px;
    }
    .dashboard-count {
      background:#eef2ff; border-radius:12px;
      padding:7px 10px; font-weight:800; white-space:nowrap;
    }
    .dashboard-bar-track {
      height:7px; background:#e5e7eb; border-radius:9px;
      overflow:hidden; margin-top:8px;
    }
    .dashboard-bar-fill {
      height:100%; background:var(--blue); border-radius:9px;
    }
    .dashboard-actions {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:9px; margin:12px 0 20px;
    }
    .dashboard-actions button { width:100%; min-height:48px; }
    .dashboard-empty {
      color:var(--muted); padding:15px 0; font-size:14px;
    }
    .dashboard-recent-status {
      font-size:12px; color:var(--muted); margin-top:5px;
    }
    @media(min-width:650px) {
      .dashboard-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
      .dashboard-actions { grid-template-columns:repeat(5,minmax(0,1fr)); }
      .dashboard-period { max-width:260px; }
    }
  `;
  document.head.appendChild(style);

  function metric(label, value, note) {
    return `
      <div class="dashboard-metric">
        <span class="metric-label">${esc(label)}</span>
        <strong class="metric-value">${esc(value)}</strong>
        <span class="metric-note">${esc(note)}</span>
      </div>`;
  }

  function countBy(items, getKey) {
    const counts = {};
    items.forEach(item => {
      const key = getKey(item) || "Unspecified";
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
  }

  function listMarkup(rows, emptyText, maxItems) {
    if (!rows.length) {
      return `<div class="dashboard-empty">${esc(emptyText)}</div>`;
    }

    const max = Math.max(...rows.map(row => row[1]), 1);

    return rows.slice(0, maxItems).map(([name, count]) => `
      <div class="dashboard-list-item">
        <div style="flex:1;min-width:0">
          <strong>${esc(name)}</strong>
          <div class="dashboard-bar-track">
            <div class="dashboard-bar-fill"
              style="width:${Math.max(3, count / max * 100)}%">
            </div>
          </div>
        </div>
        <span class="dashboard-count">${count}</span>
      </div>
    `).join("");
  }

  function getPeriodShares(shares) {
    const now = new Date();
    let start = 0;

    if (selectedPeriod === "today") {
      start = new Date(
        now.getFullYear(), now.getMonth(), now.getDate()
      ).getTime();
    } else if (selectedPeriod === "7days") {
      start = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (selectedPeriod === "30days") {
      start = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }

    return shares.filter(item => {
      const time = Number(item.time);
      return Number.isFinite(time) && time > 0 && time >= start;
    });
  }

  function renderAdvancedDashboard() {
    const home = document.getElementById("dashboard");
    if (!home || typeof state === "undefined") return;

    let panel = document.getElementById("advancedDashboard");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "advancedDashboard";
      panel.className = "advanced-dashboard";

      const stats = home.querySelector(".stats");
      if (stats) {
        stats.insertAdjacentElement("afterend", panel);
      } else {
        home.appendChild(panel);
      }
    }

    const contacts = Array.isArray(state.contacts) ? state.contacts : [];
    const products = Array.isArray(state.products) ? state.products : [];
    const shares = Array.isArray(state.shares) ? state.shares : [];

    const periodShares = getPeriodShares(shares);
    const ordered = periodShares.filter(item => !!item.ordered).length;
    const pending = periodShares.length - ordered;
    const orderRate = periodShares.length
      ? Math.round(ordered / periodShares.length * 100)
      : 0;

    const brands = countBy(periodShares, item => item.brand);
    const types = countBy(periodShares, item => item.productType);

    const recent = [...periodShares]
      .sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
      .slice(0, 5);

    const periodLabels = {
      today: "Today",
      "7days": "Last 7 Days",
      "30days": "Last 30 Days",
      all: "All Time"
    };

    panel.innerHTML = `
      <div class="dashboard-heading">
        <h3>Performance Overview</h3>
      </div>
      <p class="dashboard-subtitle">
        Review your saved records, order progress and sharing activity.
      </p>

      <label for="dashboardPeriod">Activity period</label>
      <select id="dashboardPeriod" class="dashboard-period">
        <option value="today" ${selectedPeriod === "today" ? "selected" : ""}>
          Today
        </option>
        <option value="7days" ${selectedPeriod === "7days" ? "selected" : ""}>
          Last 7 Days
        </option>
        <option value="30days" ${selectedPeriod === "30days" ? "selected" : ""}>
          Last 30 Days
        </option>
        <option value="all" ${selectedPeriod === "all" ? "selected" : ""}>
          All Time
        </option>
      </select>

      <div class="dashboard-grid">
        ${metric("Total Contacts", contacts.length, "Saved contacts")}
        ${metric("Total Products", products.length, "Saved products")}
        ${metric("All Share Attempts", shares.length, "All recorded attempts")}
        ${metric("Activity", periodShares.length,
          periodLabels[selectedPeriod] + " share attempts")}
        ${metric("Ordered", ordered, "Marked as ordered in this period")}
        ${metric("Pending", pending, "Not marked as ordered in this period")}
        ${metric("Recorded Order Rate", orderRate + "%",
          "Ordered ÷ recorded share attempts")}
        ${metric(
          "Recipients",
          new Set(periodShares.map(item => item.contactName).filter(Boolean)).size,
          "Distinct recipients in this period"
        )}
      </div>

      <div class="dashboard-heading">
        <h3>Quick Actions</h3>
      </div>
      <div class="dashboard-actions">
        <button class="primary" data-dashboard-page="send">↗ Send Deal</button>
        <button class="secondary" data-dashboard-page="products">▣ Products</button>
        <button class="secondary" data-dashboard-page="contacts">♙ Contacts</button>
        <button class="secondary" data-dashboard-page="history">◷ History</button>
        <button class="secondary" data-dashboard-page="tracking">📊 Tracking</button>
      </div>

      <div class="card">
        <h3>Top Brands</h3>
        <p class="dashboard-subtitle">
          Ranked by ${esc(periodLabels[selectedPeriod].toLowerCase())} attempts
        </p>
        ${listMarkup(brands, "No brand activity in this period.", 5)}
      </div>

      <div class="card">
        <h3>Top Product Types</h3>
        <p class="dashboard-subtitle">
          Ranked by ${esc(periodLabels[selectedPeriod].toLowerCase())} attempts
        </p>
        ${listMarkup(types, "No product-type activity in this period.", 5)}
      </div>

      <div class="card">
        <h3>Recent Activity</h3>
        <p class="dashboard-subtitle">
          Latest recorded attempts: ${esc(periodLabels[selectedPeriod])}
        </p>
        ${recent.length ? recent.map(item => `
          <div class="dashboard-list-item">
            <div style="flex:1;min-width:0">
              <strong>${esc(item.contactName || "Unknown contact")}</strong>
              <small>${esc(item.productName || item.brand || "Unknown product")}</small>
              <div class="dashboard-recent-status">
                ${esc(item.status || "Share attempt recorded")}
                · ${Number(item.time)
                  ? esc(new Date(Number(item.time)).toLocaleString())
                  : "Date unavailable"}
              </div>
            </div>
            <span class="dashboard-count">
              ${item.ordered ? "Ordered" : "Pending"}
            </span>
          </div>
        `).join("") : `
          <div class="dashboard-empty">
            No activity recorded in this period.
          </div>
        `}
      </div>

      <p class="hint">
        Order rate is based on records you marked as ordered, not confirmed
        purchases or unique orders. A share attempt does not confirm that
        a WhatsApp message was sent or delivered.
      </p>
    `;

    const periodSelect = document.getElementById("dashboardPeriod");
    periodSelect.addEventListener("change", () => {
      selectedPeriod = periodSelect.value;
      renderAdvancedDashboard();
    });

    panel.querySelectorAll("[data-dashboard-page]").forEach(button => {
      button.addEventListener("click", () => {
        if (typeof showPage === "function") {
          showPage(button.dataset.dashboardPage);
        }
      });
    });
  }

  // Refresh the dashboard whenever the existing app saves its data.
  if (typeof save === "function") {
    const originalSave = save;
    save = function () {
      originalSave();
      renderAdvancedDashboard();
    };
  }

  renderAdvancedDashboard();

  document.querySelectorAll('.tabbar button[data-page="dashboard"]')
    .forEach(button => {
      button.addEventListener("click", renderAdvancedDashboard);
    });
})();
