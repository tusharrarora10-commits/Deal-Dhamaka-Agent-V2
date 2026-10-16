
const KEY = "dealDhamakaAgentV2";
const $ = id => document.getElementById(id);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
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

    
state.products = state.products.map(p => ({
  ...p,
  allottedQty:
    Number.isFinite(Number(p.allottedQty)) &&
    Number(p.allottedQty) >= 0
      ? Number(p.allottedQty)
      : 0,
  quantityUnit: p.quantityUnit || "units",
  dealStatus: p.dealStatus === "closed" ? "closed" : "active"
}));


    state.shares = state.shares.map(s => {
      const record = { ...s };
      delete record.fulfilled;
      delete record.fulfilledAt;

      return {
        ...record,
        ordered: !!record.ordered,
        orderedAt: record.orderedAt || ""
      };
    });
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
  const n = Number(value) || 0;
  return Number.isInteger(n)
    ? String(n)
    : String(Number(n.toFixed(2)));
}

/* =========================
   INVENTORY CALCULATIONS
   OPTION A:
   Each share record consumes one allotted unit.
========================= */

function productTotals(productId) {
  const product = state.products.find(
    p => String(p.id) === String(productId)
  );

  const records = state.shares.filter(
    s => String(s.productId) === String(productId)
  );

  const allotted = quantity(product && product.allottedQty);
  const shared = records.length;
  const ordered = records.filter(s => !!s.ordered).length;

  return {
    allotted,
    shared,
    ordered,
    pendingAllotted: Math.max(0, allotted - shared),
    pendingOrdered: Math.max(0, shared - ordered),
    available: Math.max(0, allotted - shared),
    shortage: Math.max(0, shared - allotted),
    unit: (product && product.quantityUnit) || "units"
  };
}

function renderInventoryOverview() { /* Home inventory is consolidated in dashboard.js. */ }

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

$("closeModal").onclick = () => {
  $("modal").hidden = true;
};

/* =========================
   CONTACT MANAGEMENT
========================= */

function addContact(x) {
  x = x || {
    name: "",
    phone: "",
    category: "General"
  };

  openModal(
    x.id ? "Edit Contact" : "Add Contact",
    `
      <label>Name
        <input name="name" required value="${esc(x.name)}">
      </label>

      <label>WhatsApp Number (with country code)
        <input
          name="phone"
          required
          inputmode="tel"
          placeholder="919876543210"
          value="${esc(x.phone)}"
        >
      </label>

      <label>Category
        <input
          name="category"
          value="${esc(x.category || "General")}"
        >
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

      if (i >= 0) {
        state.contacts[i] = obj;
      } else {
        state.contacts.push(obj);
      }
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
    quantityUnit: "units",
    dealStartDate: new Date().toISOString().slice(0,10),
    dealEndDate: ""
  };

  x.brand = x.brand || x.name || "";

  openModal(
    x.id ? "Edit Product" : "Add Product",
    `
      <div class="product-form-grid">
        <label>Brand Name
          <input
            name="brand"
            required
            placeholder="e.g. Nike"
            value="${esc(x.brand)}"
          >
        </label>

        <label>Product Type
          <input
            name="productType"
            required
            placeholder="e.g. Shoes"
            value="${esc(x.productType)}"
          >
        </label>

        <label class="wide">Description
          <textarea name="description" rows="2">${esc(x.description || "")}</textarea>
        </label>

        <label>Price (₹)
          <input
            name="price"
            inputmode="decimal"
            value="${esc(x.price || "")}"
          >
        </label>

        <label>Platform
          <select name="platform">
            ${["Amazon", "Flipkart", "Nykaa", "Myntra", "Other"]
              .map(v => `<option ${x.platform === v ? "selected" : ""}>${v}</option>`)
              .join("")}
          </select>
        </label>

        <label>Allotted Quantity
          <input
            name="allottedQty"
            type="number"
            min="0"
            step="any"
            required
            value="${esc(x.allottedQty ?? 0)}"
          >
        </label>

        <label>Quantity Unit
          <input
            name="quantityUnit"
            placeholder="units, pieces, packs"
            value="${esc(x.quantityUnit || "units")}"
          >
        </label>

        <label>Deal Start Date
          <input name="dealStartDate" type="date" value="${esc(x.dealStartDate || "")}">
        </label>
        <label>Deal End Date
          <input name="dealEndDate" type="date" value="${esc(x.dealEndDate || "")}">
        </label>
        <label class="wide">Product Link
          <input
            name="link"
            type="url"
            required
            placeholder="https://..."
            value="${esc(x.link || "")}" 
          >
        </label>
      </div>

      <p class="hint">
        Each share record allocates one unit.
        Product Ordered is tracked separately.
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
        quantityUnit: f.get("quantityUnit").trim() || "units",
        dealStartDate: f.get("dealStartDate") || "",
        dealEndDate: f.get("dealEndDate") || "",
        createdAt: x.createdAt || new Date().toISOString()
      };
      if (obj.dealStartDate && obj.dealEndDate && obj.dealEndDate < obj.dealStartDate) {
        alert("Deal end date cannot be before the start date.");
        return;
      }

      const i = state.products.findIndex(p => p.id === obj.id);

      if (i >= 0) {
        state.products[i] = { ...state.products[i], ...obj };
      } else {
        state.products.unshift(obj); // newest products appear first
      }
    }
  );
}

