(() => {
  "use strict";

  let settings = null;
  let scheduled = false;

  function normalizedText(element) {
    return String(element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function setText(element, value) {
    if (element && value && normalizedText(element) !== value) element.textContent = value;
  }

  function applySettings() {
    scheduled = false;
    if (!settings) return;

    const all = Array.from(document.querySelectorAll("body *"));
    const topbar = all.find((element) => element.children.length === 0 && /^Frete gr[aá]tis em compras acima/i.test(normalizedText(element)));
    setText(topbar, settings.faixa_superior);

    const heroTitle = Array.from(document.querySelectorAll("h1")).find((element) => /Vestindo voc[eê]/i.test(normalizedText(element)));
    setText(heroTitle, settings.hero_titulo);

    const heroSubtitle = Array.from(document.querySelectorAll("p")).find((element) => /^Pe[cç]as que valorizam/i.test(normalizedText(element)));
    setText(heroSubtitle, settings.hero_subtitulo);

    const username = String(settings.instagram_usuario || "gisele_flavia_modas").replace(/^@/, "");
    const profileUrl = `https://www.instagram.com/${username}/`;
    document.querySelectorAll('a[href*="instagram.com/"]').forEach((link) => {
      if (link.href !== profileUrl) link.href = profileUrl;
      if (/^@gisele_flavia_modas$/i.test(normalizedText(link))) link.textContent = `@${username}`;
    });
    all.filter((element) => element.children.length === 0 && normalizedText(element) === "@gisele_flavia_modas")
      .forEach((element) => setText(element, `@${username}`));

    document.querySelectorAll("blockquote.instagram-media").forEach((embed) => {
      if (embed.dataset.instgrmPermalink !== profileUrl) embed.dataset.instgrmPermalink = profileUrl;
    });
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applySettings);
  }

  async function loadSettings() {
    try {
      const response = await fetch("/api/public/configuracoes-site", { headers: { Accept: "application/json" } });
      if (!response.ok) return;
      settings = await response.json();
      scheduleApply();
      const observer = new MutationObserver(scheduleApply);
      observer.observe(document.body, { childList: true, subtree: true });
    } catch {
      // O site continua com os textos originais quando a API estiver indisponível.
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadSettings, { once: true });
  else loadSettings();
})();
