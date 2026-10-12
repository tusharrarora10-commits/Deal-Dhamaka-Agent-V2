const KEY = "dealDhamakaAgentV2";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const uid = () => crypto.randomUUID
  ? crypto.randomUUID()
  : Date.now() + "-" + Math.random().toString(16).slice(2);

let state = { contacts: [], products: [], shares: [] };
let batch = [], batchIndex = 0;
let selectedContacts = new Set(), selectedProducts = new Set();

/* =========================
   DATA AND STORAGE
========================= */

function load() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || "{}");
    state = {
      contacts: Array.isArray(x.contacts) ? x.contacts : [],
      products: Array.isArray(x.products) ? x.products : [],
      shares: Array.isArray(x.shares) ? x.shares : []
    };
  } catch (e) {
    state = { contacts: [], products: [], shares: [] };
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  updateStats();
}

function quantity(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatQuantity(value) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

/* =========================
   INVENTORY CALCULATIONS
========================= */

function productTotals(productId) {
  const product = state.products.find(
    p => String(p.id) === String(productId)
  );

  const records = state.shares.filter(
    s => String(s.productId) === String(productId)
  );

  const ordered = records.reduce(
    (sum, s) => sum + quantity(s.orderedQty), 0
  );

  const fulfilled = records.reduce(
    (sum, s) => sum + quantity(s.fulfilledQty), 0
  );

  const allotted = quantity(product && product.allottedQty);

  return {
    allotted,
    ordered,
    fulfilled,
    pending: Math.max(0, ordered - fulfilled),
    available: Math.max(0, allotted - fulfilled),
    unit: (product && product.quantityUnit) || "units"
  };
}

function renderInventoryOverview() {
  const home = $("dashboard");
  if (!home) return;

  let panel = $("inventoryOverview");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "inventoryOverview";
    panel.className = "card";

    const stats = home.querySelector(".stats");
    const advanced = $("advancedDashboard");

    if (advanced) {
      advanced.insertAdjacentElement("afterend", panel);
    } else if (stats) {
      stats.insertAdjacentElement("afterend", panel);
    } else {
      home.appendChild(panel);
    }
  }

  const total = state.products.reduce((a, p) => {
    const t = productTotals(p.id);
    a.allotted += t.allotted;
    a.ordered += t.ordered;
    a.fulfilled += t.fulfilled;
    a.pending += t.pending;
    a.available += t.available;
    return a;
  }, {
    allotted: 0,
    ordered: 0,
    fulfilled: 0,
    pending: 0,
    available: 0
  });

  const rows = state.products.map(p => {
    const t = productTotals(p.id);

    return `
      <div class="report-row">
        <span>
          ${esc(p.name)}
          <small style="display:block;color:var(--muted)">
            Allotted ${formatQuantity(t.allotted)} ${esc(t.unit)}
            · Ordered ${formatQuantity(t.ordered)}
            · Fulfilled ${formatQuantity(t.fulfilled)}
          </small>
        </span>
        <strong>Available ${formatQuantity(t.available)}</strong>
      </div>
    `;
  }).join("");

  panel.innerHTML = `
    <h3>Product Allotment &amp; Fulfilment</h3>

    <div class="stats">
      <div class="stat">
        <b>${formatQuantity(total.allotted)}</b>
        <span>Allotted</span>
      </div>
      <div class="stat">
        <b>${formatQuantity(total.ordered)}</b>
        <span>Ordered</span>
      </div>
      <div class="stat">
        <b>${formatQuantity(total.fulfilled)}</b>
        <span>Physically Fulfilled</span>
      </div>
      <div class="stat">
        <b>${formatQuantity(total.available)}</b>
        <span>Available</span>
      </div>
    </div>

    <p>
      <b>Pending fulfilment:</b> ${formatQuantity(total.pending)}
      · <b>Contact share attempts:</b> ${state.shares.length}
    </p>

    <p class="hint">
      Contact share attempts and physical quantities are tracked separately.
    </p>

    <button class="secondary full" type="button" id="openProductStock">
      View Product Stock
    </button>

    <div>
      ${rows || '<div class="report-empty">Add products to start tracking stock.</div>'}
    </div>
  `;

  $("openProductStock").onclick = () => showPage("products");
}

