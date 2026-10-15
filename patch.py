from pathlib import Path
p=Path('/mnt/data/ddfix')

def replace_once(text, old, new, label):
    n=text.count(old)
    if n != 1: raise RuntimeError(f'{label}: expected one match, got {n}')
    return text.replace(old,new,1)

app=(p/'app.js').read_text()
old='''function renderTracking() {
  const brands = [...new Set(
    state.shares.map(x => x.brand).filter(Boolean)
  )].sort();

  const types = [...new Set(
    state.shares.map(x => x.productType).filter(Boolean)
  )].sort();

  const recipients = [...new Set(
    state.shares.map(x => x.contactName).filter(Boolean)
  )].sort();'''
new='''function renderTracking() {
  // Reports use current product metadata. Deleted products are excluded from
  // live tracking and inventory reports; historical entries remain in History.
  const reportShares = state.shares.map(record => {
    const product = record.productId == null
      ? state.products.find(p =>
          String(p.name || p.brand || "").trim() ===
            String(record.productName || record.brand || "").trim() &&
          String(p.productType || "").trim() ===
            String(record.productType || "").trim()
        )
      : state.products.find(p => String(p.id) === String(record.productId));

    if (record.productId != null && !product) return null;
    return product ? {
      ...record,
      brand: product.brand || product.name || "",
      productType: product.productType || "",
      productName: product.name || product.brand || ""
    } : record;
  }).filter(Boolean);

  const brands = [...new Set(
    reportShares.map(x => x.brand).filter(Boolean)
  )].sort();

  const types = [...new Set(
    reportShares.map(x => x.productType).filter(Boolean)
  )].sort();

  const recipients = [...new Set(
    reportShares.map(x => x.contactName).filter(Boolean)
  )].sort();'''
app=replace_once(app,old,new,'tracking normalization')
start=app.index('function renderTracking() {')
end=app.index('\n["filterBrand", "filterType", "filterRecipient"]',start)
section=app[start:end]
section=section.replace('state.shares.length','reportShares.length').replace('state.shares.filter(x =>','reportShares.filter(x =>')
app=app[:start]+section+app[end:]
(p/'app.js').write_text(app)

dash=(p/'dashboard.js').read_text()
old='''    const contacts = Array.isArray(state.contacts) ? state.contacts : [];
    const products = Array.isArray(state.products) ? state.products : [];
    const shares = Array.isArray(state.shares) ? state.shares : [];

    const periodShares = getPeriodShares(shares);'''
new='''    const contacts = Array.isArray(state.contacts) ? state.contacts : [];
    const products = Array.isArray(state.products) ? state.products : [];
    const storedShares = Array.isArray(state.shares) ? state.shares : [];
    const shares = storedShares.map(record => {
      const product = record.productId == null
        ? products.find(p =>
            String(p.name || p.brand || "").trim() ===
              String(record.productName || record.brand || "").trim() &&
            String(p.productType || "").trim() ===
              String(record.productType || "").trim()
          )
        : products.find(p => String(p.id) === String(record.productId));

      if (record.productId != null && !product) return null;
      return product ? {
        ...record,
        brand: product.brand || product.name || "",
        productType: product.productType || "",
        productName: product.name || product.brand || ""
      } : record;
    }).filter(Boolean);

    const periodShares = getPeriodShares(shares);'''
dash=replace_once(dash,old,new,'dashboard normalization')
(p/'dashboard.js').write_text(dash)

ana=(p/'analytics.js').read_text()
old='''      return {
        contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
        products: Array.isArray(raw.products) ? raw.products : [],
        shares: Array.isArray(raw.shares) ? raw.shares : []
      };'''
new='''      const products = Array.isArray(raw.products) ? raw.products : [];
      const storedShares = Array.isArray(raw.shares) ? raw.shares : [];
      const shares = storedShares.map(record => {
        const product = record.productId == null
          ? products.find(p =>
              String(p.name || p.brand || "").trim() ===
                String(record.productName || record.brand || "").trim() &&
              String(p.productType || "").trim() ===
                String(record.productType || "").trim()
            )
          : products.find(p => String(p.id) === String(record.productId));

        if (record.productId != null && !product) return null;
        return product ? {
          ...record,
          brand: product.brand || product.name || "",
          productType: product.productType || "",
          productName: product.name || product.brand || ""
        } : record;
      }).filter(Boolean);

      return {
        contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
        products,
        shares
      };'''
ana=replace_once(ana,old,new,'analytics normalization')
(p/'analytics.js').write_text(ana)

