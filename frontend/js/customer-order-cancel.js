(() => {
  "use strict";
  const TOKEN_KEY = "gisele-flavia-customer-token";
  const pending = /pagamento:\s*(pendente|pending|aguardando_pagamento)/i;

  async function cancelOrder(orderId, button) {
    if (!confirm("Deseja cancelar esta compra? Esta ação não poderá ser desfeita.")) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return window.location.assign("/login");
    button.disabled = true;
    button.textContent = "Cancelando...";
    try {
      const response = await fetch(`/api/clientes-auth/me/pedidos/${orderId}/cancelar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Não foi possível cancelar a compra.");
      alert(data.message);
      window.location.reload();
    } catch (error) {
      alert(error.message);
      button.disabled = false;
      button.textContent = "Cancelar compra";
    }
  }

  function enhanceOrders() {
    document.querySelectorAll("article").forEach(article => {
      if (article.querySelector(".customer-order-cancel")) return;
      const heading = Array.from(article.querySelectorAll("p")).find(item => /^Pedido #\d+$/.test(item.textContent.trim()));
      if (!heading || !pending.test(article.textContent) || /pagamento:\s*(pago|cancelado)/i.test(article.textContent)) return;
      const orderId = Number(heading.textContent.match(/\d+/)?.[0]);
      if (!orderId) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "customer-order-cancel mt-4 ml-2 px-5 py-2.5 text-sm border";
      button.style.borderColor = "#B91C1C";
      button.style.color = "#B91C1C";
      button.textContent = "Cancelar compra";
      button.addEventListener("click", () => cancelOrder(orderId, button));
      article.appendChild(button);
    });
  }

  new MutationObserver(enhanceOrders).observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceOrders, { once:true });
  else enhanceOrders();
})();
