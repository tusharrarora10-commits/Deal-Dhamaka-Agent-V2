
(function () {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const STYLE_ID = "followup-alert-styles";
  let previousShares = new Map();

  const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function getShares() {
    return typeof state !== "undefined" && Array.isArray(state.shares)
      ? state.shares
      : [];
  }

  function comparableShare(item) {
    const copy = { ...item };
    delete copy.lastUpdatedAt;
    return JSON.stringify(copy);
  }

  function rememberShares() {
    previousShares = new Map(
      getShares().map(item => [
        String(item.id),
        comparableShare(item)
      ])
    );
  }

  function getLastActivity(item) {
    const stored = item.lastUpdatedAt;
    const parsed = typeof stored === "number"
      ? stored
      : Date.parse(stored || "");

    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : Number(item.time) || 0;
  }

  function getStalePending() {
    const now = Date.now();

    return getShares()
      .filter(item => !item.ordered)
      .map(item => {
        const lastActivity = getLastActivity(item);
        return {
          item,
          lastActivity,
          age: now - lastActivity
        };
      })
      .filter(entry =>
        entry.lastActivity > 0 && entry.age >= DAY_MS
      )
      .sort((a, b) => b.age - a.age);
  }

  function formatAge(milliseconds) {
    const hours = Math.floor(milliseconds / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return remainingHours
        ? `${days}d ${remainingHours}h overdue`
        : `${days}d overdue`;
    }

    return `${hours}h overdue`;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .followup-panel {
        margin: 14px 0;
        padding: 0;
        border: 1px solid #f2c879;
        border-radius: 16px;
        background: #fffaf0;
        color: #422006;
        overflow: hidden;
      }
      .followup-details > summary {
        cursor: pointer;
        list-style: none;
        padding: 16px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .followup-details > summary::-webkit-details-marker {
        display: none;
      }
      .followup-details > summary::after {
        content: "＋";
        font-size: 20px;
      }
      .followup-details[open] > summary::after {
        content: "−";
      }
      .followup-content {
        padding: 0 16px 16px;
      }
      .followup-intro {
        margin: 0 0 10px;
        font-size: 13px;
        color: #854d0e;
      }
      .followup-item {
        padding: 12px 0;
        border-top: 1px solid #f2dfb7;
        overflow-wrap: anywhere;
      }
      .followup-item strong {
        display: block;
        margin-bottom: 4px;
      }
      .followup-item small {
        display: block;
        margin-top: 4px;
        color: #854d0e;
      }
      .followup-count {
        display: inline-block;
        padding: 4px 9px;
        border-radius: 20px;
        background: #fef3c7;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }
      .followup-empty {
        padding: 8px 0 2px;
        font-size: 14px;
        color: #166534;
      }
    `;
    document.head.appendChild(style);
  }

  function alertMarkup() {
    const stale = getStalePending();

    return `
      <details class="followup-details">
        <summary>
          <span>⏰ Pending Follow-Ups</span>
          <span class="followup-count">
            ${stale.length} need attention
          </span>
        </summary>
        <div class="followup-content">
          ${stale.length ? `
            <p class="followup-intro">
              Pending records with no saved update for at least 24 hours.
            </p>
            ${stale.map(({ item, age }) => `
              <div class="followup-item">
                <strong>${escapeHtml(item.contactName || "Unknown contact")}</strong>
                <div>${escapeHtml(item.brand || item.productName || "Unknown product")}</div>
                <small>
                  ${escapeHtml(item.productType || "Product type unspecified")}
                  · ${escapeHtml(formatAge(age))}
                </small>
                <small>
                  Last activity: ${escapeHtml(
                    new Date(getLastActivity(item)).toLocaleString()
                  )}
                </small>
              </div>
            `).join("")}
          ` : `
            <p class="followup-empty">
              No pending records have been inactive for 24 hours.
            </p>
          `}
        </div>
      </details>`;
  }

  function renderDashboardAlert() {
    const home = document.getElementById("dashboard");
    if (!home) return;

    let panel = document.getElementById("dashboardFollowupAlert");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "dashboardFollowupAlert";
      panel.className = "followup-panel";

      const advanced = document.getElementById("advancedDashboard");
      const stats = home.querySelector(".stats");

      if (advanced) {
        advanced.insertAdjacentElement("afterend", panel);
      } else if (stats) {
        stats.insertAdjacentElement("afterend", panel);
      } else {
        home.appendChild(panel);
      }
    }

    panel.innerHTML = alertMarkup();
  }

  function renderTrackingAlert() {
    const tracking = document.getElementById("tracking");
    if (!tracking) return;

    let panel = document.getElementById("trackingFollowupAlert");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "trackingFollowupAlert";
      panel.className = "followup-panel";
    }

    // Always place Pending Follow-Ups at the bottom of Tracking.
    tracking.appendChild(panel);
    panel.innerHTML = alertMarkup();
  }

  function renderAlerts() {
    injectStyles();
    renderDashboardAlert();
    renderTrackingAlert();
  }

  function attachTrackingRefresh() {
    if (typeof renderTracking !== "function" ||
        renderTracking.__followupWrapped) return;

    const originalRenderTracking = renderTracking;

    const wrappedRenderTracking = function () {
      originalRenderTracking();
      renderTrackingAlert();
    };

    wrappedRenderTracking.__followupWrapped = true;
    renderTracking = wrappedRenderTracking;
  }

  function attachSaveRefresh() {
    if (typeof save !== "function" || save.__followupWrapped) return;

    const originalSave = save;

    const wrappedSave = function () {
      const shares = getShares();
      const now = new Date().toISOString();

      shares.forEach(item => {
        const id = String(item.id);
        const previous = previousShares.get(id);

        if (previous !== undefined &&
            previous !== comparableShare(item)) {
          item.lastUpdatedAt = now;
        }
      });

      originalSave();
      rememberShares();
      renderAlerts();
    };

    wrappedSave.__followupWrapped = true;
    save = wrappedSave;
  }

  // Existing records are the baseline; opening the app does not
  // count as updating a record.
  rememberShares();
  attachSaveRefresh();
  attachTrackingRefresh();
  renderAlerts();

  document.querySelectorAll('.tabbar button[data-page="dashboard"]')
    .forEach(button =>
      button.addEventListener("click", renderDashboardAlert)
    );

  document.querySelectorAll('.tabbar button[data-page="tracking"]')
    .forEach(button =>
      button.addEventListener("click", renderTrackingAlert)
    );

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderAlerts();
  });

  window.addEventListener("focus", renderAlerts);
  window.setInterval(renderAlerts, 60 * 1000);
})();
