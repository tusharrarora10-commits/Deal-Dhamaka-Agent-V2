
/* Deal Dhamaka V2: WhatsApp templates + duplicate-share warnings.
   Load after app.js. Keeps existing app data and workflow intact. */
(() => {
  "use strict";

  const MAIN_KEY = "dealDhamakaAgentV2";
  const TEMPLATE_KEY = "dealDhamakaWhatsAppTemplatesV1";
  const $ = id => document.getElementById(id);

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])
  );

  const defaults = [
    {
      id: "free-deal",
      name: "Free Deal",
      message: `🥳 Something FREE is waiting for you! 🎁

Hi {{contactName}} 👋

🛍️ {{brand}}
✨ {{description}}

👇 Your deal link:
🔗 {{link}}

🛒 Place your order and enjoy your deal! 😍

💥 Deal Dhamaka — Happy Shopping! 🎉`
    },
    {
      id: "short-deal",
      name: "Short Deal",
      message: `Hi {{contactName}} 👋

Deal alert! 🎉
Brand: {{brand}}
Product: {{productName}}
Price: {{price}}
Platform: {{platform}}
Link: {{link}}

Check it out! 🛍️`
    },
    {
      id: "simple-link",
      name: "Simple Product Link",
      message: `Hi {{contactName}},

Sharing this deal with you:

{{productName}}
{{description}}

{{link}}`
    }
  ];

  let templates = loadTemplates();
  let selectedId = templates[0]?.id || "";
  let bypassKey = null;
  let guardInstalled = false;

  function loadTemplates() {
    try {
      const saved = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) {
        const valid = saved.filter(t =>
          t && t.id && t.name && typeof t.message === "string"
        );
        if (valid.length) return valid;
      }
    } catch (_) {}
    return defaults.map(t => ({...t}));
  }

  function saveTemplates() {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  }

  function readData() {
    try {
      const d = JSON.parse(localStorage.getItem(MAIN_KEY) || "{}");
      return {
        contacts: Array.isArray(d.contacts) ? d.contacts : [],
        products: Array.isArray(d.products) ? d.products : [],
        shares: Array.isArray(d.shares) ? d.shares : []
      };
    } catch (_) {
      return {contacts: [], products: [], shares: []};
    }
  }

  function currentPair() {
    try {
      const valid = batch.filter(x => x.contactId && x.productId);
      const item = valid[batchIndex];
      if (!item) return null;

      const data = readData();
      const contact = data.contacts.find(
        x => String(x.id) === String(item.contactId)
      );
      const product = data.products.find(
        x => String(x.id) === String(item.productId)
      );

      return contact && product ? {contact, product} : null;
    } catch (_) {
      return null;
    }
  }

  function getTemplate() {
    return templates.find(t => t.id === selectedId) || templates[0] || null;
  }

  function fillMessage(template, contact, product) {
    const values = {
      contactName: contact.name || "",
      phone: contact.phone || "",
      brand: product.brand || product.name || "",
      productName: product.name || "",
      productType: product.productType || "",
      description: product.description || "",
      price: product.price ? "₹" + product.price : "Check link",
      platform: product.platform || "",
      link: product.link || ""
    };

    return String(template || "").replace(
      /\{\{\s*([a-zA-Z]+)\s*\}\}/g,
      (match, key) => Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : match
    );
  }

  function buildMessage(contact, product) {
    const t = getTemplate();
    if (!t) return "";
    return fillMessage(t.message, contact, product);
  }

  function renderPanel() {
    const messageBox = $("message");
    if (!messageBox || !$("send")) return;

    let panel = $("waTemplatePanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "waTemplatePanel";
      panel.className = "card";
      panel.style.marginBottom = "12px";
      panel.innerHTML = `
        <h3>WhatsApp Message Templates</h3>
        <label for="waTemplateSelect">Choose a template</label>
        <select id="waTemplateSelect"
          style="width:100%;padding:10px;margin:6px 0 12px"></select>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button type="button" class="secondary" id="waEditTemplate">
            Edit Selected
          </button>
          <button type="button" class="secondary" id="waNewTemplate">
            Create New
          </button>
        </div>
        <p class="hint">
          Placeholders: {{contactName}}, {{phone}}, {{brand}},
          {{productName}}, {{productType}}, {{description}},
          {{price}}, {{platform}}, {{link}}
        </p>
      `;
      messageBox.closest(".card").insertAdjacentElement("beforebegin", panel);
    }

    if (!templates.some(t => t.id === selectedId)) {
      selectedId = templates[0]?.id || "";
    }

    const select = $("waTemplateSelect");
    select.innerHTML = templates.map(t => `
      <option value="${esc(t.id)}" ${t.id === selectedId ? "selected" : ""}>
        ${esc(t.name)}
      </option>
    `).join("");

    select.onchange = () => {
      selectedId = select.value;
      const pair = currentPair();
      if (pair) messageBox.value = buildMessage(pair.contact, pair.product);
    };

    $("waEditTemplate").onclick = () => editTemplate(getTemplate());
    $("waNewTemplate").onclick = () => editTemplate(null);
  }

  function editTemplate(existing) {
    // Use a real multiline editor instead of prompt(), which is unreliable
    // for editing messages containing line breaks on mobile browsers.
    const oldEditor = document.getElementById("waTemplateEditor");
    if (oldEditor) oldEditor.remove();

    const overlay = document.createElement("div");
    overlay.id = "waTemplateEditor";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:99999",
      "background:rgba(0,0,0,.55)", "display:flex",
      "align-items:center", "justify-content:center",
      "padding:16px", "box-sizing:border-box"
    ].join(";");

    const defaultMessage =
      "Hi {{contactName}} 👋\n\n{{productName}}\n{{description}}\n\n{{link}}";

    overlay.innerHTML = `
      <section role="dialog" aria-modal="true" aria-labelledby="waEditorTitle"
        style="width:100%;max-width:640px;max-height:92vh;overflow:auto;
        background:var(--surface,#fff);color:var(--text,#172033);
        border-radius:16px;padding:18px;box-sizing:border-box;
        box-shadow:0 12px 40px rgba(0,0,0,.25)">
        <h3 id="waEditorTitle" style="margin:0 0 14px">
          ${existing ? "Edit WhatsApp Template" : "Create WhatsApp Template"}
        </h3>
        <label for="waEditorName" style="display:block;font-weight:700;margin-bottom:6px">
          Template name
        </label>
        <input id="waEditorName" type="text" maxlength="80"
          style="width:100%;box-sizing:border-box;padding:12px;margin-bottom:14px;
          border:1px solid var(--border,#d0d5dd);border-radius:10px;font:inherit">
        <label for="waEditorMessage" style="display:block;font-weight:700;margin-bottom:6px">
          Message
        </label>
        <textarea id="waEditorMessage" rows="14" spellcheck="false"
          style="width:100%;min-height:260px;box-sizing:border-box;resize:vertical;
          padding:12px;border:1px solid var(--border,#d0d5dd);border-radius:10px;
          font:inherit;line-height:1.5;white-space:pre-wrap"></textarea>
        <p class="hint" style="margin:10px 0">
          Line breaks and blank lines are preserved. Useful placeholders:
          {{contactName}}, {{phone}}, {{brand}}, {{productName}},
          {{productType}}, {{description}}, {{price}}, {{platform}}, {{link}}
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
          <button type="button" class="secondary" id="waEditorCancel">Cancel</button>
          <button type="button" class="primary" id="waEditorSave">Save Template</button>
        </div>
      </section>
    `;

    document.body.appendChild(overlay);
    const nameInput = overlay.querySelector("#waEditorName");
    const messageInput = overlay.querySelector("#waEditorMessage");
    nameInput.value = existing?.name || "My Template";
    messageInput.value = existing?.message || defaultMessage;

    const close = () => overlay.remove();
    overlay.querySelector("#waEditorCancel").addEventListener("click", close);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });

    overlay.querySelector("#waEditorSave").addEventListener("click", () => {
      const name = nameInput.value.trim();
      // Keep line breaks exactly as typed, normalizing only Windows CRLF.
      const message = messageInput.value.replace(/\r\n?/g, "\n");

      if (!name) {
        alert("Enter a template name.");
        nameInput.focus();
        return;
      }
      if (!message.trim()) {
        alert("Template message cannot be empty.");
        messageInput.focus();
        return;
      }

      if (existing) {
        existing.name = name;
        existing.message = message;
        selectedId = existing.id;
      } else {
        const created = {
          id: "custom-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 7),
          name,
          message
        };
        templates.push(created);
        selectedId = created.id;
      }

      saveTemplates();
      renderPanel();
      close();

      const pair = currentPair();
      if (pair && $("message")) {
        $("message").value = buildMessage(pair.contact, pair.product);
      }
    });

    nameInput.focus();
  }

  function findDuplicates(contact, product) {
    return readData().shares.filter(s =>
      String(s.contactId) === String(contact.id) &&
      String(s.productId) === String(product.id)
    ).sort((a, b) => Number(b.time || 0) - Number(a.time || 0));
  }

  function warnAboutDuplicate(contact, product, matches) {
    const last = matches[0];
    const lastDate = last?.time
      ? new Date(Number(last.time)).toLocaleString()
      : "Unknown date";

    return confirm(
      "⚠️ POSSIBLE DUPLICATE SHARE\n\n" +
      "Contact: " + contact.name + "\n" +
      "Product: " + product.name + "\n" +
      "Previous share records: " + matches.length + "\n" +
      "Most recent share: " + lastDate + "\n\n" +
      "This contact and product already appear in your history.\n\n" +
      "OK = Continue anyway\nCancel = Stop this share"
    );
  }

  function installDuplicateGuard() {
    const button = $("openNext");
    if (!button || guardInstalled) return;
    guardInstalled = true;

    button.addEventListener("click", event => {
      const pair = currentPair();
      if (!pair) return;

      const key = String(pair.contact.id) + "::" + String(pair.product.id);

      if (bypassKey === key) {
        bypassKey = null;
        return;
      }

      const matches = findDuplicates(pair.contact, pair.product);
      if (!matches.length) return;

      // Stop the original click handler until the user confirms.
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!warnAboutDuplicate(pair.contact, pair.product, matches)) {
        return;
      }

      // Invoke the existing app.js click handler only after confirmation.
      const handler = button.onclick;
      if (typeof handler !== "function") {
        alert("Unable to continue. Refresh the app and try again.");
        return;
      }

      bypassKey = key;
      try {
        handler.call(button, new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      } finally {
        bypassKey = null;
      }
    }, true);
  }

  function installMessageTemplate() {
    // app.js defines makeMessage in a classic script. Preserve its call sites
    // while using the selected template for the next contact/product pair.
    if (typeof window.makeMessage !== "function" ||
        window.makeMessage.__templateEnhanced) return;

    const original = window.makeMessage;

    const enhanced = function(contact, product) {
      if (getTemplate()) return buildMessage(contact, product);
      return original.call(this, contact, product);
    };

    enhanced.__templateEnhanced = true;
    window.makeMessage = enhanced;
  }

  function refresh() {
    renderPanel();
    installDuplicateGuard();
    installMessageTemplate();
  }

  function install() {
    if (!$("send") || !$("message") || !$("openNext")) return;

    saveTemplates();
    refresh();

    // Keep the template controls fresh when the batch advances.
    if (typeof window.updateBatchUI === "function" &&
        !window.updateBatchUI.__templateEnhanced) {
      const original = window.updateBatchUI;

      const enhanced = function(...args) {
        const result = original.apply(this, args);
        refresh();
        return result;
      };

      enhanced.__templateEnhanced = true;
      window.updateBatchUI = enhanced;
    }

    document.querySelectorAll('[data-page="send"]').forEach(button => {
      button.addEventListener("click", () => setTimeout(refresh, 0));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
