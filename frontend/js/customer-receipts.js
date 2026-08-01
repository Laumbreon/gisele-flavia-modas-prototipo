(() => {
  "use strict";
  const TOKEN_KEY = "gisele-flavia-customer-token";
  const money = value => Number(value || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));

  function closeReceipt() { document.querySelector(".customer-receipt-modal")?.remove(); }

  function showReceipt(receipt) {
    closeReceipt();
    const delivery = receipt.tipo_entrega === "entrega_local"
      ? `<div class="customer-receipt-delivery"><b>Entrega</b><span>${escape([receipt.endereco, receipt.numero, receipt.bairro, receipt.cidade, receipt.estado].filter(Boolean).join(", "))}</span><span>Taxa de entrega: <strong>${money(receipt.frete_valor)}</strong></span></div>`
      : `<div class="customer-receipt-delivery"><b>Retirada na loja</b><span>${escape(receipt.cliente_nome)} · ${escape(receipt.cliente_telefone || "Telefone não informado")}</span></div>`;
    const modal = document.createElement("div");
    modal.className = "customer-receipt-modal";
    const referenceCodes = [...new Set((receipt.itens || []).map(item => item.codigo_interno || item.sku).filter(Boolean))].join(", ") || "Não informado";
    modal.innerHTML = `<div class="customer-receipt-backdrop" data-close-receipt></div><article class="customer-receipt-card"><button class="customer-receipt-close" data-close-receipt aria-label="Fechar">×</button><header><img src="/assets/logo.jpeg" alt="Gisele Flávia"><h2>Comprovante de compra #${Number(receipt.id)}</h2></header><p><b>Cliente:</b> ${escape(receipt.cliente_nome)}<br><b>Telefone:</b> ${escape(receipt.cliente_telefone || "—")}</p>${delivery}<div class="customer-receipt-items">${(receipt.itens || []).map(item => `<div><span><b>${escape(item.produto_nome)}</b><small>${escape([item.tamanho,item.cor].filter(Boolean).join(" / "))}<br>Código Ref.: ${escape(item.codigo_interno || item.sku || "—")} · Barras: ${escape(item.codigo_barras || "—")}</small></span><span>${Number(item.quantidade)} × ${money(item.preco_unitario)}<b>${money(item.subtotal)}</b></span></div>`).join("")}</div><div class="customer-receipt-totals"><span>Subtotal <b>${money(receipt.subtotal)}</b></span><span>Taxa de entrega <b>${money(receipt.frete_valor)}</b></span><strong>Total <b>${money(receipt.total)}</b></strong></div><footer><b>Código(s) Ref.:</b> ${escape(referenceCodes)}<br>CNPJ 11.293.505/0001-08<br>Rua Amando de Barros, 993 — Centro<br>CEP 18.600-050<br><small>Documento comercial sem validade fiscal.</small></footer><button class="customer-receipt-print" onclick="window.print()">Imprimir comprovante</button></article>`;
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
      if (!/\bpago\b|pagamento\s+confirmado/i.test(article.textContent)) return;
      const id = Number(heading.textContent.match(/\d+/)?.[0]); if (!id) return;
      const button = document.createElement("button");
      button.type = "button"; button.className = "customer-receipt-button"; button.textContent = "Ver comprovante";
      button.addEventListener("click", () => openReceipt(id, button));
      article.appendChild(button);
    });
  }

  new MutationObserver(enhanceOrders).observe(document.documentElement, { childList:true, subtree:true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceOrders, { once:true }); else enhanceOrders();
})();