$("addContact").onclick = () => addContact();
$("addProduct").onclick = () => addProduct();

function bindItemActions(type) {
  const container = type === "contacts" ? $("contactsList") : $("productsList");
  if (!container) return;
  container.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      const list = type === "contacts" ? state.contacts : state.products;
      const record = list.find(x => String(x.id) === String(button.dataset.edit));
      if (record) (type === "contacts" ? addContact : addProduct)(record);
    };
  });
  container.querySelectorAll("[data-delete]").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.delete;
      if (type === "contacts") {
        const contact = state.contacts.find(x => String(x.id) === String(id));
        if (!contact || !confirm(`Delete contact “${contact.name}”? Existing history will be retained.`)) return;
        state.contacts = state.contacts.filter(x => String(x.id) !== String(id));
        selectedContacts.delete(String(id));
      } else {
        const product = state.products.find(x => String(x.id) === String(id));
        if (!product || !confirm(`Delete product “${product.name || product.brand}”? Its old share records remain in History, but will be excluded from current reports.`)) return;
        state.products = state.products.filter(x => String(x.id) !== String(id));
        selectedProducts.delete(String(id));
      }
      save();
      renderContacts(); renderProducts(); renderSendLists(); renderHistory(); renderTracking();
    };
  });
}

function renderContacts() {
  const q = $("contactSearch").value.toLowerCase();

  const a = state.contacts.filter(x =>
    (x.name + " " + x.phone + " " + x.category)
      .toLowerCase()
      .includes(q)
  );

  $("contactsList").innerHTML = a.length
    ? a.map(x => `
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
    `).join("")
    : '<div class="empty">No contacts yet. Add one or import a CSV.</div>';

  bindItemActions("contacts");
}


let productDealFilter = "active";

function ensureProductDealFilter() {
  if (document.getElementById("productDealFilter")) return;

  const search = $("productSearch");
  if (!search || !search.parentNode) return;

  const panel = document.createElement("div");
  panel.id = "productDealFilter";
  panel.className = "card";
  panel.style.margin = "12px 0";

  panel.innerHTML = `
    <h3 style="margin-top:0">Deal Status</h3>

    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <label>
        <input type="radio"
          name="productDealStatus"
          value="active" checked>
        Active Deals
      </label>

      <label>
        <input type="radio"
          name="productDealStatus"
          value="closed">
        Closed Deals
      </label>

      <label>
        <input type="radio"
          name="productDealStatus"
          value="all">
        All Deals
      </label>
    </div>
  `;

  search.insertAdjacentElement("afterend", panel);
  const overview = document.createElement("div");
  overview.id = "productDealOverview";
  overview.className = "card deal-overview";
  panel.insertAdjacentElement("afterend", overview);

  panel.querySelectorAll(
    'input[name="productDealStatus"]'
  ).forEach(radio => {
    radio.addEventListener("change", () => {
      productDealFilter = radio.value;
      renderProducts();
    });
  });
}

