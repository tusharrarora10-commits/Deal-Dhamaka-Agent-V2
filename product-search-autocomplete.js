/* Product search autocomplete — Deal Dhamaka Agent V2
   Shows matching saved products in an accessible, high-contrast dropdown while typing.
   Selection uses the existing search/filter pipeline; no product data is changed. */
(() => {
  "use strict";
  const input = document.getElementById("productSearch");
  const list = document.getElementById("productsList");
  if (!input || !list || typeof state === "undefined" || !Array.isArray(state.products)) return;

  let activeIndex = -1;
  let matches = [];
  const dropdown = document.createElement("div");
  dropdown.id = "productSearchSuggestions";
  dropdown.className = "product-search-suggestions";
  dropdown.setAttribute("role", "listbox");
  dropdown.setAttribute("aria-label", "Matching products");
  dropdown.hidden = true;
  document.body.appendChild(dropdown);

  const safe = value => String(value ?? "").replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));
  const productText = p => [p.name, p.brand, p.productType, p.platform].filter(Boolean).join(" ").toLowerCase();

  function placeDropdown() {
    const rect = input.getBoundingClientRect();
    const vv = window.visualViewport;
    const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const available = Math.max(90, viewportBottom - rect.bottom - 18);
    dropdown.style.left = `${Math.max(8, rect.left)}px`;
    dropdown.style.width = `${Math.min(rect.width, window.innerWidth - Math.max(8, rect.left) - 8)}px`;
    dropdown.style.top = `${Math.max(8, rect.bottom + 5)}px`;
    dropdown.style.maxHeight = `${Math.min(300, available)}px`;
  }

  function hide() {
    dropdown.hidden = true;
    input.removeAttribute("aria-activedescendant");
    activeIndex = -1;
  }

  function choose(product) {
    if (!product) return;
    input.value = product.name || "";
    // Ensure closed deals can also be found through autocomplete selection.
    const allDeals = document.querySelector('input[name="productDealStatus"][value="all"]');
    if (allDeals && !allDeals.checked) {
      allDeals.checked = true;
      allDeals.dispatchEvent(new Event("change", { bubbles: true }));
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    hide();
    input.blur();
    requestAnimationFrame(() => {
      const cards = [...list.querySelectorAll(".item")];
      const target = cards.find(card => card.querySelector("h3")?.textContent?.trim() === product.name);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    const products = typeof state !== "undefined" && Array.isArray(state.products) ? state.products : [];
    matches = products
      .filter(p => !q || productText(p).includes(q))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" }))
      .slice(0, 8);
    activeIndex = -1;

    if (!matches.length) {
      dropdown.innerHTML = `<div class="product-suggest-empty">No matching products found</div>`;
    } else {
      dropdown.innerHTML = matches.map((p, i) => `
        <button type="button" class="product-suggest-option" role="option" aria-selected="false" id="product-suggest-${i}" data-index="${i}">
          <span class="product-suggest-name">${safe(p.name || "Untitled product")}</span>
          <span class="product-suggest-meta">${safe(p.brand || "No brand")}${p.productType ? ` · ${safe(p.productType)}` : ""}${p.dealStatus === "closed" ? " · Closed" : " · Active"}</span>
        </button>`).join("");
    }
    placeDropdown();
    dropdown.hidden = false;
  }

  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", dropdown.id);
  input.addEventListener("focus", render);
  input.addEventListener("input", render);
  input.addEventListener("keydown", event => {
    if (dropdown.hidden) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, matches.length - 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      choose(matches[activeIndex]);
      return;
    } else if (event.key === "Escape") {
      hide();
      return;
    } else {
      return;
    }
    dropdown.querySelectorAll(".product-suggest-option").forEach((option, i) => {
      option.setAttribute("aria-selected", String(i === activeIndex));
    });
    const active = dropdown.querySelector(`#product-suggest-${activeIndex}`);
    if (active) {
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }
  });

  dropdown.addEventListener("pointerdown", event => {
    const option = event.target.closest(".product-suggest-option");
    if (!option) return;
    event.preventDefault(); // Keep the iOS keyboard stable until selection is applied.
    choose(matches[Number(option.dataset.index)]);
  });
  document.addEventListener("pointerdown", event => {
    if (event.target !== input && !dropdown.contains(event.target)) hide();
  });
  window.addEventListener("resize", () => { if (!dropdown.hidden) placeDropdown(); });
  window.addEventListener("scroll", () => { if (!dropdown.hidden) placeDropdown(); }, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => { if (!dropdown.hidden) placeDropdown(); });
    window.visualViewport.addEventListener("scroll", () => { if (!dropdown.hidden) placeDropdown(); });
  }
})();