function updateStats() {
  $("contactCount").textContent = state.contacts.length;
  $("productCount").textContent = state.products.length;
  $("sentCount").textContent = state.shares.length;
  renderInventoryOverview();
}

/* =========================
   PAGE NAVIGATION
========================= */

function showPage(name) {
  document.querySelectorAll(".page").forEach(x =>
    x.classList.toggle("active", x.id === name)
  );

  document.querySelectorAll(".tabbar button").forEach(x =>
    x.classList.toggle("active", x.dataset.page === name)
  );

  if (name === "contacts") renderContacts();
  if (name === "products") renderProducts();
  if (name === "send") renderSendLists();
  if (name === "history") renderHistory();
  if (name === "tracking") renderTracking();

  updateStats();
  window.scrollTo(0, 0);
}

document.querySelectorAll(".tabbar button,[data-page]").forEach(b =>
  b.addEventListener("click", () => showPage(b.dataset.page))
);

/* =========================
   MODAL
========================= */

function openModal(title, html, submit) {
  $("modalTitle").textContent = title;
  $("modalForm").innerHTML =
    html + '<button class="primary big" type="submit">Save</button>';

  $("modal").hidden = false;

  $("modalForm").onsubmit = async e => {
    e.preventDefault();
    await submit(new FormData(e.target));

    $("modal").hidden = true;
    save();

    const active =
      document.querySelector(".page.active")?.id || "dashboard";

    showPage(active);
  };
}

$("closeModal").onclick = () => $("modal").hidden = true;

/* =========================
   CONTACT MANAGEMENT
========================= */

function addContact(x) {
  x = x || { name: "", phone: "", category: "General" };

  openModal(
    x.id ? "Edit Contact" : "Add Contact",
    `
      <label>Name
        <input name="name" required value="${esc(x.name)}">
      </label>

      <label>WhatsApp Number (with country code)
        <input name="phone" required inputmode="tel"
          placeholder="919876543210" value="${esc(x.phone)}">
      </label>

      <label>Category
        <input name="category" value="${esc(x.category || "General")}">
      </label>
    `,
    f => {
      const obj = {
        id: x.id || uid(),
        name: f.get("name").trim(),
        phone: f.get("phone").replace(/\D/g, ""),
        category: f.get("category").trim() || "General"
      };

      if (obj.phone.length < 10) {
        alert("Please enter a valid number including country code.");
        return;
      }

      const i = state.contacts.findIndex(c => c.id === obj.id);

      if (i >= 0) state.contacts[i] = obj;
      else state.contacts.push(obj);
    }
  );
}

/* =========================
   PRODUCT MANAGEMENT
========================= */

function addProduct(x) {
  x = x || {
    name: "",
    brand: "",
    productType: "",
    description: "",
    price: "",
    platform: "Amazon",
    link: "",
    allottedQty: 0,
    quantityUnit: "units"
  };

  x.brand = x.brand || x.name || "";

  openModal(
    x.id ? "Edit Product" : "Add Product",
    `
      <div class="product-form-grid">
        <label>Brand Name
          <input name="brand" required placeholder="e.g. Nike"
            value="${esc(x.brand)}">
        </label>

        <label>Product Type
          <input name="productType" required placeholder="e.g. Shoes"
            value="${esc(x.productType)}">
        </label>

        <label class="wide">Description
          <textarea name="description" rows="2">${esc(x.description || "")}</textarea>
        </label>

        <label>Price (₹)
          <input name="price" inputmode="decimal"
            value="${esc(x.price || "")}">
        </label>

        <label>Platform
          <select name="platform">
            ${["Amazon", "Flipkart", "Nykaa", "Myntra", "Other"]
              .map(v => `<option ${x.platform === v ? "selected" : ""}>${v}</option>`)
              .join("")}
          </select>
        </label>

        <label>Allotted Quantity
          <input name="allottedQty" type="number" min="0" step="any"
            required value="${esc(x.allottedQty ?? 0)}">
        </label>

        <label>Quantity Unit
          <input name="quantityUnit" placeholder="units, pieces, packs"
            value="${esc(x.quantityUnit || "units")}">
        </label>

        <label class="wide">Product Link
          <input name="link" type="url" required placeholder="https://..."
            value="${esc(x.link || "")}">
        </label>
      </div>

      <p class="hint">
        Physical quantities are tracked separately from WhatsApp share attempts.
      </p>
    `,
    f => {
      const brand = f.get("brand").trim();
      const allottedQty = Number(f.get("allottedQty"));

      if (!Number.isFinite(allottedQty) || allottedQty < 0) {
        alert("Enter a valid allotted quantity.");
        return;
      }

      const obj = {
        ...x,
        id: x.id || uid(),
        name: brand,
        brand,
        productType: f.get("productType").trim(),
        description: f.get("description").trim(),
        price: f.get("price").trim(),
        platform: f.get("platform"),
        link: f.get("link").trim(),
        allottedQty,
        quantityUnit: f.get("quantityUnit").trim() || "units"
      };

      const i = state.products.findIndex(p => p.id === obj.id);

      if (i >= 0) {
        state.products[i] = { ...state.products[i], ...obj };
      } else {
        state.products.push(obj);
      }
    }
  );
}

