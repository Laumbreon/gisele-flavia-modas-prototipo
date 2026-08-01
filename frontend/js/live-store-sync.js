(() => {
  "use strict";
  if (!/^\/$|^\/produtos\/?$|^\/produto\/\d+\/?$/.test(location.pathname)) return;
  let signature = null;
  let checking = false;

  function stockSignature(products) {
    return JSON.stringify((products || []).map(product => [
      Number(product.id), Number(product.estoque_total || 0),
      (product.variacoes || []).map(item => [Number(item.id), Number(item.quantidade_estoque ?? item.estoque ?? 0), item.ativo !== false]),
    ]));
  }

  async function checkStock() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const response = await fetch("/api/public/produtos", { cache:"no-store", headers:{ "Cache-Control":"no-cache" } });
      if (!response.ok) return;
      const current = stockSignature(await response.json());
      if (signature !== null && current !== signature) return location.reload();
      signature = current;
    } catch { /* Mantém a página atual se a rede estiver indisponível. */ }
    finally { checking = false; }
  }

  checkStock();
  setInterval(checkStock, 20000);
  window.addEventListener("focus", checkStock);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkStock(); });
})();
