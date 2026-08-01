(() => {
  "use strict";
  const TOKEN_KEY = "gisele-flavia-customer-token";
  const labels = {
    pendente: "Pendente",
    sem_entrega: "Pendente",
    separando: "Em preparação",
    pronto_retirada: "Pronto para retirada",
    saiu_entrega: "saiu para entrega",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };
  let orders = new Map();
  let loading = false;

  async function loadOrders() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || loading) return;
    loading = true;
    try {
      const response = await fetch("/api/clientes-auth/me/pedidos", { headers:{ Authorization:`Bearer ${token}` }, cache:"no-store" });
      if (!response.ok) return;
      const data = await response.json();
      orders = new Map((data || []).map(order => [Number(order.id), order]));
      enhanceOrders();
    } finally { loading = false; }
  }

  function enhanceOrders() {
    document.querySelectorAll("article").forEach(article => {
      const heading = Array.from(article.querySelectorAll("p")).find(item => /^Pedido #\d+$/.test(item.textContent.trim()));
      const id = Number(heading?.textContent.match(/\d+/)?.[0]);
      const order = orders.get(id);
      if (!order) return;
      const paymentBadge = Array.from(article.querySelectorAll("span")).find(item => /^Pagamento:/i.test(item.textContent.trim()));
      const badges = paymentBadge?.parentElement;
      if (!badges) return;
      let badge = badges.querySelector("[data-order-fulfillment-status]");
      if (!badge) {
        badge = document.createElement("span");
        badge.dataset.orderFulfillmentStatus = "true";
        badge.className = "text-xs px-2 py-1 rounded-full";
        badges.appendChild(badge);
      }
      const pickup = order.tipo_entrega === "retirada";
      const status = order.status_entrega || "pendente";
      const label = status === "entregue" && pickup ? "Retirado" : (labels[status] || status);
      const text = `${pickup ? "Retirada" : "Entrega"}: ${label}`;
      if (badge.textContent !== text) badge.textContent = text;
      badge.style.color = ["entregue"].includes(status) ? "#166534" : status === "cancelado" ? "#B91C1C" : "#AD0257";
      badge.style.backgroundColor = status === "entregue" ? "#F0FDF4" : status === "cancelado" ? "#FEF2F2" : "#FFF0F7";
      Array.from(badges.children).filter(item => item !== badge && /^Entrega:/i.test(item.textContent.trim())).forEach(item => item.remove());
    });
  }

  new MutationObserver(enhanceOrders).observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadOrders, { once:true }); else loadOrders();
  window.addEventListener("focus", loadOrders);
})();
