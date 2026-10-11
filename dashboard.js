
(function () {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    .advanced-dashboard { margin-top: 18px; }
    .dashboard-heading {
      display:flex; align-items:center; justify-content:space-between;
      gap:10px; margin:22px 0 10px;
    }
    .dashboard-heading h3 { margin:0; font-size:20px; }
    .dashboard-subtitle { color:var(--muted); font-size:13px; margin:5px 0 12px; }
    .dashboard-grid {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px; margin:12px 0;
    }
    .dashboard-metric {
      background:#fff; border:1px solid var(--line); border-radius:18px;
      padding:16px; min-width:0;
    }
    .dashboard-metric .metric-label {
      color:var(--muted); font-size:12px; font-weight:700;
    }
    .dashboard-metric .metric-value {
      display:block; font-size:27px; font-weight:850;
      margin:7px 0 4px; overflow-wrap:anywhere;
    }
    .dashboard-metric .metric-note { color:var(--muted); font-size:12px; }
    .dashboard-list-item {
      display:flex; align-items:center; justify-content:space-between;
      gap:12px; padding:13px 0; border-bottom:1px solid var(--line);
    }
    .dashboard-list-item:last-child { border-bottom:0; }
    .dashboard-list-item strong { display:block; overflow-wrap:anywhere; }
    .dashboard-list-item small { color:var(--muted); display:block; margin-top:4px; }
    .dashboard-count {
      background:#eef2ff; border-radius:12px; padding:7px 10px;
      font-weight:800; white-space:nowrap;
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
    .dashboard-empty { color:var(--muted); padding:15px 0; font-size:14px; }
    .dashboard-recent-status { font-size:12px; color:var(--muted); margin-top:5px; }
    @media(min-width:650px) {
      .dashboard-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
      .dashboard-actions { grid-template-columns:repeat(5,minmax(0,1fr)); }
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
              style="width:${Math.max(3, count / max * 100)}%"></div>
          </div>
        </div>
        <span class="dashboard-count">${count}</span>
      </div>
    `).join("");
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
      if (stats) stats.insertAdjacentElement("afterend", panel);
      else home.appendChild(panel);
    }

    const contacts = Array.isArray(state.contacts) ? state.contacts : [];
    const products = Array.isArray(state.products) ? state.products : [];
    const shares = Array.isArray(state.shares) ? state.shares : [];

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(), now.getMonth(), now.getDate()
    ).getTime();
    const monthStart = new Date(
      now.getFullYear(), now.getMonth(), 1
    ).getTime();

    const todayShares = shares.filter(x => Number(x.time) >= todayStart);
    const monthShares = shares.filter(x => Number(x.time) >= monthStart);
    const ordered = shares.filter(x => x.ordered).length;

    const brands = countBy(shares, x => x.brand);
    const types = countBy(shares, x => x.productType);
    const recent = [...shares]
      .sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
      .slice(0, 5);

    panel.innerHTML = `
      <div class="dashboard-heading">
        <h3>Performance Overview</h3>
      </div>
      <p class="dashboard-subtitle">
        Your saved records and sharing activity at a glance.
      </p>

      <div class="dashboard-grid">
        ${metric("Total Contacts", contacts.length, "Saved contacts")}
        ${metric("Total Products", products.length, "Saved products")}
        ${metric("Share Attempts", shares.length, "All recorded attempts")}
        ${metric("Products Ordered", ordered, "Marked as ordered")}
        ${metric("Today", todayShares.length, "Attempts today")}
        ${metric("This Month", monthShares.length, "Attempts this month")}
        ${metric(
          "Brands Shared",
          new Set(shares.map(x => x.brand).filter(Boolean)).size,
          "Distinct recorded brands"
        )}
        ${metric(
          "Recipients Reached",
          new Set(shares.map(x => x.contactName).filter(Boolean)).size,
          "Distinct recorded recipients"
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
        <p class="dashboard-subtitle">Ranked by recorded share attempts</p>
        ${listMarkup(brands, "No brand activity recorded yet.", 5)}
      </div>

      <div class="card">
        <h3>Top Product Types</h3>
        <p class="dashboard-subtitle">Ranked by recorded share attempts</p>
        ${listMarkup(types, "No product-type activity recorded yet.", 5)}
      </div>

      <div class="card">
        <h3>Recent Activity</h3>
        <p class="dashboard-subtitle">Your five latest recorded attempts</p>
        ${recent.length ? recent.map(x => `
          <div class="dashboard-list-item">
            <div style="flex:1;min-width:0">
              <strong>${esc(x.contactName || "Unknown contact")}</strong>
              <small>${esc(x.productName || x.brand || "Unknown product")}</small>
              <div class="dashboard-recent-status">
                ${esc(x.status || "Share attempt recorded")}
                · ${Number(x.time)
                  ? esc(new Date(Number(x.time)).toLocaleString())
                  : "Date unavailable"}
              </div>
            </div>
            <span class="dashboard-count">${x.ordered ? "Ordered" : "Recorded"}</span>
          </div>
        `).join("") : `
          <div class="dashboard-empty">
            No activity recorded yet. Start by sharing a deal.
          </div>
        `}
      </div>

      <p class="hint">
        Counts reflect records saved in this browser. A WhatsApp share attempt
        does not by itself confirm that a message was sent or delivered.
      </p>
    `;

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

  // Render once after the original app has loaded.
  renderAdvancedDashboard();

  // Also refresh when returning to the Home tab.
  document.querySelectorAll('.tabbar button[data-page="dashboard"]').forEach(button => {
    button.addEventListener("click", renderAdvancedDashboard);
  });
})();