$("addContact").onclick = () => addContact();
$("addProduct").onclick = () => addProduct();

function renderContacts() {
  const q = $("contactSearch").value.toLowerCase();

  const a = state.contacts.filter(x =>
    (x.name + " " + x.phone + " " + x.category)
      .toLowerCase().includes(q)
  );

  $("contactsList").innerHTML = a.length ? a.map(x => `
    <div class="item">
      <div>
        <h3>${esc(x.name)}</h3>
        <p>WhatsApp: ${esc(x.phone)}</p>
        <p>${esc(x.category)}</p>
      </div>
      <div class="actions">
        <button class="mini" data-edit="${x.id}">Edit</button>
        <button class="mini" data-delete="${x.id}">Delete</button>
      </div>
    </div>
  `).join("") :
    '<div class="empty">No contacts yet. Add one or import a CSV.</div>';

  bindItemActions("contacts");
}

function renderProducts() {
  const q = $("productSearch").value.toLowerCase();

  const a = state.products.filter(x =>
    (x.name + " " + x.brand + " " + x.productType + " " +
      x.platform + " " + x.link).toLowerCase().includes(q)
  );

  $("productsList").innerHTML = a.length ? a.map(x => {
    const t = productTotals(x.id);

    return `
      <div class="item">
        <div>
          <h3>${esc(x.name)}</h3>
          <p><b>${esc(x.brand || "No brand")}</b> · ${esc(x.productType || "No type")}</p>
          <p>${esc(x.platform)}${x.price ? " · ₹" + esc(x.price) : ""}</p>
          <p>${esc(x.link)}</p>
          <p>
            <b>Allotted:</b> ${formatQuantity(t.allotted)} ${esc(t.unit)}
            · <b>Ordered:</b> ${formatQuantity(t.ordered)}
            · <b>Fulfilled:</b> ${formatQuantity(t.fulfilled)}
          </p>
          <p><b>Available:</b> ${formatQuantity(t.available)} ${esc(t.unit)}</p>
        </div>
        <div class="actions">
          <button class="mini" data-edit="${x.id}">Edit</button>
          <button class="mini" data-delete="${x.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("") :
    '<div class="empty">No products yet. Add one or import a CSV.</div>';

  bindItemActions("products");
}

function bindItemActions(type) {
  document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
    const arr = type === "contacts" ? state.contacts : state.products;
    const x = arr.find(v => v.id === b.dataset.edit);
    type === "contacts" ? addContact(x) : addProduct(x);
  });

  document.querySelectorAll("[data-delete]").forEach(b => b.onclick = () => {
    if (!confirm("Delete this item? Existing share history will be retained.")) return;

    if (type === "contacts") {
      state.contacts = state.contacts.filter(x => x.id !== b.dataset.delete);
    } else {
      state.products = state.products.filter(x => x.id !== b.dataset.delete);
    }

    save();
    renderContacts();
    renderProducts();
  });
}

$("contactSearch").oninput = renderContacts;
$("productSearch").oninput = renderProducts;

/* =========================
   QUANTITY FIELD STYLING
========================= */

const quantityStyle = document.createElement("style");

quantityStyle.textContent = `
  .quantity-entry-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
  }

  .quantity-entry-grid label {
    font-size: 13px;
    font-weight: 700;
  }

  .quantity-entry-grid input {
    width: 100%;
    min-width: 0;
    margin-top: 6px;
  }

  #inventoryOverview .stats {
    margin: 12px 0;
  }

  @media (max-width: 380px) {
    .quantity-entry-grid {
      grid-template-columns: 1fr;
    }
  }
`;

document.head.appendChild(quantityStyle);

/* =========================
   WHATSAPP SHARE SELECTION
========================= */

function renderSendLists() {
  const cq = $("sendContactSearch").value.toLowerCase();
  const pq = $("sendProductSearch").value.toLowerCase();

  $("sendContacts").innerHTML = state.contacts
    .filter(c => (c.name + " " + c.phone).toLowerCase().includes(cq))
    .map(c => `
      <label class="checkrow">
        <input type="checkbox" data-contact="${c.id}"
          ${selectedContacts.has(c.id) ? "checked" : ""}>
        <span>${esc(c.name)}<small>${esc(c.phone)}</small></span>
      </label>
    `).join("") || '<div class="report-empty">No contacts found.</div>';

  $("sendProducts").innerHTML = state.products
    .filter(p => (p.name + " " + p.brand + " " + p.productType)
      .toLowerCase().includes(pq))
    .map(p => `
      <label class="checkrow">
        <input type="checkbox" data-product="${p.id}"
          ${selectedProducts.has(p.id) ? "checked" : ""}>
        <span>${esc(p.name)}<small>${esc(p.brand)} · ${esc(p.productType)} · ${esc(p.platform)}</small></span>
      </label>
    `).join("") || '<div class="report-empty">No products found.</div>';

  document.querySelectorAll("[data-contact]").forEach(c => c.onchange = () => {
    const id = c.dataset.contact;
    if (c.checked) selectedContacts.add(id);
    else selectedContacts.delete(id);
    rebuildBatchFromSelections();
  });

  document.querySelectorAll("[data-product]").forEach(p => p.onchange = () => {
    const id = p.dataset.product;
    if (p.checked) selectedProducts.add(id);
    else selectedProducts.delete(id);
    rebuildBatchFromSelections();
  });

  updateBatchUI();
}

function rebuildBatchFromSelections() {
  batch = [];
  selectedContacts.forEach(c =>
    selectedProducts.forEach(p => batch.push({
      contactId: c,
      productId: p
    }))
  );
  batchIndex = 0;
  updateBatchUI();
}

$("allContacts").onclick = () => {
  selectedContacts = new Set(state.contacts.map(x => x.id));
  rebuildBatchFromSelections();
  renderSendLists();
};

$("clearContacts").onclick = () => {
  selectedContacts = new Set();
  rebuildBatchFromSelections();
  renderSendLists();
};

$("allProducts").onclick = () => {
  selectedProducts = new Set(state.products.map(x => x.id));
  rebuildBatchFromSelections();
  renderSendLists();
};

$("clearProducts").onclick = () => {
  selectedProducts = new Set();
  rebuildBatchFromSelections();
  renderSendLists();
};

$("sendContactSearch").oninput = renderSendLists;
$("sendProductSearch").oninput = renderSendLists;

function updateBatchUI() {
  const valid = batch.filter(x => x.contactId && x.productId);

  $("batchInfo").textContent = valid.length
    ? `Ready: ${valid.length} contact-product share(s). ${Math.max(0, valid.length - batchIndex)} remaining.`
    : "Select at least one contact and one product.";

  $("openNext").disabled = !valid.length || batchIndex >= valid.length;

  const cur = valid[batchIndex];

  if (cur) {
    const c = state.contacts.find(x => x.id === cur.contactId);
    const p = state.products.find(x => x.id === cur.productId);
    $("message").value = makeMessage(c, p);
  } else if (!valid.length) {
    $("message").value = "";
  }

  $("openNext").textContent = valid.length && batchIndex < valid.length
    ? `Open Next WhatsApp (${valid.length - batchIndex} left)`
    : "Batch Completed";
}

function makeMessage(c, p) {
  return `🥳 Something FREE is waiting for you! 🎁

Hi ${c.name} 👋

🛍️ ${p.brand || p.name}
✨ ${p.description || ""}

👇 Your deal link:
🔗 ${p.link}

🛒 Place your order & enjoy your freebie! 😍

💥 Deal Dhamaka — Happy Shopping! 🎉`;
}

$("openNext").onclick = () => {
  const valid = batch.filter(x => x.contactId && x.productId);
  const item = valid[batchIndex];
  if (!item) return;

  const c = state.contacts.find(x => x.id === item.contactId);
  const p = state.products.find(x => x.id === item.productId);

  if (!c || !p) return alert("Please refresh your selection.");

  const phone = c.phone.replace(/\D/g, "");
  if (phone.length < 10) {
    return alert("Please use a valid WhatsApp number including country code.");
  }

  const msg = $("message").value.trim() || makeMessage(c, p);

  const rec = {
    id: uid(),
    contactId: c.id,
    contactName: c.name,
    phone,
    productId: p.id,
    productName: p.name,
    brand: p.brand,
    productType: p.productType,
    platform: p.platform,
    time: Date.now(),
    message: msg,
    status: "WhatsApp opened; send not confirmed",
    orderedQty: 0,
    fulfilledQty: 0
  };

  state.shares.push(rec);
  save();

  batchIndex++;
  updateBatchUI();
  renderTracking();

  window.location.href =
    `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
};