function renderProducts() {
  ensureProductDealFilter();

  const q = $("productSearch").value.toLowerCase();

  const products = [...state.products].sort((a,b) => {
    const ad = String(a.createdAt || a.dealStartDate || "");
    const bd = String(b.createdAt || b.dealStartDate || "");
    return bd.localeCompare(ad);
  }).filter(product => {
    const text = (
      product.name + " " +
      product.brand + " " +
      product.productType + " " +
      product.platform + " " +
      product.link
    ).toLowerCase();

    const matchesSearch = text.includes(q);
    const status = product.dealStatus === "closed"
      ? "closed"
      : "active";

    const matchesStatus =
      productDealFilter === "all" ||
      productDealFilter === status;

    return matchesSearch && matchesStatus;
  });

  $("productsList").innerHTML = products.length
    ? products.map(product => {
        const t = productTotals(product.id);
        const closed = product.dealStatus === "closed";

        return `
          <div class="item">
            <div>
              <h3>${esc(product.name)}</h3>

              <p>
                <b>${esc(product.brand || "No brand")}</b>
                · ${esc(product.productType || "No type")}
              </p>

              <p>
                ${esc(product.platform)}
                ${product.price
                  ? " · ₹" + esc(product.price)
                  : ""}
              </p>

              <p><a href="${esc(product.link)}" target="_blank" rel="noopener">${esc(product.link)}</a></p>
              <p><b>Deal dates:</b> ${esc(product.dealStartDate || "Not set")} → ${esc(product.dealEndDate || "No end date")}</p>

              <p>
                <b>Allotted:</b>
                ${formatQuantity(t.allotted)} ${esc(t.unit)}
                · <b>Shared:</b> ${t.shared}
                · <b>Ordered:</b> ${t.ordered}
              </p>

              <p>
                <b>Pending Allotted:</b>
                ${formatQuantity(t.pendingAllotted)}
                · <b>Pending Ordered:</b>
                ${t.pendingOrdered}
                · <b>Available:</b>
                ${formatQuantity(t.available)} ${esc(t.unit)}
              </p>

              ${t.shortage
                ? `<p class="hint">
                    Over-allocated by
                    ${formatQuantity(t.shortage)} unit(s).
                  </p>`
                : ""}

              <p>
                <b>Status:</b>
                ${closed ? "Closed Deal" : "Active Deal"}
              </p>
            </div>

            <div class="actions">
              <button class="mini"
                data-edit="${product.id}">Edit</button>

              <button class="mini"
                data-delete="${product.id}">Delete</button>

              <button class="mini"
                data-deal-status="${product.id}"
                data-next-status="${closed ? "active" : "closed"}">
                ${closed ? "Reopen Deal" : "Close Deal"}
              </button>
            </div>
          </div>
        `;
      }).join("")
    : state.products.length
      ? '<div class="empty">No products match this status and search.</div>'
      : '<div class="empty">No products yet. Add one or import a CSV.</div>';

  bindItemActions("products");
  const overview = $("productDealOverview");
  if (overview) {
    const active = state.products.filter(p => p.dealStatus !== "closed").length;
    const closedCount = state.products.filter(p => p.dealStatus === "closed").length;
    const ordered = state.products.reduce((n,p) => n + productTotals(p.id).ordered, 0);
    const pending = state.products.reduce((n,p) => n + productTotals(p.id).pendingOrdered, 0);
    const shares = state.shares.filter(s => state.products.some(p => String(p.id) === String(s.productId))).length;
    overview.innerHTML = `<h3>Deal Overview</h3><div class="deal-overview-grid"><div><b>${active}</b><span>Active deals</span></div><div><b>${closedCount}</b><span>Closed deals</span></div><div><b>${shares}</b><span>Share attempts</span></div><div><b>${ordered}</b><span>Products ordered</span></div><div><b>${pending}</b><span>Pending orders</span></div></div>`;
  }

  document.querySelectorAll("[data-deal-status]")
    .forEach(button => {
      button.onclick = () => {
        const product = state.products.find(
          p => String(p.id) === button.dataset.dealStatus
        );

        if (!product) return;

        const nextStatus = button.dataset.nextStatus;

        const message = nextStatus === "closed"
          ? "Mark this deal as Closed? It will be hidden from Active Deals."
          : "Reopen this deal as Active?";

        if (!confirm(message)) return;

        product.dealStatus = nextStatus;
        save();
        renderProducts();
        renderInventoryOverview();
        if (typeof renderAnalyticsDashboard === "function") renderAnalyticsDashboard();
      };
    });
}


$("contactSearch").oninput = renderContacts;
$("productSearch").oninput = renderProducts;
$("historySearch").oninput = renderHistory;

/* =========================
   TRACKING STYLES
========================= */

const quantityStyle = document.createElement("style");

