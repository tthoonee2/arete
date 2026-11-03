// Progressive accessibility and interaction fixes for the legacy single-file UI.
(() => {
  const menu = document.getElementById("menu-btn");
  if (menu) menu.setAttribute("aria-controls", "main-nav");
  document.querySelectorAll("button:not([type])").forEach(b => b.setAttribute("type", "button"));

  // The custom sliders already support arrows. Expose their numeric state to AT.
  const originalSlider = window.slider;
  if (typeof originalSlider === "function") {
    window.slider = function accessibleSlider(id, val, lo, hi, step, cb) {
      originalSlider(id, val, lo, hi, step, cb);
      const root = document.getElementById(id), handle = root?.querySelector(".sl-h");
      if (!root || !handle) return;
      const sync = value => {
        handle.setAttribute("aria-valuemin", lo);
        handle.setAttribute("aria-valuemax", hi);
        handle.setAttribute("aria-valuenow", Number(value).toFixed(6));
        handle.setAttribute("aria-valuestep", step);
      };
      sync(val);
      root.addEventListener("keydown", event => {
        if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key)) {
          requestAnimationFrame(() => sync(handle.getAttribute("aria-valuenow") || val));
        }
      });
      const observer = new MutationObserver(() => {
        const text = root.querySelector("output")?.value;
        if (text && Number.isFinite(Number(text))) sync(Number(text));
      });
      observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
    };
  }

  // Keep keyboard focus inside modal dialogs and restore it when they close.
  let dialogReturn = null;
  const dialogObserver = new MutationObserver(() => {
    const open = document.querySelector(".modal-back.open");
    if (open && !dialogReturn) {
      dialogReturn = document.activeElement;
      requestAnimationFrame(() => (open.querySelector("input,button,select,textarea,[tabindex='0']") || open).focus());
    } else if (!open && dialogReturn) {
      dialogReturn.focus?.(); dialogReturn = null;
    }
  });
  dialogObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("keydown", event => {
    const open = document.querySelector(".modal-back.open");
    if (event.key === "Escape" && document.getElementById("main-nav")?.classList.contains("open")) {
      document.getElementById("main-nav").classList.remove("open");
      document.getElementById("menu-btn")?.setAttribute("aria-expanded", "false");
    }
    if (!open || event.key !== "Tab") return;
    const items = [...open.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex='0']")].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // Make the institutional CTA useful without changing the original markup.
  const widgetCta = document.querySelector("#wg-cta");
  if (widgetCta) widgetCta.addEventListener("click", event => {
    if (typeof WG !== "undefined" && typeof pickAnywhere === "function") {
      event.preventDefault(); event.stopImmediatePropagation(); pickAnywhere(WG.id);
    }
  }, true);
})();
