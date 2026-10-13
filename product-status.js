
/* Deal Dhamaka Agent V2 — Active/Closed Deal Filter
   Add as product-status.js and load AFTER app.js in index.html.
*/

(() => {
  "use strict";

  let dealFilter = "active";
  let originalRenderProducts;

  function saveStatus(productId, nextStatus) {
    const product = state.products.find(
      p => String(p.id) === String(productId)
    );

    if (!product) return;

    product.dealStatus = nextStatus;

    // Save using the app's existing storage function.
    save();

    renderWithFilter();
  }

  function ensureFilterControls() {
    const section = document.getElementById("products");

    if (!section || document.getElementById("dealStatusFilter")) {
      return;
    }

    const search = document.getElementById("productSearch");

    const wrap = document.createElement("div");
    wrap.id = "dealStatusFilter";
    wrap.className = "card";
    wrap.style.margin = "12px 0";

    wrap.innerHTML = `
      <strong style="display:block;margin-bottom:10px">
        Deal Status
      </strong>

      <div
        role="radiogroup"
        aria-label="Filter deals by status"
        style="display:flex;gap:14px;flex-wrap:wrap"
      >
        <label style="display:flex;align-items:center;gap:6px">
          <input
            type="radio"
            name="dealStatusFilter"
            value="active"
            checked
          >
          Active Deals
        </label>

        <label style="display:flex;align-items:center;gap:6px">
          <input
            type="radio"
            name="dealStatusFilter"
            value="closed"
          >
          Closed Deals
        </label>

        <label style="display:flex;align-items:center;gap:6px">
          <input
            type="radio"
            name="dealStatusFilter"
            value="all"
          >
          All Deals
        </label>
      </div>

      <p class="hint" style="margin-bottom:0">
        Existing and new deals default to Active until marked Closed.
      </p>
    `;

    if (search && search.parentNode) {
      search.insertAdjacentElement("afterend", wrap);
    } else {
      section.insertBefore(wrap, section.children[1] || null);
    }

    wrap
      .querySelectorAll('input[name="dealStatusFilter"]')
      .forEach(radio => {
        radio.addEventListener("change", () => {
          dealFilter = radio.value;
          renderWithFilter();
        });
      });
  }

  function renderWithFilter() {
    if (
      !Array.isArray(state.products) ||
      !originalRenderProducts
    ) {
      return;
    }

    const allProducts = state.products;

    const visibleProducts = allProducts.filter(product => {
      const status = product.dealStatus || "active";

      return (
        dealFilter === "all" ||
        status === dealFilter
      );
    });

    // Temporarily filter only the displayed products.
    // Restore the complete product array immediately afterwards.
    state.products = visibleProducts;

    try {
      originalRenderProducts();
    } finally {
      state.products = allProducts;
    }

    const list = document.getElementById("productsList");

    if (!list) return;

    list.querySelectorAll(".item").forEach(card => {
      const editButton = card.querySelector("[data-edit]");

      const productId =
        editButton && editButton.dataset.edit;

      if (!productId) return;

      const product = allProducts.find(
        p => String(p.id) === String(productId)
      );

      if (!product) return;

      const status = product.dealStatus || "active";
      const actions = card.querySelector(".actions");

      if (!actions) return;

      // Display the current status.
      const badge = document.createElement("div");
      badge.style.margin = "0 0 8px";
      badge.style.fontWeight = "700";
      badge.textContent =
        status === "closed"
          ? "Closed Deal"
          : "Active Deal";

      // Close or reopen the deal.
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "mini";

      toggle.textContent =
        status === "closed"
          ? "Reopen Deal"
          : "Close Deal";

      toggle.addEventListener("click", () => {
        const nextStatus =
          status === "closed"
            ? "active"
            : "closed";

        const message =
          nextStatus === "closed"
            ? "Mark this deal as Closed? It will disappear from Active Deals."
            : "Reopen this deal as Active?";

        if (confirm(message)) {
          saveStatus(productId, nextStatus);
        }
      });

      actions.insertAdjacentElement("afterbegin", badge);
      actions.appendChild(toggle);
    });
  }

  function init() {
    if (
      typeof state === "undefined" ||
      !Array.isArray(state.products)
    ) {
      return;
    }

    // Preserve all existing product fields.
    // Products without a status are treated as Active.
    state.products.forEach(product => {
      if (
        product.dealStatus !== "closed" &&
        product.dealStatus !== "active"
      ) {
        product.dealStatus = "active";
      }
    });

    save();

    originalRenderProducts = renderProducts;

    // Use the existing renderer with the selected filter.
    window.renderProducts = renderWithFilter;

    ensureFilterControls();
    renderWithFilter();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
