(() => {
  "use strict";
  let selected = "ativos";

  function isCancelled(article) {
    return /pagamento:\s*cancelado|entrega:\s*cancelado/i.test(article.textContent);
  }

  function enhanceOrders() {
    const heading = Array.from(document.querySelectorAll("h2")).find(item => item.textContent.trim() === "Meus Pedidos");
    if (!heading) return;
    const header = heading.parentElement;
    const section = header?.parentElement;
    if (!section) return;
    const articles = Array.from(section.querySelectorAll("article")).filter(article =>
      Array.from(article.querySelectorAll("p")).some(item => /^Pedido #\d+$/.test(item.textContent.trim()))
    );
    if (!articles.length) return;

    let tabs = section.querySelector(".customer-order-tabs");
    if (!tabs) {
      tabs = document.createElement("div");
      tabs.className = "customer-order-tabs flex gap-2 mb-5";
      tabs.innerHTML = `<button type="button" data-customer-orders="ativos">Ativos</button><button type="button" data-customer-orders="cancelados">Cancelados</button>`;
      header.insertAdjacentElement("afterend", tabs);
      tabs.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
        selected = button.dataset.customerOrders;
        enhanceOrders();
      }));
    }

    const totals = {
      ativos: articles.filter(article => !isCancelled(article)).length,
      cancelados: articles.filter(isCancelled).length,
    };
    tabs.querySelectorAll("button").forEach(button => {
      const active = button.dataset.customerOrders === selected;
      const label = `${button.dataset.customerOrders === "ativos" ? "Ativos" : "Cancelados"} (${totals[button.dataset.customerOrders]})`;
      if (button.textContent !== label) button.textContent = label;
      button.className = "px-5 py-2.5 text-sm border";
      button.style.backgroundColor = active ? "#FE0182" : "#FFFFFF";
      button.style.borderColor = active ? "#FE0182" : "#E5E7EB";
      button.style.color = active ? "#FFFFFF" : "#374151";
    });
    articles.forEach(article => {
      article.style.display = (selected === "cancelados") === isCancelled(article) ? "" : "none";
    });
  }

  new MutationObserver(enhanceOrders).observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceOrders, { once:true });
  else enhanceOrders();
})();
