/* Deal Dhamaka — cross-tab Undo/Redo for local data mutations.
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
})();