$("resetBatch").onclick = () => {
  selectedContacts = new Set();
  selectedProducts = new Set();
  batch = [];
  batchIndex = 0;
  renderSendLists();
};

/* =========================
   SHARE HISTORY
========================= */

function renderHistory() {
  const a = [...state.shares].sort((a, b) => b.time - a.time);

  $("historyList").innerHTML = a.length ? a.map(x => `
    <div class="item">
      <div>
        <h3>${esc(x.contactName)} · ${esc(x.productName)}</h3>
        <p>${esc(x.brand)} · ${esc(x.productType)}</p>
        <p>${new Date(x.time).toLocaleString()}</p>
        <p>${esc(x.phone)} · ${esc(x.status || "Share initiated")}</p>
      </div>
      <button onclick="deleteShare('${esc(x.id)}')" class="delete-history">🗑️ Delete</button>
    </div>
  `).join("") : '<div class="empty">No share attempts recorded yet.</div>';
}

$("clearHistory").onclick = () => {
  if (confirm("Clear all share history and tracking records?")) {
    state.shares = [];
    save();
    renderHistory();
    renderTracking();
  }
};

function countBy(items, keyFn) {
  const m = new Map();

  items.forEach(x => {
    const k = keyFn(x) || "Unspecified";
    m.set(k, (m.get(k) || 0) + 1);
  });

  return [...m.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
}

function reportRows(el, entries) {
  $(el).innerHTML = entries.length
    ? entries.map(([k, v]) =>
        `<div class="report-row"><span>${esc(k)}</span><strong>${v}</strong></div>`
      ).join("")
    : '<div class="report-empty">No records for this selection.</div>';
}

function deleteShare(shareId) {
  if (!confirm("Delete this history record and its tracking record?")) return;

  state.shares = state.shares.filter(
    x => String(x.id) !== String(shareId)
  );

  save();
  renderHistory();
  renderTracking();
}

/* =========================
   ORDER AND FULFILMENT
========================= */

function toggleOrdered(shareId, checked) {
  const item = state.shares.find(
    x => String(x.id) === String(shareId)
  );

  if (!item) return;

  item.ordered = checked;
  item.orderedAt = checked
    ? (item.orderedAt || new Date().toISOString())
    : "";

  save();
  renderTracking();
}

function updateShareQuantities(shareId, field, value) {
  if (field !== "orderedQty" && field !== "fulfilledQty") return;

  const item = state.shares.find(
    x => String(x.id) === String(shareId)
  );

  if (!item) return;

  if (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
    alert("Enter a quantity of zero or greater.");
    renderTracking();
    return;
  }

  const n = Number(value);

  if (field === "fulfilledQty" && n > quantity(item.orderedQty)) {
    if (!confirm("Fulfilled quantity exceeds the ordered quantity. Save anyway?")) {
      renderTracking();
      return;
    }
  }

  item[field] = n;
  item.quantityUpdatedAt = new Date().toISOString();

  if (field === "orderedQty" && n > 0) {
    item.ordered = true;
    item.orderedAt = item.orderedAt || new Date().toISOString();
  }

  save();
  renderTracking();
}

/* =========================
   TRACKING DASHBOARD
========================= */

function renderTracking() {
  const brands = [...new Set(state.shares.map(x => x.brand).filter(Boolean))].sort();
  const types = [...new Set(state.shares.map(x => x.productType).filter(Boolean))].sort();
  const recipients = [...new Set(state.shares.map(x => x.contactName).filter(Boolean))].sort();

  const getSelectedValues = id =>
    [...$(id).querySelectorAll('input[type="checkbox"]:checked')]
      .map(input => input.value);

  const setOptions = (id, values, selectedValues) => {
    const container = $(id);

    if (!values.length) {
      container.innerHTML = '<p class="hint">No options available.</p>';
      return;
    }

    container.innerHTML = values.map(value => `
      <label class="filter-option">
        <input type="checkbox" value="${esc(value)}"
          ${selectedValues.includes(value) ? "checked" : ""}>
        <span>${esc(value)}</span>
      </label>
    `).join("");
  };

  const oldBrands = getSelectedValues("filterBrand");
  const oldTypes = getSelectedValues("filterType");
  const oldRecipients = getSelectedValues("filterRecipient");

  setOptions("filterBrand", brands, oldBrands);
  setOptions("filterType", types, oldTypes);
  setOptions("filterRecipient", recipients, oldRecipients);

  const updateSummary = (id, values, allLabel) => {
    $(id).textContent = !values.length
      ? allLabel
      : values.length === 1
        ? values[0]
        : values.length + " selected";
  };

  updateSummary("brandFilterSummary", oldBrands, "All Brands");
  updateSummary("typeFilterSummary", oldTypes, "All Product Types");
  updateSummary("recipientFilterSummary", oldRecipients, "All Recipients");

  $("trackTotal").textContent = state.shares.length;
  $("trackBrands").textContent = brands.length;
  $("trackTypes").textContent = types.length;
  $("trackRecipients").textContent = recipients.length;

  const selectedBrands = getSelectedValues("filterBrand");
  const selectedTypes = getSelectedValues("filterType");
  const selectedRecipients = getSelectedValues("filterRecipient");

  const from = $("filterFrom").value
    ? new Date($("filterFrom").value + "T00:00:00").getTime()
    : 0;

  const to = $("filterTo").value
    ? new Date($("filterTo").value + "T23:59:59.999").getTime()
    : Infinity;

  const orderStatus = $("filterOrderStatus").value;

  const a = state.shares.filter(x =>
    (!selectedBrands.length || selectedBrands.includes(x.brand)) &&
    (!selectedTypes.length || selectedTypes.includes(x.productType)) &&
    (!selectedRecipients.length || selectedRecipients.includes(x.contactName)) &&
    x.time >= from &&
    x.time <= to &&
    (
      orderStatus === "all" ||
      (orderStatus === "ordered" && !!x.ordered) ||
      (orderStatus === "pending" && !x.ordered)
    )
  );

  reportRows("brandCounts", countBy(a, x => x.brand));
  reportRows("typeCounts", countBy(a, x => x.productType));
  reportRows(
    "comboCounts",
    countBy(a, x => (x.brand || "Unspecified") + " + " + (x.productType || "Unspecified"))
  );
  reportRows("recipientCounts", countBy(a, x => x.contactName));

  const ordered = a.filter(x => x.ordered).length;
  const pending = a.length - ordered;

  const totals = a.reduce((t, x) => {
    t.orderedQty += quantity(x.orderedQty);
    t.fulfilledQty += quantity(x.fulfilledQty);
    return t;
  }, { orderedQty: 0, fulfilledQty: 0 });

  $("trackingDetails").innerHTML = `
    <div class="card order-summary">
      <p><b>Share attempts:</b> ${a.length}</p>
      <p><b>Contacts marked ordered:</b> ${ordered}</p>
      <p><b>Not marked ordered:</b> ${pending}</p>
      <p><b>Physical ordered quantity:</b> ${formatQuantity(totals.orderedQty)}</p>
      <p><b>Physically fulfilled quantity:</b> ${formatQuantity(totals.fulfilledQty)}</p>
      <p><b>Pending fulfilment quantity:</b>
        ${formatQuantity(Math.max(0, totals.orderedQty - totals.fulfilledQty))}
      </p>
    </div>
  ` + (a.length ? [...a].sort((x, y) => y.time - x.time).map(x => {
    const product = state.products.find(
      p => String(p.id) === String(x.productId)
    );
    const unit = (product && product.quantityUnit) || "units";

    return `
      <div class="detail-card">
        <h4>${esc(x.contactName)} ← ${esc(x.brand || x.productName)}</h4>

        <p>
          <span class="badge">${esc(x.brand || "No brand")}</span>
          <span class="badge">${esc(x.productType || "No type")}</span>
        </p>

        <p>${new Date(x.time).toLocaleString()} · ${esc(x.phone)}</p>
        <p>${esc(x.status || "Share initiated; delivery not confirmed")}</p>

        <label class="ordered-toggle">
          <input type="checkbox" ${x.ordered ? "checked" : ""}
            onchange="toggleOrdered('${esc(x.id)}',this.checked)">
          Product Ordered
        </label>

        <div class="quantity-entry-grid">
          <label>
            Physical Ordered Qty (${esc(unit)})
            <input type="number" min="0" step="any"
              value="${quantity(x.orderedQty)}"
              onchange="updateShareQuantities('${esc(x.id)}','orderedQty',this.value)">
          </label>

          <label>
            Physically Fulfilled Qty (${esc(unit)})
            <input type="number" min="0" step="any"
              value="${quantity(x.fulfilledQty)}"
              onchange="updateShareQuantities('${esc(x.id)}','fulfilledQty',this.value)">
          </label>
        </div>
      </div>
    `;
  }).join("") : '<div class="report-empty">No records match these filters.</div>');
}

["filterBrand", "filterType", "filterRecipient"].forEach(id =>
  $(id).addEventListener("change", renderTracking)
);

["filterFrom", "filterTo", "filterOrderStatus"].forEach(id =>
  $(id).addEventListener("change", renderTracking)
);

$("refreshTracking").onclick = renderTracking;

$("clearFilters").onclick = () => {
  ["filterBrand", "filterType", "filterRecipient"].forEach(id => {
    $(id).querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
  });

  $("filterFrom").value = "";
  $("filterTo").value = "";
  $("filterOrderStatus").value = "all";

  renderTracking();
};

/* =========================
   CSV AND BACKUP EXPORT
========================= */

function download(name, content, type) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));

  a.href = url;
  a.download = name;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("exportTrackingCsv").onclick = () => {
  const headers = [
    "Date", "Recipient", "Phone", "Product", "Brand",
    "Product Type", "Platform", "Status", "Contact Ordered",
    "Physical Ordered Qty", "Physical Fulfilled Qty",
    "Physical Pending Qty"
  ];

  const rows = state.shares.map(x => [
    new Date(x.time).toISOString(),
    x.contactName,
    x.phone,
    x.productName,
    x.brand,
    x.productType,
    x.platform,
    x.status,
    !!x.ordered,
    quantity(x.orderedQty),
    quantity(x.fulfilledQty),
    Math.max(0, quantity(x.orderedQty) - quantity(x.fulfilledQty))
  ]);

  const csv = [headers, ...rows].map(r =>
    r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")
  ).join("\r\n");

  download("deal-dhamaka-tracking.csv", csv, "text/csv;charset=utf-8");
};

