(() => {
  "use strict";

  let categories = [];
  const collator = new Intl.Collator("pt-BR", { sensitivity:"base" });
  const categoryUrl = name => `/produtos?categoria=${encodeURIComponent(name)}`;

  function categoryLink(name, mobile = false) {
    const link = document.createElement("a");
    link.href = categoryUrl(name);
    link.textContent = name;
    link.className = mobile
      ? "block py-3 border-b border-gray-50 text-sm"
      : "text-sm tracking-wide transition-colors duration-200 hover:text-pink-500";
    link.style.color = name === "Promoções" ? "#FE0182" : "#111111";
    link.style.fontFamily = "var(--font-body)";
    return link;
  }

  function arrangeDesktop() {
    const nav = document.querySelector('header nav.hidden.lg\\:flex');
    if (!nav || !categories.length) return;
    const signature = categories.join("|");
    if (nav.dataset.alphabeticalMenu === signature && nav.querySelectorAll(":scope > a").length === Math.min(6, categories.length)) return;

    const visible = categories.slice(0, 6);
    const overflow = categories.slice(6);
    const nodes = visible.map(name => categoryLink(name));
    if (overflow.length) {
      const wrapper = document.createElement("div");
      wrapper.className = "relative flex-shrink-0";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "+";
      button.className = "px-3 py-2 text-xl leading-tight";
      button.setAttribute("aria-label", "Mais categorias");
      button.setAttribute("aria-expanded", "false");
      const menu = document.createElement("div");
      menu.setAttribute("role", "menu");
      Object.assign(menu.style, { display:"none", position:"absolute", top:"100%", right:"0", zIndex:"60", minWidth:"210px", padding:"8px 0", background:"white", border:"1px solid #f3f4f6", boxShadow:"0 12px 30px rgba(0,0,0,.14)", maxHeight:"min(60vh, 360px)", overflowY:"auto" });
      overflow.forEach(name => {
        const link = categoryLink(name);
        link.className = "block px-4 py-2.5 text-sm hover:bg-pink-50";
        link.setAttribute("role", "menuitem");
        menu.appendChild(link);
      });
      button.addEventListener("click", () => {
        const opening = menu.style.display === "none";
        menu.style.display = opening ? "block" : "none";
        button.style.color = opening ? "#FE0182" : "#111111";
        button.setAttribute("aria-expanded", String(opening));
      });
      wrapper.append(button, menu);
      nodes.push(wrapper);
    }
    nav.replaceChildren(...nodes);
    nav.dataset.alphabeticalMenu = signature;
  }

  function arrangeMobile() {
    document.querySelectorAll(".category-mobile-menu").forEach(menu => {
      const signature = categories.join("|");
      if (menu.dataset.alphabeticalMenu === signature) return;
      const account = Array.from(menu.querySelectorAll("a")).find(link => /minha conta/i.test(link.textContent));
      const nodes = categories.map(name => categoryLink(name, true));
      if (account) {
        account.className = "block py-3 text-sm";
        account.style.color = "#111111";
        nodes.push(account);
      }
      menu.replaceChildren(...nodes);
      menu.dataset.alphabeticalMenu = signature;
    });
  }

  function arrangeFooter() {
    const heading = Array.from(document.querySelectorAll("footer h4"))
      .find(item => item.textContent.trim().toLocaleLowerCase("pt-BR") === "categorias");
    const list = heading?.parentElement?.querySelector("ul");
    if (!list || !categories.length) return;
    const signature = categories.join("|");
    if (list.dataset.alphabeticalMenu === signature) return;
    const nodes = categories.map(name => {
      const item = document.createElement("li");
      const link = categoryLink(name);
      link.className = "text-sm hover:text-white transition-colors";
      link.style.color = name === "Promoções" ? "#FE0182" : "#9CA3AF";
      item.appendChild(link);
      return item;
    });
    list.replaceChildren(...nodes);
    list.dataset.alphabeticalMenu = signature;
  }

  function arrange() { arrangeDesktop(); arrangeMobile(); arrangeFooter(); }

  async function start() {
    try {
      const response = await fetch("/api/public/produtos/categorias", { headers:{ Accept:"application/json" }, cache:"no-store" });
      if (!response.ok) return;
      const rows = await response.json();
      const featured = ["Novidades", "Promoções"];
      const remaining = [...new Set(rows.map(row => row.nome || row.name).filter(Boolean))]
        .filter(name => !featured.some(item => collator.compare(item, name) === 0))
        .sort((first, second) => collator.compare(first, second));
      categories = [...featured, ...remaining];
      arrange();
      new MutationObserver(arrange).observe(document.body, { childList:true, subtree:true });
    } catch { /* Mantém o menu original se o catálogo estiver indisponível. */ }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
