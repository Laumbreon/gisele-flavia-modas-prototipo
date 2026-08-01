(() => {
  "use strict";
  const TOKEN_KEY = "gisele-flavia-customer-token";
  const money = value => Number(value || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  const date = value => value ? new Date(value).toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" }) : "—";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const paymentLabel = value => ({ dinheiro:"Dinheiro",pix:"Pix",debito:"Cartão de débito",credito:"Cartão de crédito",cartao:"Cartão",mercado_pago:"Mercado Pago" })[value] || String(value || "—");
  let paidOrders = new Set();
  let loadingOrders = false;

  function closeReceipt() { document.querySelector(".customer-receipt-modal")?.remove(); }

  function showReceipt(receipt) {
    closeReceipt();
    const items = receipt.itens || [];
    const payments = receipt.pagamentos?.length ? receipt.pagamentos : [{ forma_pagamento:receipt.forma_pagamento, valor:receipt.total_pago || receipt.total }];
    const delivery = receipt.tipo_entrega === "entrega_local"
      ? `<div class="customer-receipt-delivery"><b>Entrega</b><span>${escape([receipt.endereco,receipt.numero,receipt.bairro,receipt.cidade,receipt.estado].filter(Boolean).join(", "))}</span><span>Taxa de entrega: <strong>${money(receipt.frete_valor)}</strong></span></div>`
      : `<div class="customer-receipt-delivery"><b>Retirada na loja</b><span>${escape(receipt.cliente_nome)} · ${escape(receipt.cliente_telefone || "Telefone não informado")}</span></div>`;
    const modal = document.createElement("div");
    modal.className = "customer-receipt-modal";
    const referenceCodes = [...new Set(items.map(item => item.codigo_ref || item.codigo_interno || item.sku).filter(Boolean))].join(", ") || "Não informado";
    modal.innerHTML = `<div class="customer-receipt-backdrop" data-close-receipt></div><article class="customer-receipt-card"><button class="customer-receipt-close" data-close-receipt aria-label="Fechar">×</button><header><img src="/assets/logo.jpeg" alt="Gisele Flávia Moda Feminina"><strong>Gisele Flávia</strong><small>Moda Feminina</small><h2>Comprovante de compra #${Number(receipt.id)}</h2></header><div class="customer-receipt-meta"><span>${date(receipt.created_at)}</span></div><p><b>Cliente:</b> ${escape(receipt.cliente_nome || "Consumidor não identificado")}<br><b>Telefone:</b> ${escape(receipt.cliente_telefone || "—")}</p>${delivery}<div class="customer-receipt-items">${items.map(item => `<div><span><b>${escape(item.produto_nome)}</b><small>${escape([item.tamanho,item.cor].filter(Boolean).join(" · "))}</small><small>Ref./lote: ${escape(item.codigo_ref || item.codigo_interno || item.sku || "Não informado")}<br>Cód. barras: ${escape(item.codigo_barras || "Não informado")}</small></span><span>${Number(item.quantidade)} × ${money(item.preco_unitario)}<b>${money(item.subtotal)}</b></span></div>`).join("")}</div><div class="customer-receipt-totals"><span>Subtotal <b>${money(receipt.subtotal)}</b></span><span>Desconto <b>− ${money(receipt.desconto)}</b></span><span>Taxa de entrega <b>${money(receipt.frete_valor)}</b></span><strong>Total da compra <b>${money(receipt.total)}</b></strong><span>Total pago pelo cliente <b>${money(receipt.total_pago || receipt.total)}</b></span>${Number(receipt.troco || 0)>0?`<span>Troco devolvido <b>${money(receipt.troco)}</b></span>`:""}</div><div class="customer-receipt-payments"><b>Valores por meio de pagamento</b>${payments.map(payment=>`<span>${escape(paymentLabel(payment.forma_pagamento))}<strong>${money(payment.valor)}</strong></span>`).join("")}</div><footer><b>Código(s) Ref.:</b> ${escape(referenceCodes)}<br><b>CNPJ:</b> 11.293.505/0001-08<br><b>Endereço:</b> Rua Amando de Barros, 993 — Centro<br><b>CEP:</b> 18.600-050<br><p>Obrigada pela preferência!</p><small>Documento comercial sem validade fiscal.</small></footer><button class="customer-receipt-print" onclick="window.print()">Imprimir comprovante</button></article>`;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-close-receipt]").forEach(element => element.addEventListener("click", closeReceipt));
  }

  async function openReceipt(orderId, button) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    button.disabled = true; button.textContent = "Carregando...";
    try {
      const response = await fetch(`/api/clientes-auth/me/pedidos/${orderId}/cupom`, { headers:{ Authorization:`Bearer ${token}` }, cache:"no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível abrir o cupom.");
      showReceipt(data);
    } catch (error) { alert(error.message); }
    finally { button.disabled = false; button.textContent = "Ver comprovante"; }
  }

  function enhanceOrders() {
    document.querySelectorAll("article").forEach(article => {
      const heading = Array.from(article.querySelectorAll("p")).find(element => /^Pedido #\d+$/.test(element.textContent.trim()));
      if (!heading || article.querySelector(".customer-receipt-button")) return;
      const id = Number(heading.textContent.match(/\d+/)?.[0]); if (!id) return;
      if (!paidOrders.has(id) && !/pagamento:\s*pago\b|pagamento\s+confirmado/i.test(article.textContent)) return;
      const button = document.createElement("button");
      button.type = "button"; button.className = "customer-receipt-button"; button.textContent = "Ver comprovante";
      button.addEventListener("click", () => openReceipt(id, button));
      article.appendChild(button);
    });
  }

  async function loadPaidOrders() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || loadingOrders) return enhanceOrders();
    loadingOrders = true;
    try {
      const response = await fetch("/api/clientes-auth/me/pedidos", { headers:{ Authorization:`Bearer ${token}` }, cache:"no-store" });
      if (response.ok) {
        const orders = await response.json();
        paidOrders = new Set((orders || []).filter(order => String(order.status_pagamento).toLowerCase() === "pago").map(order => Number(order.id)));
      }
    } finally { loadingOrders = false; enhanceOrders(); }
  }

  new MutationObserver(enhanceOrders).observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadPaidOrders, { once:true }); else loadPaidOrders();
  window.addEventListener("focus", loadPaidOrders);
})();