$("exportData").onclick = () => download(
  "deal-dhamaka-backup.json",
  JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    ...state
  }, null, 2),
  "application/json"
);

$("importData").onchange = async e => {
  try {
    const f = e.target.files[0];
    if (!f) return;

    const d = JSON.parse(await f.text());

    if (!confirm(
      "Import backup? Existing contacts/products/shares will be merged; matching IDs will be replaced."
    )) return;

    for (const k of ["contacts", "products", "shares"]) {
      if (Array.isArray(d[k])) {
        const map = new Map(state[k].map(x => [x.id, x]));
        d[k].forEach(x => map.set(x.id || uid(), x));
        state[k] = [...map.values()];
      }
    }

    save();
    alert("Backup imported.");
    showPage("dashboard");
  } catch (err) {
    alert("Could not import this backup. Please check the JSON file.");
  } finally {
    e.target.value = "";
  }
};

/* =========================
   CSV IMPORT
========================= */

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i], n = text[i + 1];

    if (ch === '"' && q && n === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      q = !q;
      continue;
    }

    if (ch === "," && !q) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !q) {
      if (ch === "\r" && n === "\n") i++;

      row.push(cell);
      if (row.some(x => x.trim())) rows.push(row);

      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.some(x => x.trim())) rows.push(row);

  return rows;
}