idx=(p/'index.html').read_text()
idx=replace_once(idx,'<script src="analytics.js"></script>\n<script src="followup.js"></script>','<script src="analytics.js"></script>\n<script src="followup.js"></script>\n<script src="undo-redo.js"></script>','index script')
(p/'index.html').write_text(idx)

sw=(p/'sw.js').read_text()
sw=replace_once(sw,"const CACHE = 'deal-dhamaka-v8-cache';","const CACHE = 'deal-dhamaka-v9-cache';",'cache version')
sw=replace_once(sw,"  './followup.js',\n  './manifest.json'","  './followup.js',\n  './undo-redo.js',\n  './manifest.json'",'cache assets')
(p/'sw.js').write_text(sw)

undo=r'''/* Deal Dhamaka — cross-tab Undo/Redo for local data mutations.
   Cannot reverse WhatsApp messages already sent. */
(() => {
  "use strict";
  if (typeof state === "undefined" || typeof save !== "function") return;

  const MAX_HISTORY = 80;
  const undoStack = [];
  const redoStack = [];
  let applyingHistory = false;
  let lastSnapshot = JSON.stringify(state);
  const underlyingSave = save;
  const snapshot = () => JSON.stringify(state);
  const clone = value => JSON.parse(JSON.stringify(value));

  function refreshButtons() {
    document.querySelectorAll("[data-undo]").forEach(button => {
      button.disabled = undoStack.length === 0;
      button.setAttribute("aria-label", "Undo last data change");
    });
    document.querySelectorAll("[data-redo]").forEach(button => {
      button.disabled = redoStack.length === 0;
      button.setAttribute("aria-label", "Redo last undone data change");
    });
  }

  function addControls() {
    document.querySelectorAll(".page").forEach(page => {
      if (page.querySelector(".undo-redo-bar")) return;
      const bar = document.createElement("div");
      bar.className = "undo-redo-bar";
      bar.innerHTML = `
        <button type="button" class="secondary" data-undo disabled>↶ Undo</button>
        <button type="button" class="secondary" data-redo disabled>↷ Redo</button>
      `;
      const heading = page.querySelector(".sectionhead, .hero");
      if (heading) heading.insertAdjacentElement("afterend", bar);
      else page.insertAdjacentElement("afterbegin", bar);
    });

    const style = document.createElement("style");
    style.textContent = `
      .undo-redo-bar{display:flex;gap:8px;margin:8px 0 12px}
      .undo-redo-bar button{flex:1;min-height:38px}
      .undo-redo-bar button:disabled{opacity:.38;cursor:not-allowed}
    `;
    document.head.appendChild(style);
    document.querySelectorAll("[data-undo]").forEach(button => button.addEventListener("click", undo));
    document.querySelectorAll("[data-redo]").forEach(button => button.addEventListener("click", redo));
    refreshButtons();
  }

  function renderRestoredState() {
    const active = document.querySelector(".page.active")?.id || "dashboard";
    if (typeof showPage === "function") showPage(active);
    document.dispatchEvent(new CustomEvent("dda:data-restored"));
    refreshButtons();
  }

  function restore(target) {
    applyingHistory = true;
    try {
      state = clone(target);
      lastSnapshot = snapshot();
      underlyingSave();
      lastSnapshot = snapshot();
    } finally {
      applyingHistory = false;
    }
    renderRestoredState();
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(JSON.parse(undoStack.pop()));
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(JSON.parse(redoStack.pop()));
  }

  const wrappedSave = function (...args) {
    const current = snapshot();
    if (!applyingHistory && current !== lastSnapshot) {
      undoStack.push(lastSnapshot);
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack.length = 0;
    }
    const result = underlyingSave.apply(this, args);
    lastSnapshot = snapshot();
    refreshButtons();
    return result;
  };
  wrappedSave.__undoRedoWrapped = true;
  save = wrappedSave;
  addControls();
})();'''
(p/'undo-redo.js').write_text(undo)

readme=(p/'README.md').read_text()
readme += '''\n\n## Product report fixes and Undo/Redo\n\n- Tracking and dashboard reports resolve current brand and product-type names from the current product record.\n- Share records whose referenced product was deleted are excluded from current inventory/report calculations; records remain in History.\n- Undo/Redo controls are added to each app tab for saved local-data changes (up to 80 steps). They cannot undo a WhatsApp message that was already sent.\n- The local-storage key remains `dealDhamakaAgentV2`; export a JSON backup before replacing app files.\n'''
(p/'README.md').write_text(readme)
