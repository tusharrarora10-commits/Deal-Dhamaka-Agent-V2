
(function () {
  "use strict";

  let selectedPeriod = "all";

  const style = document.createElement("style");
  style.textContent = `
    .advanced-dashboard { margin-top: 18px; }
    .dashboard-heading {
      display:flex; align-items:center; justify-content:space-between;
      gap:10px; flex-wrap:wrap; margin:20px 0 10px;
    }
    .dashboard-heading h3 { margin:0; font-size:19px; }
    .dashboard-subtitle {
      color:var(--muted); font-size:12px; line-height:1.5;
      margin:5px 0 12px;
    }
    .dashboard-period { width:100%; margin:6px 0 12px; }
    .dashboard-grid {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:9px; margin:12px 0;
    }
    .dashboard-metric {
      background:#fff; border:1px solid var(--line);
      border-radius:16px; padding:13px; min-width:0;
    }
    .dashboard-metric .metric-label {
      color:var(--muted); font-size:11px; font-weight:750;
    }
    .dashboard-metric .metric-value {
      display:block; font-size:25px; font-weight:850;
      margin:7px 0 4px; overflow-wrap:anywhere;
    }
    .dashboard-metric .metric-note {
      color:var(--muted); font-size:11px; line-height:1.4;
    }
    .dashboard-actions {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px; margin:12px 0 20px;
    }
    .dashboard-actions button { width:100%; min-height:43px; }
    .dashboard-chart-card {
      background:#fff; border:1px solid var(--line);
      border-radius:17px; padding:14px; margin:12px 0;
      overflow:hidden;
    }
    .dashboard-chart-card h3 { margin:0 0 5px; font-size:16px; }
    .dashboard-chart {
      width:100%; overflow-x:auto; overflow-y:hidden;
      -webkit-overflow-scrolling:touch;
    }
    .dashboard-chart svg { display:block; max-width:100%; height:auto; }
    .dashboard-legend {
      display:flex; flex-wrap:wrap; gap:12px;
      color:var(--muted); font-size:11px; margin:8px 0;
    }
    .dashboard-legend span { display:inline-flex; align-items:center; gap:5px; }
    .dashboard-dot { width:9px; height:9px; border-radius:50%; display:inline-block; }
    .dashboard-list-item {
      display:flex; align-items:center; justify-content:space-between;
      gap:10px; padding:11px 0; border-bottom:1px solid var(--line);
    }
    .dashboard-list-item:last-child { border-bottom:0; }
    .dashboard-list-item strong { display:block; overflow-wrap:anywhere; }
    .dashboard-list-item small {
      color:var(--muted); display:block; margin-top:4px; line-height:1.4;
    }
    .dashboard-count {
      background:#eef2ff; border-radius:10px;
      padding:7px 9px; font-weight:800; white-space:nowrap; font-size:12px;
    }
    .dashboard-bar-track {
      height:7px; background:#e5e7eb; border-radius:9px;
      overflow:hidden; margin-top:7px;
    }
    .dashboard-bar-fill { height:100%; background:var(--blue); border-radius:9px; }
    .dashboard-empty { color:var(--muted); padding:14px 0; font-size:13px; }
    .dashboard-table-wrap {
      overflow-x:auto; width:100%; -webkit-overflow-scrolling:touch;
    }
    .dashboard-table {
      width:100%; min-width:650px; border-collapse:collapse; font-size:12px;
    }
    .dashboard-table th,.dashboard-table td {
      padding:10px 7px; border-bottom:1px solid var(--line);
      text-align:right; white-space:nowrap;
    }
    .dashboard-table th:first-child,.dashboard-table td:first-child {
      text-align:left; white-space:normal; min-width:125px;
    }
    .dashboard-table thead th { color:var(--muted); }
    .dashboard-table tfoot { font-weight:850; }
    .dashboard-table tfoot td { border-top:2px solid #999; }
    .dashboard-warning { color:var(--red); font-size:11px; display:block; }
    .dashboard-recent-status { font-size:11px; color:var(--muted); margin-top:5px; }
    .dashboard-insight {
      padding:12px; border-radius:12px; background:#f3f4f6;
      font-size:12px; line-height:1.5; margin:10px 0;
    }
    @media(min-width:650px) {
      .dashboard-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
      .dashboard-actions { grid-template-columns:repeat(5,minmax(0,1fr)); }
      .dashboard-period { max-width:260px; }
      .dashboard-charts-grid {
        display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px;
      }
    }
  `;
  document.head.appendChild(style);

  const moneylessNumber = value => {
    const n = Number(value) || 0;
    return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  };

  function escText(value) {
    if (typeof esc === "function") return esc(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
  }

  function safeQty(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
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
      return Number.isFinite(time) && time > 0 && time >= start && time <= now.getTime();
    });
  }

  function countBy(items, getKey) {
    const counts = new Map();

    items.forEach(item => {
      const key = String(getKey(item) || "Unspecified").trim() || "Unspecified";
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
  }

  function productStatus(products, shares, dimension) {
    const groups = new Map();

    products.forEach(p => {
      const brand = String(p.brand || p.name || "Unspecified").trim() || "Unspecified";
      const type = String(p.productType || "Unspecified").trim() || "Unspecified";
      const label = dimension === "brand" ? brand : type;

      if (!groups.has(label)) {
        groups.set(label, { allotted:0, shared:0, ordered:0 });
      }

      groups.get(label).allotted += safeQty(p.allottedQty);
    });

    shares.forEach(s => {
      const label = String(
        dimension === "brand"
          ? (s.brand || s.productName || "Unspecified")
          : (s.productType || "Unspecified")
      ).trim() || "Unspecified";

      if (!groups.has(label)) {
        groups.set(label, { allotted:0, shared:0, ordered:0 });
      }

      const row = groups.get(label);
      row.shared++;
      if (s.ordered) row.ordered++;
    });

    return [...groups.entries()].map(([label, v]) => ({
      label,
      ...v,
      pendingAllotted: Math.max(0, v.allotted - v.shared),
      pendingOrdered: Math.max(0, v.shared - v.ordered),
      overAllocated: Math.max(0, v.shared - v.allotted)
    })).sort((a, b) =>
      b.shared - a.shared || a.label.localeCompare(b.label)
    );
  }

  function metric(label, value, note) {
    return `
      <div class="dashboard-metric">
        <span class="metric-label">${escText(label)}</span>
        <strong class="metric-value">${escText(value)}</strong>
        <span class="metric-note">${escText(note)}</span>
      </div>`;
  }

  function listMarkup(rows, emptyText, maxItems = 8) {
    if (!rows.length) {
      return `<div class="dashboard-empty">${escText(emptyText)}</div>`;
    }

    const max = Math.max(...rows.map(row => row[1]), 1);

    return rows.slice(0, maxItems).map(([name, count], i) => `
      <div class="dashboard-list-item">
        <div style="flex:1;min-width:0">
          <strong>${i + 1}. ${escText(name)}</strong>
          <div class="dashboard-bar-track">
            <div class="dashboard-bar-fill" style="width:${Math.max(2, count / max * 100)}%"></div>
          </div>
        </div>
        <span class="dashboard-count">${count}</span>
      </div>
    `).join("");
  }

  function buildTrend(shares) {
    const now = new Date();
    const map = new Map();
    let keys = [];

    if (selectedPeriod === "today") {
      for (let h = 0; h <= now.getHours(); h++) {
        const key = String(h).padStart(2, "0");
        keys.push(key);
        map.set(key, { label: key + ":00", shared:0, ordered:0 });
      }
      shares.forEach(s => {
        const d = new Date(Number(s.time));
        const key = String(d.getHours()).padStart(2, "0");
        if (!map.has(key)) map.set(key, { label:key + ":00", shared:0, ordered:0 });
        map.get(key).shared++;
        if (s.ordered) map.get(key).ordered++;
      });
      keys = [...map.keys()].sort();
    } else if (selectedPeriod === "7days" || selectedPeriod === "30days") {
      const days = selectedPeriod === "7days" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.getFullYear() + "-" +
          String(d.getMonth() + 1).padStart(2, "0") + "-" +
          String(d.getDate()).padStart(2, "0");
        keys.push(key);
        map.set(key, {
          label: d.toLocaleDateString(undefined, { month:"short", day:"numeric" }),
          shared:0,
          ordered:0
        });
      }
      shares.forEach(s => {
        const d = new Date(Number(s.time));
        const key = d.getFullYear() + "-" +
          String(d.getMonth() + 1).padStart(2, "0") + "-" +
          String(d.getDate()).padStart(2, "0");
        if (map.has(key)) {
          map.get(key).shared++;
          if (s.ordered) map.get(key).ordered++;
        }
      });
    } else {
      // All-time trend: show the last 12 calendar months, or all available
      // months if the dataset is shorter.
      const first = shares.length
        ? new Date(Math.min(...shares.map(s => Number(s.time) || now.getTime())))
        : new Date(now.getFullYear(), now.getMonth(), 1);

      const start = new Date(
        Math.min(first.getFullYear(), now.getFullYear()),
        first.getMonth(),
        1
      );

      const monthCount = Math.max(
        1,
        Math.min(
          120,
          (now.getFullYear() - start.getFullYear()) * 12 +
          now.getMonth() - start.getMonth() + 1
        )
      );

      const fromIndex = Math.max(0, monthCount - 12);
      for (let i = fromIndex; i < monthCount; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        keys.push(key);
        map.set(key, {
          label: d.toLocaleDateString(undefined, { month:"short", year:"2-digit" }),
          shared:0,
          ordered:0
        });
      }

      shares.forEach(s => {
        const d = new Date(Number(s.time));
        const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
        if (map.has(key)) {
          map.get(key).shared++;
          if (s.ordered) map.get(key).ordered++;
        }
      });
    }

    return keys.map(key => ({ key, ...map.get(key) }));
  }

  function trendChart(shares) {
    const data = buildTrend(shares);
    const width = Math.max(320, data.length * 38);
    const height = 205;
    const left = 28, right = 10, top = 18, bottom = 42;
    const chartW = width - left - right;
    const chartH = height - top - bottom;
    const maxVal = Math.max(1, ...data.map(d => Math.max(d.shared, d.ordered)));
    const x = i => left + (data.length <= 1 ? chartW / 2 : i * chartW / (data.length - 1));
    const y = n => top + chartH - (n / maxVal) * chartH;

    const sharePoints = data.map((d, i) => `${x(i)},${y(d.shared)}`).join(" ");
    const orderPoints = data.map((d, i) => `${x(i)},${y(d.ordered)}`).join(" ");

    const grid = [0, 0.5, 1].map(r => {
      const yy = top + chartH * r;
      const val = Math.round(maxVal * (1 - r));
      return `
        <line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="#e5e7eb" stroke-width="1"/>
        <text x="${left-7}" y="${yy+4}" text-anchor="end" font-size="9" fill="#6b7280">${val}</text>
      `;
    }).join("");

    const labels = data.map((d, i) => {
      const show = data.length <= 8 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1;
      return show
        ? `<text x="${x(i)}" y="${height-16}" text-anchor="middle" font-size="9" fill="#6b7280">${escText(d.label)}</text>`
        : "";
    }).join("");

    const dots = (key, color) => data.map((d, i) =>
      `<circle cx="${x(i)}" cy="${y(d[key])}" r="3" fill="${color}"/>`
    ).join("");

    return `
      <div class="dashboard-legend">
        <span><i class="dashboard-dot" style="background:#3478f6"></i> Shared</span>
        <span><i class="dashboard-dot" style="background:#16a34a"></i> Ordered</span>
      </div>
      <div class="dashboard-chart">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Share and order trend">
          ${grid}
          <polyline points="${sharePoints}" fill="none" stroke="#3478f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="${orderPoints}" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${dots("shared", "#3478f6")}
          ${dots("ordered", "#16a34a")}
          ${labels}
        </svg>
      </div>
      <p class="dashboard-subtitle">
        All-time view shows the last 12 calendar months. Other periods use hourly or daily buckets.
      </p>
    `;
  }

  function horizontalChart(rows, emptyText) {
    if (!rows.length) return `<div class="dashboard-empty">${escText(emptyText)}</div>`;

    const topRows = rows.slice(0, 8);
    const max = Math.max(1, ...topRows.map(r => r[1]));
    const width = 340;
    const barX = 135;
    const barMax = 155;
    const rowH = 32;
    const height = topRows.length * rowH + 12;

    return `
      <div class="dashboard-chart">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Ranked bar chart">
          ${topRows.map(([label, value], i) => {
            const y = 8 + i * rowH;
            const shortLabel = label.length > 17 ? label.slice(0, 16) + "…" : label;
            return `
              <text x="0" y="${y+12}" font-size="10" fill="#374151">${escText(shortLabel)}</text>
              <rect x="${barX}" y="${y}" width="${barMax}" height="18" rx="5" fill="#e5e7eb"/>
              <rect x="${barX}" y="${y}" width="${Math.max(2, value / max * barMax)}" height="18" rx="5" fill="#3478f6"/>
              <text x="${Math.min(width-4, barX + Math.max(2, value / max * barMax) + 6)}" y="${y+12}" font-size="10" fill="#111827">${value}</text>
            `;
          }).join("")}
        </svg>
      </div>
    `;
  }

  function statusTable(rows, title) {
    if (!rows.length) {
      return `<div class="dashboard-empty">No ${escText(title.toLowerCase())} to display.</div>`;
    }

    const totals = rows.reduce((t, r) => {
      ["allotted", "shared", "ordered", "pendingAllotted", "pendingOrdered"].forEach(k => {
        t[k] += r[k];
      });
      t.overAllocated += r.overAllocated;
      return t;
    }, {
      allotted:0, shared:0, ordered:0,
      pendingAllotted:0, pendingOrdered:0, overAllocated:0
    });

    return `
      <div class="dashboard-table-wrap">
        <table class="dashboard-table">
          <thead>
            <tr>
              <th>${escText(title)}</th>
              <th>Allotted</th>
              <th>Shared</th>
              <th>Ordered</th>
              <th>Pending Allotted</th>
              <th>Pending Ordered</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>
                  ${escText(r.label)}
                  ${r.overAllocated
                    ? `<small class="dashboard-warning">Over by ${moneylessNumber(r.overAllocated)}</small>`
                    : ""}
                </td>
                <td>${moneylessNumber(r.allotted)}</td>
                <td>${r.shared}</td>
                <td>${r.ordered}</td>
                <td>${moneylessNumber(r.pendingAllotted)}</td>
                <td>${moneylessNumber(r.pendingOrdered)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td>${moneylessNumber(totals.allotted)}</td>
              <td>${totals.shared}</td>
              <td>${totals.ordered}</td>
              <td>${moneylessNumber(totals.pendingAllotted)}</td>
              <td>${moneylessNumber(totals.pendingOrdered)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
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

    const periodShares = getPeriodShares(shares);
    const ordered = periodShares.filter(s => !!s.ordered).length;
    const pendingOrdered = periodShares.length - ordered;
    const orderRate = periodShares.length
      ? Math.round(ordered / periodShares.length * 100)
      : 0;

    const allStatus = {
      allotted: products.reduce((n, p) => n + safeQty(p.allottedQty), 0),
      shared: shares.length,
      ordered: shares.filter(s => !!s.ordered).length
    };

    allStatus.pendingAllotted = Math.max(0, allStatus.allotted - allStatus.shared);
    allStatus.pendingOrdered = Math.max(0, allStatus.shared - allStatus.ordered);
    allStatus.overAllocated = Math.max(0, allStatus.shared - allStatus.allotted);

    const brandRanks = countBy(periodShares, s => s.brand || s.productName);
    const typeRanks = countBy(periodShares, s => s.productType);
    const brandStatus = productStatus(products, shares, "brand");
    const typeStatus = productStatus(products, shares, "type");

    const recent = [...periodShares]
      .sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
      .slice(0, 6);

    const periodLabels = {
      today: "Today",
      "7days": "Last 7 Days",
      "30days": "Last 30 Days",
      all: "All Time"
    };

    panel.innerHTML = `
      <div class="dashboard-heading">
        <h3>Analytics Dashboard</h3>
      </div>
      <p class="dashboard-subtitle">
        Stock, sharing and order performance in one place.
      </p>

      <label for="dashboardPeriod">Activity period</label>
      <select id="dashboardPeriod" class="dashboard-period">
        <option value="all" ${selectedPeriod === "all" ? "selected" : ""}>All Time</option>
        <option value="today" ${selectedPeriod === "today" ? "selected" : ""}>Today</option>
        <option value="7days" ${selectedPeriod === "7days" ? "selected" : ""}>Last 7 Days</option>
        <option value="30days" ${selectedPeriod === "30days" ? "selected" : ""}>Last 30 Days</option>
      </select>

      <div class="dashboard-grid">
        ${metric("Allotted Units", moneylessNumber(allStatus.allotted), "Across all saved products")}
        ${metric("Shared", allStatus.shared, "All saved share records")}
        ${metric("Ordered", allStatus.ordered, "Marked as ordered")}
        ${metric("Pending Allotted", moneylessNumber(allStatus.pendingAllotted), "Allotted minus shared")}
        ${metric("Pending Ordered", allStatus.pendingOrdered, "Shared minus ordered")}
        ${metric("Contacts", contacts.length, "Saved contacts")}
        ${metric("Products", products.length, "Saved products")}
        ${metric("Order Rate", orderRate + "%", periodLabels[selectedPeriod] + " marked orders ÷ shares")}
      </div>

      ${allStatus.overAllocated ? `
        <div class="dashboard-insight">
          <strong>Stock alert:</strong>
          ${moneylessNumber(allStatus.overAllocated)} share record(s) exceed the total allotted quantity.
          Review product allotments before sharing more.
        </div>
      ` : ""}

      <div class="dashboard-heading"><h3>Quick Actions</h3></div>
      <div class="dashboard-actions">
        <button class="primary" data-dashboard-page="send">↗ Send Deal</button>
        <button class="secondary" data-dashboard-page="products">▣ Products</button>
        <button class="secondary" data-dashboard-page="contacts">♙ Contacts</button>
        <button class="secondary" data-dashboard-page="history">◷ History</button>
        <button class="secondary" data-dashboard-page="tracking">📊 Tracking</button>
      </div>

      <div class="dashboard-chart-card">
        <h3>Sharing &amp; Order Trend</h3>
        <p class="dashboard-subtitle">Compare share records with records marked as ordered.</p>
        ${trendChart(periodShares)}
      </div>

      <div class="dashboard-charts-grid">
        <div class="dashboard-chart-card">
          <h3>Top Brands</h3>
          <p class="dashboard-subtitle">Ranked by share attempts · ${escText(periodLabels[selectedPeriod])}</p>
          ${horizontalChart(brandRanks, "No brand activity in this period.")}
        </div>

        <div class="dashboard-chart-card">
          <h3>Top Product Types</h3>
          <p class="dashboard-subtitle">Ranked by share attempts · ${escText(periodLabels[selectedPeriod])}</p>
          ${horizontalChart(typeRanks, "No product-type activity in this period.")}
        </div>
      </div>

      <div class="dashboard-chart-card">
        <h3>Brand-wise Status</h3>
        <p class="dashboard-subtitle">All-time allotment and order status.</p>
        ${statusTable(brandStatus, "Brand")}
      </div>

      <div class="dashboard-chart-card">
        <h3>Product Type-wise Status</h3>
        <p class="dashboard-subtitle">All-time allotment and order status.</p>
        ${statusTable(typeStatus, "Product Type")}
      </div>

      <div class="dashboard-chart-card">
        <h3>Recent Activity</h3>
        <p class="dashboard-subtitle">Latest saved share attempts in ${escText(periodLabels[selectedPeriod].toLowerCase())}.</p>

        ${recent.length ? recent.map(item => `
          <div class="dashboard-list-item">
            <div style="flex:1;min-width:0">
              <strong>${escText(item.contactName || "Unknown contact")}</strong>
              <small>${escText(item.productName || item.brand || "Unknown product")}</small>
              <div class="dashboard-recent-status">
                ${escText(item.status || "Share attempt recorded")}
                · ${Number(item.time)
                  ? escText(new Date(Number(item.time)).toLocaleString())
                  : "Date unavailable"}
              </div>
            </div>
            <span class="dashboard-count">${item.ordered ? "Ordered" : "Pending"}</span>
          </div>
        `).join("") : `
          <div class="dashboard-empty">No activity recorded in this period.</div>
        `}
      </div>

      <p class="hint">
        All-time stock status is independent of the activity-period filter.
        Pending Ordered means a share record has not been marked ordered.
        Opening WhatsApp does not confirm message delivery or an actual purchase.
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

  // Keep the analytics dashboard synchronized with app.js saves.
  if (typeof save === "function" && !save.__dashboardWrapped) {
    const originalSave = save;

    const wrappedSave = function () {
      originalSave();
      renderAdvancedDashboard();
    };

    wrappedSave.__dashboardWrapped = true;
    save = wrappedSave;
  }

  renderAdvancedDashboard();

  document.querySelectorAll('.tabbar button[data-page="dashboard"]')
    .forEach(button => {
      button.addEventListener("click", renderAdvancedDashboard);
    });

  // Refresh when returning to the app after switching tabs or apps.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderAdvancedDashboard();
  });
})();