async function importCSV(file, type) {
  if (!file) return;

  try {
    const rows = parseCSV(await file.text());
    if (rows.length < 2) throw new Error("No data rows");

    const h = rows.shift().map(x => x.trim().toLowerCase());
    let added = 0;

    for (const r of rows) {
      const o = {};
      h.forEach((k, i) => o[k] = (r[i] || "").trim());

      if (type === "contacts") {
        const name = o.name || o["full name"];
        const phone = o.phone || o["whatsapp number"] || o.number;

        if (name && phone) {
          state.contacts.push({
            id: uid(),
            name,
            phone: phone.replace(/\D/g, ""),
            category: o.category || "General"
          });
          added++;
        }
      } else {
        const name = o.name || o["product name"];
        const link = o.link || o["product link"] || o.url;

        if (name && link) {
          state.products.push({
            id: uid(),
            name,
            brand: o.brand || o["brand name"] || "",
            productType: o["product type"] || o.producttype || o.type || "",
            description: o.description || "",
            price: o.price || "",
            platform: o.platform || "Other",
            link,
            allottedQty: quantity(o["allotted quantity"] || o.allottedqty || 0),
            quantityUnit: o["quantity unit"] || o.quantityunit || "units"
          });
          added++;
        }
      }
    }

    save();
    alert(`Import complete: ${added} ${type} added.`);
    showPage(type);
  } catch (err) {
    alert("CSV import failed. Check the header row and file format.");
  } finally {
    if (type === "contacts") $("contactsCsv").value = "";
    else $("productsCsv").value = "";
  }
}

$("importCsvContacts").onclick = () => $("contactsCsv").click();
$("contactsCsv").onchange = e => importCSV(e.target.files[0], "contacts");

$("importCsvProducts").onclick = () => $("productsCsv").click();
$("productsCsv").onchange = e => importCSV(e.target.files[0], "products");

/* =========================
   DATA RESET
========================= */

$("resetData").onclick = () => {
  if (confirm(
    "Delete all contacts, products and share history from this browser? This cannot be undone."
  )) {
    state = { contacts: [], products: [], shares: [] };
    save();

    batch = [];
    batchIndex = 0;
    selectedContacts.clear();
    selectedProducts.clear();

    showPage("dashboard");
  }
};

/* =========================
   APP INSTALLATION
========================= */

let deferred;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferred = e;
  $("installBtn").hidden = false;
});

$("installBtn").onclick = async () => {
  if (deferred) {
    await deferred.prompt();
    deferred = null;
    $("installBtn").hidden = true;
  }
};

/* =========================
   INITIALIZATION
========================= */

load();
save();
renderSendLists();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {})
  );
}