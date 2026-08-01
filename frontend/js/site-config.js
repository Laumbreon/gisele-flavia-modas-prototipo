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

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[character]);
  }

  function policyText(value) {
    return escapeHtml(value).replace(/\r?\n/g, "<br>");
  }

  function setSectionText(key, original) {
    const selector = `[data-site-setting="${key}"]`;
    let element = document.querySelector(selector);
    if (!element) {
      element = Array.from(document.querySelectorAll("h2, p")).find(item => normalizedText(item) === original);
      if (element) element.dataset.siteSetting = key;
    }
    setText(element, settings?.[key]);
  }

  function ensureDeliveryNotice() {
    const footer = document.querySelector("footer");
    if (!footer || document.querySelector(".store-policy-notice")) return;
    const section = document.createElement("section");
    section.className = "store-policy-notice";
    section.setAttribute("aria-labelledby", "store-policy-title");
    section.innerHTML = `
      <div class="store-policy-card">
        <div class="store-policy-heading">
          <span class="store-policy-icon" aria-hidden="true">!</span>
          <div><span class="store-policy-kicker">Informações importantes</span><h2 id="store-policy-title">${escapeHtml(settings.politicas_titulo)}</h2></div>
        </div>
        <div class="store-policy-grid">
          <article><strong>${escapeHtml(settings.politica_entrega_titulo)}</strong><p>${policyText(settings.politica_entrega_texto)}</p></article>
          <article><strong>${escapeHtml(settings.politica_trocas_titulo)}</strong><p>${policyText(settings.politica_trocas_texto)}</p></article>
        </div>
      </div>`;
    footer.parentNode.insertBefore(section, footer);
  }

  function ensureContacts() {
    const footer = document.querySelector("footer");
    if (!footer) return;
    let contacts = footer.querySelector(".store-dynamic-contacts");
    if (!contacts) {
      contacts = document.createElement("div");
      contacts.className = "store-dynamic-contacts";
      footer.prepend(contacts);
    }
    const whatsappDigits = String(settings.contato_whatsapp || "").replace(/\D/g, "");
    const whatsapp = whatsappDigits.length <= 11 ? `55${whatsappDigits}` : whatsappDigits;
    const links = [
      settings.contato_telefone ? `<a href="tel:${escapeHtml(String(settings.contato_telefone).replace(/[^\d+]/g, ""))}">${escapeHtml(settings.contato_telefone)}</a>` : "",
      whatsappDigits ? `<a href="https://wa.me/${escapeHtml(whatsapp)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : "",
      settings.contato_email ? `<a href="mailto:${escapeHtml(settings.contato_email)}">${escapeHtml(settings.contato_email)}</a>` : "",
      `<a href="https://www.instagram.com/${escapeHtml(String(settings.instagram_usuario || "").replace(/^@/, ""))}/" target="_blank" rel="noopener noreferrer">@${escapeHtml(String(settings.instagram_usuario || "").replace(/^@/, ""))}</a>`,
    ].join("");
    const markup = `<strong>Contato</strong>${links}`;
    if (contacts.innerHTML !== markup) contacts.innerHTML = markup;
  }

  function applyCampaignCategory() {
    const title = document.querySelector('[data-site-setting="campanha_titulo"]');
    const section = title?.closest("section");
    const link = section?.querySelector('a[href*="/produtos"]');
    if (!link) return;
    const category = String(settings.campanha_categoria || "Novidades").trim();
    const destination = category.toLowerCase() === "todos" ? "/produtos" : `/produtos?categoria=${encodeURIComponent(category)}`;
    link.href = destination;
    link.dataset.campaignDestination = destination;
    if (!link.dataset.campaignCategoryBound) {
      link.dataset.campaignCategoryBound = "true";
      link.addEventListener("click", event => {
        event.preventDefault();
        window.location.assign(link.dataset.campaignDestination || "/produtos");
      });
    }
  }

  function ensureInformativeImage() {
    const source = String(settings?.imagem_informativa || "").trim();
    const current = document.querySelector(".home-informative-image");
    if (!source) { current?.remove(); return; }
    const hero = document.querySelector('img[alt^="Hero "]')?.closest("section");
    if (!hero) return;
    if (current) {
      const image = current.querySelector("img");
      if (image?.getAttribute("src") !== source) image?.setAttribute("src", source);
      if (current.previousElementSibling !== hero) hero.insertAdjacentElement("afterend", current);
      return;
    }
    const section = document.createElement("section");
    section.className = "home-informative-image";
    section.innerHTML = `<div><img src="${source.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" alt="Informações importantes da loja"></div>`;
    hero.insertAdjacentElement("afterend", section);
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

    const carouselImages = Array.isArray(settings.carrossel_imagens) ? settings.carrossel_imagens : [];
    document.querySelectorAll('img[alt^="Hero "]').forEach((image, index) => {
      const source = carouselImages[index % carouselImages.length];
      if (source && image.getAttribute("src") !== source) image.setAttribute("src", source);
    });

    [
      ["categorias_titulo", "Explore por Categoria"], ["categorias_subtitulo", "Descubra peças para cada momento da sua vida"],
      ["vendidos_selo", "Favoritas"], ["vendidos_titulo", "Mais Vendidos"],
      ["campanha_selo", "Exclusividade"], ["campanha_titulo", "Nova Coleção Inverno"], ["campanha_texto", "Peças exclusivas com tecidos nobres e cortes impecáveis"],
      ["novidades_selo", "Recém chegadas"], ["novidades_titulo", "Novidades"],
      ["looks_selo", "Inspiração"], ["looks_titulo", "Looks em Destaque"],
      ["depoimentos_titulo", "O que nossas clientes dizem"],
      ["instagram_selo", "Fique por dentro"], ["instagram_titulo", "Acompanhe as novidades em primeira mão"],
      ["instagram_texto", "Lançamentos, combinações e atendimento direto pelo Instagram."],
    ].forEach(([key, original]) => setSectionText(key, original));

    const campaignImage = document.querySelector('img[alt="Nova Coleção"]');
    if (campaignImage && settings.campanha_imagem && campaignImage.getAttribute("src") !== settings.campanha_imagem) {
      campaignImage.setAttribute("src", settings.campanha_imagem);
    }
    applyCampaignCategory();

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

    document.querySelectorAll('a[href^="tel:"]').forEach(link => { link.href = `tel:${String(settings.contato_telefone || "").replace(/[^\d+]/g, "")}`; });
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => { link.href = `mailto:${settings.contato_email}`; });
    ensureContacts();

    ensureDeliveryNotice();
    ensureInformativeImage();
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
