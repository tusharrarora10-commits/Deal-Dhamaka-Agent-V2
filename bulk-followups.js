(function () {
  "use strict";
  const STYLE_ID = "bulk-followup-styles";
  let selectedIds = new Set();
  let queue = [];
  let queueIndex = 0;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);

  function shares() {
    return typeof state !== "undefined" && Array.isArray(state.shares) ? state.shares : [];
  }
  function products() {
    return typeof state !== "undefined" && Array.isArray(state.products) ? state.products : [];
  }
  function productFor(record) {
    if (record.productId != null) return products().find(p => String(p.id) === String(record.productId));
    return products().find(p =>
      String(p.name || p.brand || "").trim() === String(record.productName || record.brand || "").trim()
    );
  }
  function productLabel(p) {
    return [p && (p.brand || p.name), p && p.name, p && p.productType]
      .filter((v,i,a) => v && a.indexOf(v) === i).join(" · ");
  }
  function phoneFor(record) {
    let phone = String(record.phone || record.whatsapp || "").replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    return phone;
  }
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .bulk-followup-card{margin:16px 0;border:1px solid #dce4f2;border-radius:16px;padding:16px;background:#fff;color:#18243b}
      .bulk-followup-card h3{margin:0 0 6px}.bulk-followup-sub{color:#64748b;font-size:13px;margin:0 0 14px}
      .bulk-followup-card label{display:block;font-weight:700;font-size:13px;margin:12px 0 6px}
      .bulk-followup-card select,.bulk-followup-card textarea,.bulk-followup-card input[type=search]{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:11px;background:#fff;color:#172033;font:inherit}
      .bulk-followup-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      .bulk-followup-actions button{border:0;border-radius:10px;padding:10px 12px;font-weight:750;background:#eef2ff;color:#3446a4}
      .bulk-followup-actions button.primary{background:#2563eb;color:white}
      .bulk-followup-list{border:1px solid #e2e8f0;border-radius:12px;max-height:300px;overflow:auto;margin-top:10px}
      .bulk-followup-person{display:flex;align-items:center;gap:10px;padding:11px;border-bottom:1px solid #edf0f5}
      .bulk-followup-person:last-child{border-bottom:0}.bulk-followup-person input{width:18px;height:18px;flex:0 0 auto}
      .bulk-followup-person span{display:block;min-width:0;overflow-wrap:anywhere}.bulk-followup-person small{display:block;color:#64748b;margin-top:3px}
      .bulk-followup-count{font-weight:800;color:#334155;background:#f1f5f9;border-radius:20px;padding:5px 9px;font-size:12px}
      .bulk-followup-note{font-size:12px;color:#64748b;line-height:1.5;margin:10px 0 0}
      .bulk-followup-status{padding:10px;background:#f8fafc;border-radius:10px;margin-top:10px;font-size:13px}
      @media(max-width:480px){.bulk-followup-card{padding:13px}.bulk-followup-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function eligibleRecords() {
    const productId = document.getElementById("bulkFollowupProduct")?.value || "";
    const mode = document.getElementById("bulkFollowupMode")?.value || "pending";
    if (!productId) return [];
    const seen = new Set();
    return shares().filter(s => {
      const p = productFor(s);
      if (!p || String(p.id) !== String(productId)) return false;
      if (mode === "ordered" && !s.ordered) return false;
      if (mode === "pending" && s.ordered) return false;
      const phone = phoneFor(s);
      if (!phone) return false;
      // one message per recipient per selected product, even if duplicate share records exist
      const key = phone;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function renderList() {
    const list = document.getElementById("bulkFollowupRecipients");
    if (!list) return;
    const eligible = eligibleRecords();
    const eligibleIds = new Set(eligible.map(s => String(s.id)));
    selectedIds = new Set([...selectedIds].filter(id => eligibleIds.has(id)));
    list.innerHTML = eligible.length ? eligible.map(s => {
      const id = String(s.id);
      return `<label class="bulk-followup-person">
        <input type="checkbox" data-bulk-share="${esc(id)}" ${selectedIds.has(id) ? "checked" : ""}>
        <span><strong>${esc(s.contactName || "Unknown recipient")}</strong>
        <small>${esc(s.phone || "")} · ${s.ordered ? "Ordered" : "Order pending"}</small></span>
      </label>`;
    }).join("") : `<div class="bulk-followup-person">No eligible recipients found for this product and status.</div>`;
    document.getElementById("bulkFollowupSelectedCount").textContent = `${selectedIds.size} selected · ${eligible.length} eligible`;
  }

  function defaultMessage(mode, productName, recipientName) {
    if (mode === "ordered") {
      return `Hi ${recipientName || "there"}! 😊\nHope you received your ${productName} order. When convenient, please share an honest review of your experience on the shopping platform. Thank you!`;
    }
    return `Hi ${recipientName || "there"}! 😊\nA quick reminder that your order for ${productName} is still pending. If you still wish to order, please complete it when convenient. If you have already ordered, please let me know so I can update the status. Thank you!`;
  }

  function refreshMessageTemplate() {
    const mode = document.getElementById("bulkFollowupMode")?.value || "pending";
    const productId = document.getElementById("bulkFollowupProduct")?.value || "";
    const p = products().find(item => String(item.id) === String(productId));
    const textarea = document.getElementById("bulkFollowupMessage");
    if (!textarea || textarea.dataset.edited === "true") return;
    textarea.value = defaultMessage(mode, p ? (p.name || p.brand || "product") : "[product]", "[name]");
  }

  function render() {
    injectStyles();
    const tracking = document.getElementById("tracking");
    if (!tracking) return;
    let card = document.getElementById("bulkFollowupCard");
    if (!card) {
      card = document.createElement("section");
      card.id = "bulkFollowupCard";
      card.className = "bulk-followup-card";
      card.innerHTML = `
        <h3>📨 Bulk WhatsApp Follow-ups</h3>
        <p class="bulk-followup-sub">Select a product, choose ordered recipients for review requests or pending recipients for order reminders, then process each chat.</p>
        <label for="bulkFollowupProduct">Product</label>
        <select id="bulkFollowupProduct"><option value="">Choose a product</option></select>
        <label for="bulkFollowupMode">Follow-up type</label>
        <select id="bulkFollowupMode">
          <option value="pending">Order pending — send reminder</option>
          <option value="ordered">Ordered — request an honest review</option>
        </select>
        <div class="bulk-followup-actions">
          <button type="button" id="bulkFollowupSelectAll">Select all</button>
          <button type="button" id="bulkFollowupClear">Clear selection</button>
          <span id="bulkFollowupSelectedCount" class="bulk-followup-count">0 selected</span>
        </div>
        <input type="search" id="bulkFollowupSearch" placeholder="Search recipient name or number">
        <div id="bulkFollowupRecipients" class="bulk-followup-list"></div>
        <label for="bulkFollowupMessage">Message template (editable)</label>
        <textarea id="bulkFollowupMessage" rows="4"></textarea>
        <div class="bulk-followup-actions">
          <button type="button" class="primary" id="bulkFollowupStart">Start WhatsApp follow-ups</button>
          <button type="button" id="bulkFollowupNext" hidden>Open next chat</button>
          <button type="button" id="bulkFollowupStop" hidden>Stop queue</button>
        </div>
        <div id="bulkFollowupStatus" class="bulk-followup-status">Choose a product to load eligible recipients.</div>
        <p class="bulk-followup-note">WhatsApp opens one chat at a time with the message prefilled. You must review and tap Send in WhatsApp. This tool does not claim messages were sent or reviews were posted.</p>
      `;
      const filterCard = tracking.querySelector(".tracking-filter-card");
      if (filterCard) filterCard.insertAdjacentElement("afterend", card);
      else tracking.appendChild(card);

      document.getElementById("bulkFollowupProduct").addEventListener("change", () => {
        selectedIds.clear(); refreshMessageTemplate(); renderList();
      });
      document.getElementById("bulkFollowupMode").addEventListener("change", () => {
        selectedIds.clear(); refreshMessageTemplate(); renderList();
      });
      document.getElementById("bulkFollowupSearch").addEventListener("input", filterVisible);
      document.getElementById("bulkFollowupRecipients").addEventListener("change", event => {
        const checkbox = event.target.closest("input[data-bulk-share]");
        if (!checkbox) return;
        const id = checkbox.dataset.bulkShare;
        if (checkbox.checked) selectedIds.add(id); else selectedIds.delete(id);
        document.getElementById("bulkFollowupSelectedCount").textContent =
          `${selectedIds.size} selected · ${eligibleRecords().length} eligible`;
      });
      document.getElementById("bulkFollowupMessage").addEventListener("input", event => {
        event.target.dataset.edited = "true";
      });
      document.getElementById("bulkFollowupSelectAll").addEventListener("click", () => {
        eligibleRecords().forEach(s => selectedIds.add(String(s.id))); renderList();
      });
      document.getElementById("bulkFollowupClear").addEventListener("click", () => {
        selectedIds.clear(); renderList();
      });
      document.getElementById("bulkFollowupStart").addEventListener("click", startQueue);
      document.getElementById("bulkFollowupNext").addEventListener("click", openNext);
      document.getElementById("bulkFollowupStop").addEventListener("click", () => {
        queue = []; queueIndex = 0;
        document.getElementById("bulkFollowupNext").hidden = true;
        document.getElementById("bulkFollowupStop").hidden = true;
        document.getElementById("bulkFollowupStatus").textContent = "Queue stopped.";
      });
    }

    const select = document.getElementById("bulkFollowupProduct");
    const oldValue = select.value;
    const allProducts = products();
    select.innerHTML = `<option value="">Choose a product</option>` + allProducts.map(p =>
      `<option value="${esc(p.id)}">${esc(productLabel(p) || "Unnamed product")}</option>`
    ).join("");
    if (allProducts.some(p => String(p.id) === oldValue)) select.value = oldValue;
    refreshMessageTemplate();
    renderList();
  }

  function filterVisible() {
    const q = (document.getElementById("bulkFollowupSearch").value || "").trim().toLowerCase();
    document.querySelectorAll("#bulkFollowupRecipients .bulk-followup-person").forEach(row => {
      row.hidden = q && !row.textContent.toLowerCase().includes(q);
    });
  }

  function startQueue() {
    const ids = [...selectedIds];
    if (!ids.length) {
      document.getElementById("bulkFollowupStatus").textContent = "Select at least one recipient first.";
      return;
    }
    const mode = document.getElementById("bulkFollowupMode").value;
    const productId = document.getElementById("bulkFollowupProduct").value;
    const p = products().find(item => String(item.id) === String(productId));
    const template = document.getElementById("bulkFollowupMessage").value.trim();
    if (!template) {
      document.getElementById("bulkFollowupStatus").textContent = "Enter a message before starting.";
      return;
    }
    queue = eligibleRecords().filter(s => ids.includes(String(s.id))).map(s => ({
      shareId: String(s.id), name: s.contactName || "there", phone: phoneFor(s),
      productName: p ? (p.name || p.brand || "product") : "product",
      mode
    }));
    queueIndex = 0;
    document.getElementById("bulkFollowupNext").hidden = false;
    document.getElementById("bulkFollowupStop").hidden = false;
    document.getElementById("bulkFollowupStatus").textContent =
      `${queue.length} recipient(s) queued. Tap “Open next chat”, then send manually in WhatsApp.`;
    openNext();
  }

  function openNext() {
    if (queueIndex >= queue.length) {
      document.getElementById("bulkFollowupStatus").textContent = "Queue complete. Check each WhatsApp chat and send manually if appropriate.";
      document.getElementById("bulkFollowupNext").hidden = true;
      document.getElementById("bulkFollowupStop").hidden = true;
      return;
    }
    const person = queue[queueIndex];
    const template = document.getElementById("bulkFollowupMessage").value.trim();
    const message = template
      .replace(/\[name\]/gi, person.name)
      .replace(/\[product\]/gi, person.productName);
    const phone = person.phone;
    if (!phone) {
      queueIndex++;
      document.getElementById("bulkFollowupStatus").textContent = `Skipped ${person.name}: no valid phone number.`;
      return;
    }
    document.getElementById("bulkFollowupStatus").textContent =
      `Opening ${queueIndex + 1} of ${queue.length}: ${person.name}. Send the message in WhatsApp, return here, then tap “Open next chat”.`;
    queueIndex++;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    if (queueIndex >= queue.length) {
      document.getElementById("bulkFollowupNext").textContent = "Finish queue";
    } else {
      document.getElementById("bulkFollowupNext").textContent = `Open next chat (${queueIndex + 1}/${queue.length})`;
    }
  }

  function wrapRenderTracking() {
    if (typeof renderTracking !== "function" || renderTracking.__bulkFollowupWrapped) return;
    const original = renderTracking;
    const wrapped = function () { original(); render(); };
    wrapped.__bulkFollowupWrapped = true;
    renderTracking = wrapped;
  }

  // Wait for app.js globals and DOM initialization.
  function init() {
    wrapRenderTracking();
    render();
    document.querySelectorAll('.tabbar button[data-page="tracking"], button[data-page="tracking"]').forEach(button =>
      button.addEventListener("click", () => window.setTimeout(render, 0))
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();