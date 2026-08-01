(() => {
  "use strict";

  function enhanceHeightField() {
    document.querySelectorAll('input[placeholder="Altura (cm)"], input[data-virtual-height]').forEach(input => {
      input.dataset.virtualHeight = "meters";
      input.placeholder = "Altura (m) — ex.: 1,65";
      input.setAttribute("aria-label", "Altura em metros");
      input.setAttribute("inputmode", "decimal");
      input.setAttribute("lang", "pt-BR");
      input.min = "0.80";
      input.max = "2.50";
      input.step = "0.01";
    });
  }

  new MutationObserver(enhanceHeightField).observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceHeightField, { once:true });
  else enhanceHeightField();
})();