quantityStyle.textContent = `
  .tracking-filter-search {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    margin: 0 0 8px;
    padding: 10px 12px;
    border: 1px solid var(--border, #d0d5dd);
    border-radius: 8px;
    font: inherit;
    background: var(--surface, #fff);
    color: inherit;
  }

  .tracking-filter-options {
    max-height: 240px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .filter-option[hidden] {
    display: none !important;
  }

  .tracking-filter-no-results {
    margin: 8px 0;
    color: var(--muted);
    font-size: 13px;
  }

  .recipient-count-total {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0 2px;
    margin-top: 8px;
    border-top: 2px solid var(--border, #dedede);
    font-weight: 800;
  }
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

  .status-table-wrap {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .status-table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
    font-size: 13px;
  }

  .status-table th,
  .status-table td {
    padding: 11px 8px;
    border-bottom: 1px solid #dedede;
  }

  .status-table th {
    text-align: right;
    white-space: nowrap;
  }

  .status-table th:first-child,
  .status-table td:first-child {
    text-align: left;
    min-width: 150px;
  }

  .status-table td {
    text-align: right;
  }

  .status-table tfoot {
    font-weight: 800;
  }

  .status-table tfoot td {
    border-top: 2px solid #999;
  }

  .status-table .over-allocation {
    display: block;
    color: #b42318;
    font-size: 11px;
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

  // Existing products without a status are considered active.
  // Only explicitly closed deals are hidden from the Send selector.
  const activeProducts = state.products.filter(
    p => p.dealStatus !== "closed"
  );

  const activeProductIds = new Set(
    activeProducts.map(p => String(p.id))
  );

  selectedProducts = new Set(
    [...selectedProducts].map(String).filter(id => activeProductIds.has(id))
  );

  // A contact-product pair is considered already shared if it exists in history.
  const previouslyShared = new Set(
    state.shares
      .filter(s => s.contactId != null && s.productId != null)
      .map(s => String(s.contactId) + "::" + String(s.productId))
  );

  // When products have been selected, only show contacts eligible for
  // at least one selected product. With no selected products, show all contacts.
  const selectedProductIds = [...selectedProducts];
  const eligibleContacts = state.contacts.filter(c => {
    if (!selectedProductIds.length) return true;

    return selectedProductIds.some(productId =>
      !previouslyShared.has(String(c.id) + "::" + String(productId))
    );
  });

  const eligibleContactIds = new Set(
    eligibleContacts.map(c => String(c.id))
  );

  // Deselect contacts who are no longer eligible after product selection changes.
  selectedContacts = new Set(
    [...selectedContacts].map(String).filter(id => eligibleContactIds.has(id))
  );

  $("sendProducts").innerHTML = activeProducts
    .filter(p =>
      (p.name + " " + p.brand + " " + p.productType)
        .toLowerCase()
        .includes(pq)
    )
    .map(p => {
      const t = productTotals(p.id);

      return `
        <label class="checkrow">
          <input
            type="checkbox"
            data-product="${p.id}"
            ${selectedProducts.has(String(p.id)) ? "checked" : ""}
          >
          <span>
            ${esc(p.name)}
            <small>
              ${esc(p.brand)} · ${esc(p.productType)} · ${esc(p.platform)}
              · Available: ${formatQuantity(t.available)}
            </small>
          </span>
        </label>
      `;
    }).join("") || '<div class="report-empty">No active deals found.</div>';

  $("sendContacts").innerHTML = eligibleContacts
    .filter(c => (c.name + " " + c.phone).toLowerCase().includes(cq))
    .map(c => `
      <label class="checkrow">
        <input
          type="checkbox"
          data-contact="${c.id}"
          ${selectedContacts.has(String(c.id)) ? "checked" : ""}
        >
        <span>
          ${esc(c.name)}
          <small>${esc(c.phone)}</small>
        </span>
      </label>
    `).join("") || '<div class="report-empty">No eligible contacts found.</div>';

  document.querySelectorAll("#sendContacts [data-contact]").forEach(input => {
    input.onchange = () => {
      const id = String(input.dataset.contact);

      if (input.checked) selectedContacts.add(id);
      else selectedContacts.delete(id);

      rebuildBatchFromSelections();
    };
  });

  document.querySelectorAll("#sendProducts [data-product]").forEach(input => {
    input.onchange = () => {
      const id = String(input.dataset.product);

      if (input.checked) selectedProducts.add(id);
      else selectedProducts.delete(id);

      rebuildBatchFromSelections();
    };
  });

  updateBatchUI();
}

function rebuildBatchFromSelections() {
  batch = [];

  const previouslyShared = new Set(
    state.shares
      .filter(s => s.contactId != null && s.productId != null)
      .map(s => String(s.contactId) + "::" + String(s.productId))
  );

  const activeProductIds = new Set(
    state.products
      .filter(p => p.dealStatus !== "closed")
      .map(p => String(p.id))
  );

  selectedContacts.forEach(contactId => {
    selectedProducts.forEach(productId => {
      const pairKey = String(contactId) + "::" + String(productId);

      if (
        activeProductIds.has(String(productId)) &&
        !previouslyShared.has(pairKey)
      ) {
        batch.push({
          contactId: String(contactId),
          productId: String(productId)
        });
      }
    });
  });

  batchIndex = 0;
  renderSendLists();
  updateBatchUI();
}

$("allContacts").onclick = () => {
  if (!selectedProducts.size) {
    selectedContacts = new Set();
    rebuildBatchFromSelections();
    alert("Please select one or more active products first.");
    return;
  }

  const previouslyShared = new Set(
    state.shares
      .filter(s => s.contactId != null && s.productId != null)
      .map(s => String(s.contactId) + "::" + String(s.productId))
  );

  selectedContacts = new Set(
    state.contacts
      .filter(c => [...selectedProducts].some(productId =>
        !previouslyShared.has(String(c.id) + "::" + String(productId))
      ))
      .map(c => String(c.id))
  );

  rebuildBatchFromSelections();
};

$("clearContacts").onclick = () => {
  selectedContacts = new Set();
  rebuildBatchFromSelections();
};

$("allProducts").onclick = () => {
  selectedProducts = new Set(
    state.products
      .filter(p => p.dealStatus !== "closed")
      .map(p => String(p.id))
  );

  rebuildBatchFromSelections();
};

$("clearProducts").onclick = () => {
  selectedProducts = new Set();
  selectedContacts = new Set();
  rebuildBatchFromSelections();
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
    const c = state.contacts.find(
      x => String(x.id) === String(cur.contactId)
    );

    const p = state.products.find(
      x => String(x.id) === String(cur.productId)
    );

    $("message").value = c && p ? makeMessage(c, p) : "";

    if (p) {
      const t = productTotals(p.id);

      $("batchInfo").textContent +=
        ` Stock: ${formatQuantity(t.available)} ${t.unit} available for ${p.name}.`;
    }
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

  const c = state.contacts.find(
    x => String(x.id) === String(item.contactId)
  );

  const p = state.products.find(
    x => String(x.id) === String(item.productId)
  );

  if (!c || !p) {
    return alert("Please refresh your selection.");
  }

  const phone = c.phone.replace(/\D/g, "");

  if (phone.length < 10) {
    return alert("Please use a valid WhatsApp number including country code.");
  }

  const stock = productTotals(p.id);

  if (stock.available < 1) {
    alert(
      `No available stock for "${p.name}".\n` +
      `Allotted: ${stock.allotted} ${stock.unit}\n` +
      `Already shared: ${stock.shared}\n\n` +
      "This share was not recorded. Increase the allotment or choose another product."
    );

    batchIndex++;
    updateBatchUI();
    return;
  }

  const msg = $("message").value.trim() || makeMessage(c, p);

  state.shares.push({
    id: uid(),
    contactId: c.id,
    contactName: c.name,
    phone,
    productId: p.id,
    productName: p.name,
    brand: p.brand,
    productType: p.productType,
    platform: p.platform,
    priceSnapshot: Math.max(0, Number(p.price) || 0),
    time: Date.now(),
    message: msg,
    status: "WhatsApp opened; send not confirmed",
    ordered: false,
    orderedAt: ""
  });

  save();

  batchIndex++;
  updateBatchUI();
  renderTracking();
  renderHistory();

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
  const query = ($("historySearch")?.value || "").trim().toLowerCase();

  const records = [...state.shares]
    .filter(x => {
      const searchable = [
        x.contactName, x.phone, x.productName, x.brand,
        x.productType, x.status
      ].join(" ").toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => Number(b.time || 0) - Number(a.time || 0));

  $("historyList").innerHTML = records.length
    ? records.map(x => `
      <div class="item">
        <div>
          <h3>${esc(x.contactName)} · ${esc(x.productName)}</h3>
          <p>${esc(x.brand)} · ${esc(x.productType)}</p>
          <p>${x.time ? new Date(x.time).toLocaleString() : ""}</p>
          <p>${esc(x.phone)} · ${esc(x.status || "Share initiated")}</p>
          <p><b>Product Ordered:</b> ${x.ordered ? "Yes" : "No"}</p>
        </div>

        <button
          onclick="deleteShare('${esc(x.id)}')"
          class="delete-history"
        >🗑️ Delete</button>
      </div>
    `).join("")
    : `<div class="empty">${query ? "No history matches your search." : "No share attempts recorded yet."}</div>`;
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
    ? entries.map(([k, v]) => `
        <div class="report-row">
          <span>${esc(k)}</span>
          <strong>${v}</strong>
        </div>
      `).join("")
    : '<div class="report-empty">No records for this selection.</div>';
}

function deleteShare(shareId) {
  if (!confirm("Delete this history record and its tracking record?")) {
    return;
  }

  state.shares = state.shares.filter(
    x => String(x.id) !== String(shareId)
  );

  save();
  renderHistory();
  renderTracking();
}

/* =========================
   ORDER STATUS
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
  renderHistory();
}

/* =========================
   BRAND / PRODUCT TYPE STATUS TABLES
========================= */

function renderStatusTable(
  elementId,
  dimension,
  filteredShares,
  selectedBrands,
  selectedTypes
) {
  const groups = new Map();

  // Aggregate allotment from products, respecting brand/type filters.
  state.products.forEach(product => {
    const brand = String(
      product.brand || product.name || "Unspecified"
    ).trim() || "Unspecified";

    const type = String(
      product.productType || "Unspecified"
    ).trim() || "Unspecified";

    if (selectedBrands.length && !selectedBrands.includes(brand)) return;
    if (selectedTypes.length && !selectedTypes.includes(type)) return;

    const label = dimension === "brand" ? brand : type;

    if (!groups.has(label)) {
      groups.set(label, {
        allotted: 0,
        shared: 0,
        ordered: 0
      });
    }

    groups.get(label).allotted += quantity(product.allottedQty);
  });

  // Aggregate share and order counts using active share filters.
  filteredShares.forEach(share => {
    const label = String(
      dimension === "brand"
        ? (share.brand || share.productName || "Unspecified")
        : (share.productType || "Unspecified")
    ).trim() || "Unspecified";

    if (!groups.has(label)) {
      groups.set(label, {
        allotted: 0,
        shared: 0,
        ordered: 0
      });
    }

    const row = groups.get(label);
    row.shared += 1;

    if (share.ordered) {
      row.ordered += 1;
    }
  });

  const rows = [...groups.entries()]
    .map(([label, values]) => ({
      label,
      ...values,
      pendingAllotted: Math.max(
        0,
        values.allotted - values.shared
      ),
      pendingOrdered: Math.max(
        0,
        values.shared - values.ordered
      ),
      overAllocated: Math.max(
        0,
        values.shared - values.allotted
      )
    }))
    .sort((a, b) =>
      b.shared - a.shared ||
      a.label.localeCompare(b.label)
    );

  const totals = rows.reduce((sum, row) => {
    sum.allotted += row.allotted;
    sum.shared += row.shared;
    sum.ordered += row.ordered;
    sum.pendingAllotted += row.pendingAllotted;
    sum.pendingOrdered += row.pendingOrdered;
    sum.overAllocated += row.overAllocated;

    return sum;
  }, {
    allotted: 0,
    shared: 0,
    ordered: 0,
    pendingAllotted: 0,
    pendingOrdered: 0,
    overAllocated: 0
  });

  const fmt = formatQuantity;
  const table = $(elementId);

  if (!table) return;

  const dimensionLabel = dimension === "brand"
    ? "Brand"
    : "Product Type";

  table.innerHTML = `
    <div class="status-table-wrap">
      <table class="status-table">
        <thead>
          <tr>
            <th>${dimensionLabel}</th>
            <th>Allotted</th>
            <th>Shared</th>
            <th>Ordered</th>
            <th>Pending Allotted</th>
            <th>Pending Ordered</th>
          </tr>
        </thead>

        <tbody>
          ${rows.length
            ? rows.map(row => `
              <tr>
                <td>
                  ${esc(row.label)}
                  ${row.overAllocated
                    ? `<small class="over-allocation">Over-allocated by ${fmt(row.overAllocated)}</small>`
                    : ""}
                </td>
                <td>${fmt(row.allotted)}</td>
                <td>${fmt(row.shared)}</td>
                <td>${fmt(row.ordered)}</td>
                <td>${fmt(row.pendingAllotted)}</td>
                <td>${fmt(row.pendingOrdered)}</td>
              </tr>
            `).join("")
            : `
              <tr>
                <td colspan="6">No records available.</td>
              </tr>
            `
          }
        </tbody>

        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td>${fmt(totals.allotted)}</td>
            <td>${fmt(totals.shared)}</td>
            <td>${fmt(totals.ordered)}</td>
            <td>${fmt(totals.pendingAllotted)}</td>
            <td>${fmt(totals.pendingOrdered)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <p class="hint">
      Shared = saved share records.
      Pending Allotted = Allotted − Shared.
      Pending Ordered = Shared − Ordered.
      Over-allocation is shown separately where applicable.
    </p>
  `;
}

/* =========================
   TRACKING DASHBOARD
========================= */

const trackingFilterSearch = {
  filterBrand: "",
  filterType: "",
  filterRecipient: ""
};

function renderTracking() {
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
  )].sort();

  const getSelectedValues = id => {
    const container = $(id);
    if (!container) return [];

    return [...container.querySelectorAll(
      'input[type="checkbox"]:checked'
    )].map(input => input.value);
  };

  const setOptions = (id, values, selectedValues) => {
    const container = $(id);
    if (!container) return;

    const searchText = trackingFilterSearch[id] || "";
    const label = id === "filterBrand"
      ? "brands"
      : id === "filterType"
        ? "product types"
        : "recipients";

    if (!values.length) {
      container.innerHTML =
        '<p class="hint">No options available.</p>';
      return;
    }

    container.innerHTML = `
      <input
        type="search"
        class="tracking-filter-search"
        data-filter-search="${id}"
        placeholder="Search ${label}..."
        aria-label="Search ${label}"
        value="${esc(searchText)}"
        autocomplete="off"
      >

      <div class="tracking-filter-options">
        ${values.map(value => `
          <label
            class="filter-option"
            data-filter-label="${esc(value.toLowerCase())}"
          >
            <input
              type="checkbox"
              value="${esc(value)}"
              ${selectedValues.includes(value) ? "checked" : ""}
            >
            <span>${esc(value)}</span>
          </label>
        `).join("")}
      </div>

      <p class="tracking-filter-no-results" hidden>
        No matching options.
      </p>
    `;

    const searchInput = container.querySelector(
      "[data-filter-search]"
    );

    const options = [
      ...container.querySelectorAll(".filter-option")
    ];

    const noResults = container.querySelector(
      ".tracking-filter-no-results"
    );

    const applySearch = () => {
      const query = searchInput.value.trim().toLowerCase();
      trackingFilterSearch[id] = searchInput.value;

      let visibleCount = 0;

      options.forEach(option => {
        const matches =
          option.dataset.filterLabel.includes(query);

        option.hidden = !matches;

        if (matches) visibleCount++;
      });

      noResults.hidden = visibleCount > 0;
    };

    searchInput.addEventListener("input", applySearch);
    applySearch();
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

  updateSummary(
    "brandFilterSummary",
    oldBrands,
    "All Brands"
  );

  updateSummary(
    "typeFilterSummary",
    oldTypes,
    "All Product Types"
  );

  updateSummary(
    "recipientFilterSummary",
    oldRecipients,
    "All Recipients"
  );

  $("trackTotal").textContent = reportShares.length;
  $("trackBrands").textContent = brands.length;
  $("trackTypes").textContent = types.length;
  $("trackRecipients").textContent = recipients.length;

  const selectedBrands = getSelectedValues("filterBrand");
  const selectedTypes = getSelectedValues("filterType");
  const selectedRecipients = getSelectedValues("filterRecipient");

  const from = $("filterFrom").value
    ? new Date(
        $("filterFrom").value + "T00:00:00"
      ).getTime()
    : 0;

  const to = $("filterTo").value
    ? new Date(
        $("filterTo").value + "T23:59:59.999"
      ).getTime()
    : Infinity;

  const orderStatus = $("filterOrderStatus").value;

  const a = reportShares.filter(x =>
    (!selectedBrands.length ||
      selectedBrands.includes(x.brand)) &&
    (!selectedTypes.length ||
      selectedTypes.includes(x.productType)) &&
    (!selectedRecipients.length ||
      selectedRecipients.includes(x.contactName)) &&
    Number(x.time || 0) >= from &&
    Number(x.time || 0) <= to &&
    (
      orderStatus === "all" ||
      (orderStatus === "ordered" && !!x.ordered) ||
      (orderStatus === "pending" && !x.ordered)
    )
  );

  renderStatusTable(
    "brandCounts",
    "brand",
    a,
    selectedBrands,
    selectedTypes
  );

  renderStatusTable(
    "typeCounts",
    "type",
    a,
    selectedBrands,
    selectedTypes
  );

  reportRows(
    "comboCounts",
    countBy(a, x =>
      (x.brand || "Unspecified") + " + " +
      (x.productType || "Unspecified")
    )
  );

  reportRows(
    "recipientCounts",
    countBy(a, x => x.contactName)
  );

  // Add the total AFTER reportRows renders the recipient list.
  const recipientTotal = $("recipientCounts");

  if (recipientTotal) {
    const totalRow = document.createElement("div");
    totalRow.className = "recipient-count-total";

    const totalLabel = document.createElement("span");
    totalLabel.textContent = "Total Shares";

    const totalValue = document.createElement("strong");
    totalValue.textContent = String(a.length);

    totalRow.append(totalLabel, totalValue);
    recipientTotal.appendChild(totalRow);
  }

  const ordered = a.filter(x => x.ordered).length;
  const pending = a.length - ordered;

  $("trackingDetails").innerHTML = `
    <div class="card order-summary">
      <p>
        <b>Share attempts / allocated units:</b>
        ${a.length}
      </p>
      <p>
        <b>Contacts marked ordered:</b> ${ordered}
      </p>
      <p>
        <b>Not marked ordered:</b> ${pending}
      </p>
    </div>
  ` + (a.length
    ? [...a]
      .sort(
        (x, y) => Number(y.time || 0) - Number(x.time || 0)
      )
      .map(x => `
        <div class="detail-card">
          <h4>
            ${esc(x.contactName)} ←
            ${esc(x.brand || x.productName)}
          </h4>

          <p>
            <span class="badge">
              ${esc(x.brand || "No brand")}
            </span>
            <span class="badge">
              ${esc(x.productType || "No type")}
            </span>
          </p>

          <p>
            ${x.time ? new Date(x.time).toLocaleString() : ""}
            · ${esc(x.phone)}
          </p>

          <p>
            ${esc(
              x.status ||
              "Share initiated; delivery not confirmed"
            )}
          </p>

          <label class="ordered-toggle">
            <input
              type="checkbox"
              ${x.ordered ? "checked" : ""}
              onchange="toggleOrdered(
                '${esc(x.id)}',
                this.checked
              )"
            >
            Product Ordered
          </label>
        </div>
      `).join("")
    : '<div class="report-empty">No records match these filters.</div>');
}

["filterBrand", "filterType", "filterRecipient"].forEach(id => {
  $(id).addEventListener("change", renderTracking);
});

["filterFrom", "filterTo", "filterOrderStatus"].forEach(id => {
  $(id).addEventListener("change", renderTracking);
});

$("refreshTracking").onclick = renderTracking;

$("clearFilters").onclick = () => {
  ["filterBrand", "filterType", "filterRecipient"].forEach(id => {
    $(id)
      .querySelectorAll('input[type="checkbox"]')
      .forEach(input => {
        input.checked = false;
      });

    trackingFilterSearch[id] = "";
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
  const url = URL.createObjectURL(
    new Blob([content], { type })
  );

  a.href = url;
  a.download = name;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("exportTrackingCsv").onclick = () => {
  const headers = [
    "Date",
    "Recipient",
    "Phone",
    "Product",
    "Brand",
    "Product Type",
    "Platform",
    "Status",
    "Product Ordered",
    "Allocated Unit"
  ];

  const rows = state.shares.map(x => [
    x.time ? new Date(x.time).toISOString() : "",
    x.contactName,
    x.phone,
    x.productName,
    x.brand,
    x.productType,
    x.platform,
    x.status,
    !!x.ordered,
    "1"
  ]);

  const csv = [headers, ...rows]
    .map(r =>
      r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"')
        .join(",")
    )
    .join("\r\n");

  download(
    "deal-dhamaka-tracking.csv",
    csv,
    "text/csv;charset=utf-8"
  );
};

$("exportData").onclick = () => {
  const cleanState = {
    contacts: state.contacts,
    products: state.products,
    shares: state.shares.map(s => {
      const record = { ...s };
      delete record.fulfilled;
      delete record.fulfilledAt;
      return record;
    })
  };

  download(
    "deal-dhamaka-backup.json",
    JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      ...cleanState
    }, null, 2),
    "application/json"
  );
};

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

    state.products = state.products.map(p => ({
      ...p,
      allottedQty: quantity(p.allottedQty),
      quantityUnit: p.quantityUnit || "units"
    }));

    state.shares = state.shares.map(s => {
      const record = { ...s };
      delete record.fulfilled;
      delete record.fulfilledAt;

      return {
        ...record,
        ordered: !!record.ordered,
        orderedAt: record.orderedAt || ""
      };
    });

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

    if (rows.length < 2) {
      throw new Error("No data rows");
    }

    const h = rows.shift().map(x => x.trim().toLowerCase());
    let added = 0;

    for (const r of rows) {
      const o = {};

      h.forEach((k, i) => {
        o[k] = (r[i] || "").trim();
      });

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
            productType:
              o["product type"] || o.producttype || o.type || "",
            description: o.description || "",
            price: o.price || "",
            platform: o.platform || "Other",
            link,
            allottedQty: quantity(
              o["allotted quantity"] || o.allottedqty || 0
            ),
            quantityUnit:
              o["quantity unit"] || o.quantityunit || "units",
            dealStartDate: o["deal start date"] || o.dealstartdate || new Date().toISOString().slice(0,10),
            dealEndDate: o["deal end date"] || o.dealenddate || ""
          });

          const imported = state.products.pop();
          state.products.unshift(imported);
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
$("contactsCsv").onchange = e =>
  importCSV(e.target.files[0], "contacts");

$("importCsvProducts").onclick = () => $("productsCsv").click();
$("productsCsv").onchange = e =>
  importCSV(e.target.files[0], "products");

/* =========================
   DATA RESET
========================= */

$("resetData").onclick = () => {
  if (confirm(
    "Delete all contacts, products and share history from this browser? This cannot be undone."
  )) {
    state = {
      contacts: [],
      products: [],
      shares: []
    };

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
