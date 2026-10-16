/* Recipient-wise timeline. Read-only view over existing V2 records. */
(function () {
  "use strict";

  const html = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
  const dateText = value => {
    if (!value) return "Date not recorded";
    const d = typeof value === "number" ? new Date(value) : new Date(value);
    return Number.isNaN(d.getTime()) ? "Date not recorded" : d.toLocaleString();
  };
  const matchingShares = contact => {
    if (!Array.isArray(state?.shares)) return [];
    return state.shares.filter(s => {
      if (s.contactId != null && contact.id != null && String(s.contactId) === String(contact.id)) return true;
      const samePhone = String(s.phone || "").replace(/\D/g, "") === String(contact.phone || "").replace(/\D/g, "");
      return samePhone && !!contact.phone;
    });
  };
  function ensurePanel() {
    let panel = document.getElementById("recipientTimelineModal");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "recipientTimelineModal";
    panel.className = "modal";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="modalbox recipient-timeline-box" role="dialog" aria-modal="true" aria-labelledby="recipientTimelineTitle">
        <div class="modalhead"><h3 id="recipientTimelineTitle">Recipient timeline</h3><button type="button" data-timeline-close aria-label="Close timeline">×</button></div>
        <div id="recipientTimelineBody"></div>
      </div>`;
    document.body.appendChild(panel);
    panel.addEventListener("click", event => {
      if (event.target === panel || event.target.closest("[data-timeline-close]")) closePanel();
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closePanel(); });
    return panel;
  }
  function closePanel() {
    const panel = document.getElementById("recipientTimelineModal");
    if (panel) panel.hidden = true;
  }
  function openTimeline(contactId) {
    const contact = state.contacts.find(c => String(c.id) === String(contactId));
    if (!contact) return;
    const shares = matchingShares(contact).sort((a, b) => Number(b.time || 0) - Number(a.time || 0));
    const events = [];
    shares.forEach(s => {
      events.push({time: Number(s.time) || 0, kind: "share", title: "Product shared", product: s.productName || "Unnamed product", detail: [s.brand, s.productType].filter(Boolean).join(" · "), status: s.status || "Share initiated"});
      if (s.ordered) events.push({time: Date.parse(s.orderedAt || "") || Number(s.time) || 0, kind: "ordered", title: "Marked as ordered", product: s.productName || "Unnamed product", detail: "Order status was updated in the app", status: "Ordered"});
    });
    events.sort((a,b) => b.time - a.time);
    const panel = ensurePanel();
    const ordered = shares.filter(s => s.ordered).length;
    const pending = shares.length - ordered;
    document.getElementById("recipientTimelineTitle").textContent = `${contact.name || "Recipient"} · Timeline`;
    document.getElementById("recipientTimelineBody").innerHTML = `
      <div class="recipient-timeline-summary">
        <div><strong>${shares.length}</strong><span>Products shared</span></div>
        <div><strong>${ordered}</strong><span>Ordered</span></div>
        <div><strong>${pending}</strong><span>Pending</span></div>
      </div>
      <div class="recipient-timeline-contact"><b>${html(contact.name)}</b><span>${html(contact.phone || "No phone number")}</span>${contact.category ? `<small>${html(contact.category)}</small>` : ""}</div>
      <input class="search" id="recipientTimelineSearch" placeholder="Filter this timeline by product or status" autocomplete="off">
      <div id="recipientTimelineEvents" class="recipient-timeline-events">${renderEvents(events)}</div>
      <p class="hint">This timeline uses activity already recorded in this app. WhatsApp delivery, review publication and other events are not inferred unless the app records them.</p>`;
    document.getElementById("recipientTimelineSearch").addEventListener("input", event => {
      const q = event.target.value.trim().toLowerCase();
      document.getElementById("recipientTimelineEvents").innerHTML = renderEvents(events.filter(e => [e.title,e.product,e.detail,e.status].join(" ").toLowerCase().includes(q)));
    });
    panel.hidden = false;
  }
  function renderEvents(events) {
    if (!events.length) return '<div class="empty">No recorded activity for this recipient yet.</div>';
    return events.map(e => `<article class="recipient-timeline-event"><span class="recipient-timeline-dot ${e.kind === "ordered" ? "is-ordered" : ""}"></span><div class="recipient-timeline-event-content"><div class="recipient-timeline-event-head"><b>${html(e.title)}</b><time>${html(dateText(e.time))}</time></div><strong>${html(e.product)}</strong>${e.detail ? `<p>${html(e.detail)}</p>` : ""}<span class="recipient-timeline-status ${e.kind === "ordered" ? "is-ordered" : ""}">${html(e.status)}</span></div></article>`).join("");
  }
  function injectStyles() {
    if (document.getElementById("recipientTimelineStyles")) return;
    const style = document.createElement("style"); style.id = "recipientTimelineStyles";
    style.textContent = `
      .recipient-timeline-box{max-height:86vh;overflow:auto}
      .recipient-timeline-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}
      .recipient-timeline-summary>div{background:var(--card,#f3f4f6);border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:12px 8px;text-align:center;min-width:0}
      .recipient-timeline-summary strong{display:block;font-size:22px;line-height:1.25}.recipient-timeline-summary span{display:block;font-size:11px;color:var(--muted,#6b7280);margin-top:4px}
      .recipient-timeline-contact{display:flex;flex-direction:column;gap:3px;margin:10px 0 14px;overflow-wrap:anywhere}.recipient-timeline-contact span,.recipient-timeline-contact small{color:var(--muted,#6b7280);font-size:13px}
      .recipient-timeline-events{position:relative;margin:12px 0 4px}.recipient-timeline-event{display:grid;grid-template-columns:18px minmax(0,1fr);gap:10px;position:relative;padding:0 0 18px}
      .recipient-timeline-event:not(:last-child):before{content:"";position:absolute;left:7px;top:14px;bottom:-2px;width:2px;background:var(--border,#e5e7eb)}
      .recipient-timeline-dot{z-index:1;width:14px;height:14px;border-radius:50%;background:#64748b;border:3px solid #e2e8f0;margin-top:3px}.recipient-timeline-dot.is-ordered{background:#15803d;border-color:#dcfce7}
      .recipient-timeline-event-content{min-width:0;border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:11px;overflow-wrap:anywhere}
      .recipient-timeline-event-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:7px}.recipient-timeline-event-head time{font-size:11px;color:var(--muted,#6b7280);text-align:right}
      .recipient-timeline-event-content>strong{display:block;font-size:14px}.recipient-timeline-event-content p{margin:5px 0;color:var(--muted,#6b7280);font-size:12px}
      .recipient-timeline-status{display:inline-block;margin-top:7px;padding:4px 8px;border-radius:20px;background:#e2e8f0;color:#334155;font-size:11px;font-weight:700}.recipient-timeline-status.is-ordered{background:#dcfce7;color:#166534}
      @media(max-width:420px){.recipient-timeline-event-head{flex-direction:column}.recipient-timeline-event-head time{text-align:left}.recipient-timeline-summary>div{padding:10px 4px}}
    `; document.head.appendChild(style);
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-recipient-timeline]");
    if (button) { event.preventDefault(); openTimeline(button.getAttribute("data-recipient-timeline")); }
  });
  injectStyles();
})();
