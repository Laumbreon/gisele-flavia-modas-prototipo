(function () {
  "use strict";

  const SESSION_KEY = "gisele-flavia-admin-session";
  const API = "/api";
  const titles = {
    dashboard: "Visão geral",
    pdv: "PDV — Frente de caixa",
    products: "Produtos e uploads",
    "product-editor": "Editar produto",
    orders: "Pedidos",
    customers: "Clientes",
    freight: "Fretes por bairro",
    machines: "Configuração das maquininhas",
    labels: "Etiquetas de produtos",
    settings: "Dados do site",
    team: "Equipe",
  };

  const state = {
    session: readSession(),
    view: "dashboard",
    products: [],
    categories: [],
    orders: [],
    customers: [],
    freight: [],
    users: [],
    settings: {},
    product: null,
    pdvProducts: [],
    pdvCart: [],
    pdvCash: null,
    cashHistory: [],
    machines: [],
    labelProducts: [],
  };

  const view = document.getElementById("view");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  const modalTitle = document.getElementById("modalTitle");
  const toastElement = document.getElementById("toast");

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  }

  function redirectLogin() {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace("/login");
  }

  async function logout() {
    try { await fetch(`${API}/auth/logout`, { method: "POST" }); }
    finally { redirectLogin(); }
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.session?.token) headers.set("Authorization", `Bearer ${state.session.token}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${API}${path}`, { ...options, headers });
    let payload = null;
    try { payload = await response.json(); } catch { payload = {}; }
    if (response.status === 401 || response.status === 403 && /token|autent/i.test(payload?.message || "")) {
      redirectLogin();
      throw new Error("Sessão expirada.");
    }
    if (!response.ok) throw new Error(payload?.message || `Não foi possível concluir a operação (${response.status}).`);
    return payload;
  }

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const date = (value) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
  const firstLetter = (value) => String(value || "A").trim().charAt(0).toUpperCase();
  const valueOrEmpty = (value) => value === null || value === undefined ? "" : value;

  function toast(message, error = false) {
    toastElement.textContent = message;
    toastElement.className = `toast show${error ? " error" : ""}`;
    clearTimeout(toastElement.timer);
    toastElement.timer = setTimeout(() => { toastElement.className = "toast"; }, 3600);
  }

  function loading(label = "Carregando...") {
    view.innerHTML = `<div class="loading-card"><span class="spinner"></span>${escapeHtml(label)}</div>`;
  }

  function empty(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => modalBody.querySelector("input,select,textarea,button")?.focus(), 30);
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
    document.body.style.overflow = "";
  }

  function setActiveNav(viewName) {
    const active = viewName === "product-editor" ? "products" : viewName;
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === active);
    });
    document.getElementById("pageTitle").textContent = titles[viewName] || "Administração";
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("menuButton").setAttribute("aria-expanded", "false");
  }

  async function navigate(viewName, data) {
    state.view = viewName;
    setActiveNav(viewName);
    try {
      if (viewName === "dashboard") await renderDashboard();
      else if (viewName === "pdv") await renderPdv();
      else if (viewName === "products") await renderProducts();
      else if (viewName === "product-editor") await renderProductEditor(data);
      else if (viewName === "orders") await renderOrders();
      else if (viewName === "customers") await renderCustomers();
      else if (viewName === "freight") await renderFreight();
      else if (viewName === "machines") await renderMachines();
      else if (viewName === "labels") await renderLabels();
      else if (viewName === "settings") await renderSettings();
      else if (viewName === "team") await renderTeam();
    } catch (error) {
      view.innerHTML = `<div class="empty-state"><strong>Não foi possível abrir esta área.</strong><p>${escapeHtml(error.message)}</p><button class="btn secondary" data-action="retry">Tentar novamente</button></div>`;
      toast(error.message, true);
    }
  }

  async function safe(path) {
    try { return await request(path); } catch { return []; }
  }

  async function renderDashboard() {
    loading("Atualizando os dados da loja...");
    const [products, orders, customers, freight] = await Promise.all([
      safe("/produtos?status=todos"), safe("/pedidos-site"), safe("/clientes"), safe("/fretes-bairro"),
    ]);
    state.products = products; state.orders = orders; state.customers = customers; state.freight = freight;
    const activeProducts = products.filter((item) => item.ativo).length;
    const lowStock = products.filter((item) => Number(item.estoque_total) <= 3).length;
    const pendingOrders = orders.filter((item) => item.status_pagamento !== "pago" && item.status_pagamento !== "cancelado").length;
    const paidTotal = orders.filter((item) => item.status_pagamento === "pago").reduce((sum, item) => sum + Number(item.total || 0), 0);
    const recent = orders.slice(0, 6);
    view.innerHTML = `
      <div class="cards">
        <article class="card metric accent"><small>Vendas pagas no site</small><strong>${money(paidTotal)}</strong></article>
        <article class="card metric"><small>Produtos ativos</small><strong>${activeProducts}</strong></article>
        <article class="card metric"><small>Pedidos pendentes</small><strong>${pendingOrders}</strong></article>
        <article class="card metric"><small>Clientes cadastrados</small><strong>${customers.length}</strong></article>
        <article class="card metric"><small>Estoque baixo</small><strong>${lowStock}</strong></article>
      </div>
      <div class="grid-two">
        <section class="card">
          <h2>Pedidos recentes</h2>
          ${recent.length ? `<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pagamento</th></tr></thead><tbody>
            ${recent.map((item) => `<tr><td>#${item.id}</td><td>${escapeHtml(item.cliente || "Cliente")}</td><td>${money(item.total)}</td><td><span class="badge ${item.status_pagamento === "pago" ? "" : "pending"}">${escapeHtml(item.status_pagamento || "pendente")}</span></td></tr>`).join("")}
          </tbody></table></div>` : empty("Ainda não há pedidos feitos pelo site.")}
        </section>
        <section class="card">
          <h2>Ações rápidas</h2>
          <div class="quick-actions">
            <button data-action="new-product">＋ Cadastrar produto</button>
            <button data-nav="orders">Acompanhar pedidos</button>
            <button data-nav="settings">Editar textos do site</button>
            <button data-nav="freight">Configurar entregas</button>
          </div>
        </section>
      </div>`;
  }

  function pdvUnitPrice(product, variation) {
    return Number(variation.preco_promocional ?? variation.preco_venda ?? product.preco_promocional ?? product.preco ?? 0);
  }

  function pdvTotals() {
    const subtotal = state.pdvCart.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
    const discount = Math.max(0, Number(document.querySelector('[name="pdv_desconto"]')?.value || 0));
    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
  }

  function pdvCartHtml() {
    const totals = pdvTotals();
    const lines = state.pdvCart.length
      ? state.pdvCart.map((item) => `<div class="pdv-cart-line"><div><strong>${escapeHtml(item.produto)}</strong><small>${escapeHtml(item.tamanho)} · ${escapeHtml(item.cor)}</small></div><div class="pdv-quantity"><button type="button" data-action="pdv-minus" data-id="${item.variacao_id}" aria-label="Diminuir">−</button><span>${item.quantidade}</span><button type="button" data-action="pdv-plus" data-id="${item.variacao_id}" aria-label="Aumentar">＋</button></div><strong>${money(item.preco * item.quantidade)}</strong><button type="button" class="pdv-remove" data-action="pdv-remove" data-id="${item.variacao_id}" aria-label="Remover">×</button></div>`).join("")
      : `<div class="empty-state pdv-empty">Adicione produtos para iniciar a venda.</div>`;
    return `${lines}<div class="pdv-totals"><span>Subtotal <strong>${money(totals.subtotal)}</strong></span><span>Desconto <strong>${money(totals.discount)}</strong></span><span class="pdv-total">Total <strong>${money(totals.total)}</strong></span></div>`;
  }

  function updatePdvCart() {
    const cart = document.getElementById("pdvCart");
    if (cart) cart.innerHTML = pdvCartHtml();
    const submit = document.querySelector('[data-form="pdv-sale"] button[type="submit"], [data-form="pdv-sale"] button:not([type])');
    if (submit) submit.disabled = !state.pdvCart.length;
  }

  function cashHistoryHtml() {
    return `<section class="section pdv-history"><div class="section-heading"><h2>Histórico de caixas</h2><span class="muted">Últimos ${state.cashHistory.length} registros</span></div>${state.cashHistory.length ? `<div class="table-wrap"><table><thead><tr><th>Caixa</th><th>Abertura</th><th>Fechamento</th><th>Responsável</th><th>Total sistema</th><th>Total informado</th><th>Diferença</th><th>Status</th><th>Ações</th></tr></thead><tbody>${state.cashHistory.map((item) => `<tr><td><strong>#${item.id}</strong></td><td>${date(item.data_abertura)}</td><td>${item.data_fechamento ? date(item.data_fechamento) : "—"}</td><td>${escapeHtml(item.usuario_abertura || "—")}</td><td>${money(item.total_sistema)}</td><td>${item.status === "fechado" ? money(item.total_informado) : "—"}</td><td>${item.status === "fechado" ? money(item.divergencia) : "—"}</td><td><span class="badge ${item.status === "aberto" ? "pending" : ""}">${escapeHtml(item.status)}</span></td><td><div class="actions"><button class="btn secondary small" data-action="cash-details" data-id="${item.id}">Detalhes</button><button class="btn secondary small" data-action="edit-cash" data-id="${item.id}">Editar</button><button class="btn secondary small" data-action="delete-cash" data-id="${item.id}">Excluir</button></div></td></tr>`).join("")}</tbody></table></div>` : empty("Nenhum histórico de caixa encontrado.")}</section>`;
  }

  async function renderPdv() {
    loading("Preparando o frente de caixa...");
    const [products, cash, machines, customers, cashHistory] = await Promise.all([
      request("/produtos?status=ativos"), request("/caixas/aberto"), request("/maquininhas"), request("/clientes"), request("/caixas"),
    ]);
    state.pdvProducts = products.filter((item) => item.ativo && Number(item.estoque_total) > 0);
    state.pdvCash = cash;
    state.machines = machines.filter((item) => item.ativo);
    state.customers = customers;
    state.cashHistory = cashHistory;
    if (!cash) {
      view.innerHTML = `<section class="section pdv-open"><h2>Abrir caixa</h2><p class="muted">Informe o valor disponível em dinheiro antes de começar as vendas.</p><form data-form="pdv-open-cash"><div class="field-grid"><div class="field"><label>Valor inicial (R$)</label><input name="valor_inicial" type="number" min="0" step="0.01" value="0" required></div><div class="field"><label>Observação</label><input name="observacoes_abertura" maxlength="500" placeholder="Opcional"></div></div><div class="form-actions"><button class="btn">Abrir caixa e iniciar PDV</button></div></form></section>${cashHistoryHtml()}`;
      return;
    }
    const productCards = state.pdvProducts.flatMap((product) => (product.variacoes || [])
      .filter((variation) => variation.ativo !== false && Number(variation.quantidade_estoque) > 0)
      .map((variation) => `<button type="button" class="pdv-product" data-action="pdv-add" data-id="${variation.id}" data-search="${escapeHtml(`${product.nome} ${product.categoria} ${variation.tamanho} ${variation.cor} ${variation.sku || ""} ${variation.codigo_barras || ""}`.toLowerCase())}"><strong>${escapeHtml(product.nome)}</strong><span>${escapeHtml(variation.tamanho)} · ${escapeHtml(variation.cor)}</span><small>${Number(variation.quantidade_estoque)} em estoque</small><b>${money(pdvUnitPrice(product, variation))}</b></button>`)).join("");
    view.innerHTML = `<div class="pdv-status"><div><span class="badge">Caixa #${cash.id} aberto</span><span>Inicial: <strong>${money(cash.valor_inicial)}</strong></span></div><button type="button" class="btn danger small" data-action="pdv-close-cash">Fechar caixa</button></div><div class="pdv-layout"><section class="section pdv-catalog"><div class="section-heading"><h2>Produtos</h2><span class="muted">${state.pdvProducts.length} produto(s)</span></div><div class="field"><label for="pdvSearch">Buscar por nome, tamanho, cor ou código</label><input id="pdvSearch" name="pdv_busca" type="search" autocomplete="off" placeholder="Digite para buscar..."></div><div id="pdvProducts" class="pdv-products">${productCards || empty("Nenhum produto com estoque disponível.")}</div></section><section class="section pdv-checkout"><h2>Venda atual</h2><div id="pdvCart">${pdvCartHtml()}</div><form data-form="pdv-sale"><div class="field-grid"><div class="field full"><label>Cliente (opcional)</label><select name="cliente_id"><option value="">Consumidor não identificado</option>${customers.map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}${item.telefone ? ` — ${escapeHtml(item.telefone)}` : ""}</option>`).join("")}</select></div><div class="field"><label>Desconto (R$)</label><input name="pdv_desconto" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Pagamento</label><select name="forma_pagamento" required><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option></select></div><div class="field full"><label>Maquininha (cartões)</label><select name="maquininha_id"><option value="">Nenhuma</option>${state.machines.map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join("")}</select></div></div><div class="form-actions pdv-actions"><button type="button" class="btn secondary" data-action="pdv-clear">Limpar</button><button class="btn" ${state.pdvCart.length ? "" : "disabled"}>Finalizar venda</button></div></form></section></div>${cashHistoryHtml()}`;
  }

  function findPdvVariation(variationId) {
    for (const product of state.pdvProducts) {
      const variation = (product.variacoes || []).find((item) => item.id === variationId);
      if (variation) return { product, variation };
    }
    return null;
  }

  function changePdvItem(variationId, change) {
    const found = findPdvVariation(variationId);
    if (!found) return;
    const current = state.pdvCart.find((item) => item.variacao_id === variationId);
    if (!current && change > 0) state.pdvCart.push({ produto_id: found.product.id, variacao_id: variationId, produto: found.product.nome, tamanho: found.variation.tamanho, cor: found.variation.cor, preco: pdvUnitPrice(found.product, found.variation), quantidade: 1, estoque: Number(found.variation.quantidade_estoque) });
    else if (current) current.quantidade = Math.max(0, Math.min(current.estoque, current.quantidade + change));
    state.pdvCart = state.pdvCart.filter((item) => item.quantidade > 0);
    updatePdvCart();
  }

  function productImage(product) {
    const media = (product.midias || []).find((item) => item.tipo === "imagem") || product.midias?.[0];
    if (media?.url) return `<img class="thumb" src="${escapeHtml(media.url)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="thumb thumb-fallback" style="display:none">${escapeHtml(firstLetter(product.nome))}</span>`;
    return `<span class="thumb thumb-fallback">${escapeHtml(firstLetter(product.nome))}</span>`;
  }

  async function loadProducts() {
    [state.products, state.categories] = await Promise.all([
      request("/produtos?status=todos"), request("/produtos/categorias"),
    ]);
  }

  async function renderProducts() {
    loading("Carregando catálogo...");
    await loadProducts();
    view.innerHTML = `
      <div class="page-actions">
        <div><strong>${state.products.length} produtos cadastrados</strong><p>Cadastre peças, estoque, fotos e vídeos no mesmo lugar.</p></div>
        <div class="button-row"><button class="btn secondary" data-action="categories">Categorias</button><button class="btn" data-action="new-product">＋ Novo produto</button></div>
      </div>
      ${state.products.length ? `<div class="table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        ${state.products.map((product) => `<tr>
          <td><div class="product-cell">${productImage(product)}<div><strong>${escapeHtml(product.nome)}</strong><div class="muted">${(product.variacoes || []).length} variação(ões) · ${(product.midias || []).length} mídia(s)</div></div></div></td>
          <td>${escapeHtml(product.categoria)}</td><td>${money(product.preco_promocional || product.preco)}</td><td>${Number(product.estoque_total || 0)}</td>
          <td><span class="badge ${product.ativo ? "" : "inactive"}">${product.ativo ? "Ativo" : "Arquivado"}</span></td>
          <td><div class="actions"><button class="btn small" data-action="edit-product" data-id="${product.id}">Gerenciar</button>${product.ativo ? `<button class="btn secondary small" data-action="archive-product" data-id="${product.id}">Arquivar</button>` : `<button class="btn secondary small" data-action="restore-product" data-id="${product.id}">Restaurar</button>`}<button class="btn secondary small" data-action="delete-product" data-id="${product.id}">Excluir</button></div></td>
        </tr>`).join("")}
      </tbody></table></div>` : empty("Nenhum produto cadastrado. Use “Novo produto” para começar.")}`;
  }

  function categoryOptions(selected = "") {
    const names = [...new Set([...state.categories.filter((item) => item.ativo).map((item) => item.nome), selected].filter(Boolean))];
    return names.map((name) => `<option value="${escapeHtml(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`).join("");
  }

  function productForm(product = null) {
    return `<form data-form="product" data-id="${product?.id || ""}">
      <div class="field-grid">
        <div class="field full"><label for="productName">Nome da peça</label><input id="productName" name="nome" required maxlength="140" value="${escapeHtml(product?.nome || "")}"></div>
        <div class="field"><label>Categoria</label><select name="categoria" required><option value="">Selecione</option>${categoryOptions(product?.categoria)}</select></div>
        <div class="field"><label>Preço (R$)</label><input name="preco" type="number" min="0" step="0.01" required value="${escapeHtml(valueOrEmpty(product?.preco))}"></div>
        <div class="field"><label>Preço promocional (R$)</label><input name="preco_promocional" type="number" min="0" step="0.01" value="${escapeHtml(valueOrEmpty(product?.preco_promocional))}"></div>
        <div class="field"><label class="checkbox"><input name="ativo" type="checkbox" ${product?.ativo !== false ? "checked" : ""}> Produto visível na loja</label></div>
        <div class="field full"><label>Descrição</label><textarea name="descricao" maxlength="5000">${escapeHtml(product?.descricao || "")}</textarea></div>
        ${product ? "" : `<div class="field"><label>Tamanho inicial</label><input name="tamanho" value="Único" required></div><div class="field"><label>Cor inicial</label><input name="cor" value="Única" required></div><div class="field"><label>Estoque inicial</label><input name="estoque" type="number" min="0" step="1" value="0" required></div>`}
      </div>
      <div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn">${product ? "Salvar alterações" : "Cadastrar e adicionar fotos"}</button></div>
    </form>`;
  }

  function variationForm(variation = null) {
    return `<form data-form="variation" data-id="${variation?.id || ""}">
      <div class="field-grid">
        <div class="field"><label>Tamanho</label><input name="tamanho" required value="${escapeHtml(variation?.tamanho || "")}"></div>
        <div class="field"><label>Cor</label><input name="cor" required value="${escapeHtml(variation?.cor || "")}"></div>
        <div class="field"><label>SKU (opcional)</label><input name="sku" value="${escapeHtml(variation?.sku || "")}"></div>
        <div class="field"><label>Código de barras</label><input name="codigo_barras" value="${escapeHtml(variation?.codigo_barras || "")}"></div>
        <div class="field"><label>Preço específico (R$)</label><input name="preco_venda" type="number" min="0" step="0.01" value="${escapeHtml(valueOrEmpty(variation?.preco_venda))}"></div>
        <div class="field"><label>Preço promocional (R$)</label><input name="preco_promocional" type="number" min="0" step="0.01" value="${escapeHtml(valueOrEmpty(variation?.preco_promocional))}"></div>
        <div class="field"><label>Quantidade em estoque</label><input name="quantidade_estoque" type="number" min="0" step="1" required value="${escapeHtml(valueOrEmpty(variation?.quantidade_estoque ?? 0))}"></div>
        <div class="field"><label>Alerta de estoque mínimo</label><input name="estoque_minimo" type="number" min="0" step="1" required value="${escapeHtml(valueOrEmpty(variation?.estoque_minimo ?? 0))}"></div>
        <div class="field full"><label class="checkbox"><input name="ativo" type="checkbox" ${variation?.ativo !== false ? "checked" : ""}> Variação ativa</label></div>
      </div>
      <div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn">Salvar variação</button></div>
    </form>`;
  }

  async function renderProductEditor(productId) {
    loading("Abrindo produto...");
    const id = Number(productId || state.product?.id);
    state.product = await request(`/produtos/${id}`);
    const product = state.product;
    const variations = product.variacoes || [];
    const media = product.midias || [];
    view.innerHTML = `
      <div class="page-actions"><div><button class="btn secondary small" data-nav="products">← Voltar aos produtos</button><p>Produto #${product.id}</p></div><span class="badge ${product.ativo ? "" : "inactive"}">${product.ativo ? "Visível na loja" : "Arquivado"}</span></div>
      <section class="section"><div class="section-heading"><h2>Dados do produto</h2><button class="btn secondary small" data-action="edit-product-data">Editar dados</button></div>
        <div class="field-grid"><div><strong>${escapeHtml(product.nome)}</strong><p class="muted">${escapeHtml(product.categoria)} · ${money(product.preco_promocional || product.preco)}</p></div><div><strong>${Number(product.estoque_total || 0)} unidade(s)</strong><p class="muted">Estoque total de todas as variações</p></div><div class="field full help">${escapeHtml(product.descricao || "Sem descrição cadastrada.")}</div></div>
      </section>
      <section class="section"><div class="section-heading"><h2>Variações e estoque</h2><button class="btn small" data-action="new-variation">＋ Adicionar variação</button></div>
        ${variations.length ? `<div class="table-wrap"><table><thead><tr><th>Tamanho</th><th>Cor</th><th>SKU</th><th>Estoque</th><th>Preço</th><th>Ações</th></tr></thead><tbody>${variations.map((item) => `<tr><td>${escapeHtml(item.tamanho)}</td><td>${escapeHtml(item.cor)}</td><td>${escapeHtml(item.sku || "—")}</td><td>${Number(item.quantidade_estoque || 0)}</td><td>${item.preco_venda == null ? "Preço do produto" : money(item.preco_venda)}</td><td><div class="actions"><button class="btn secondary small" data-action="edit-variation" data-id="${item.id}">Editar</button><button class="btn secondary small" data-action="delete-variation" data-id="${item.id}">Remover</button></div></td></tr>`).join("")}</tbody></table></div>` : empty("Nenhuma variação cadastrada.")}
      </section>
      <section class="section"><div class="section-heading"><h2>Fotos e vídeos</h2><span class="muted">Até 12 arquivos por envio</span></div>
        <form class="upload-zone" data-form="upload"><input name="arquivos" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple required><small>Imagens: JPG, PNG ou WEBP (até 10 MB). Vídeos: MP4, MOV ou WEBM. A primeira imagem vira a capa.</small><div class="form-actions"><button class="btn">Enviar arquivos</button></div></form>
        <div style="height:14px"></div>
        <form data-form="media-url"><div class="field-grid"><div class="field full"><label>Ou adicione uma imagem por URL</label><input name="url" type="url" placeholder="https://..." required></div></div><div class="form-actions"><button class="btn secondary">Adicionar URL</button></div></form>
        <div style="height:18px"></div>
        ${media.length ? `<div class="media-grid">${media.map((item) => `<article class="media-card">${item.tipo === "video" ? `<video src="${escapeHtml(item.url)}" controls preload="metadata"></video>` : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt_text || product.nome)}">`}<footer>${item.principal ? `<span class="principal-label">★ Foto principal</span>` : ""}<div class="actions">${item.tipo === "imagem" && !item.principal ? `<button class="btn secondary small" data-action="main-media" data-id="${item.id}">Usar como capa</button>` : ""}<button class="btn secondary small" data-action="delete-media" data-id="${item.id}">Remover</button></div></footer></article>`).join("")}</div>` : empty("Nenhuma foto ou vídeo enviado.")}
      </section>`;
  }

  function categoriesModal() {
    openModal("Categorias de produtos", `<form data-form="category" class="field-grid"><div class="field"><label>Nova categoria</label><input name="nome" required placeholder="Ex.: Vestidos"></div><div class="field"><label>Ordem</label><input name="ordem" type="number" value="0"></div><div class="field full form-actions"><button class="btn">Adicionar categoria</button></div></form><div style="height:18px"></div>${state.categories.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Status</th><th>Ação</th></tr></thead><tbody>${state.categories.map((item) => `<tr><td>${escapeHtml(item.nome)}</td><td><span class="badge ${item.ativo ? "" : "inactive"}">${item.ativo ? "Ativa" : "Inativa"}</span></td><td><button class="btn secondary small" data-action="edit-category" data-id="${item.id}">Editar</button> ${item.ativo ? `<button class="btn secondary small" data-action="delete-category" data-id="${item.id}">Inativar</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}`);
  }

  async function renderOrders() {
    loading("Carregando pedidos...");
    state.orders = await request("/pedidos-site");
    view.innerHTML = `<div class="page-actions"><div><strong>${state.orders.length} pedido(s) pelo site</strong><p>Confirme pagamentos e acompanhe retirada ou entrega.</p></div><button class="btn secondary" data-action="refresh">Atualizar</button></div>
      ${state.orders.length ? `<div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Entrega</th><th>Data</th><th>Ações</th></tr></thead><tbody>${state.orders.map((item) => `<tr>
        <td><strong>#${item.id}</strong><div class="muted">${escapeHtml(item.tipo_entrega || "retirada")}</div></td><td>${escapeHtml(item.cliente || "Cliente")}<div class="muted">${escapeHtml(item.telefone || "")}</div></td><td>${money(item.total)}</td><td><span class="badge ${item.status_pagamento === "pago" ? "" : item.status_pagamento === "cancelado" ? "cancelado" : "pending"}">${escapeHtml(item.status_pagamento || "pendente")}</span></td>
        <td><select data-action="delivery-status" data-id="${item.id}" ${item.status === "cancelada" ? "disabled" : ""}>${deliveryOptions(item.status_entrega, item.tipo_entrega)}</select></td><td>${date(item.created_at)}</td>
        <td><div class="actions"><button class="btn secondary small" data-action="order-details" data-id="${item.id}">Detalhes</button>${item.status_pagamento !== "pago" && item.status_pagamento !== "cancelado" ? `<button class="btn small" data-action="pay-order" data-id="${item.id}">Confirmar pagamento</button>` : ""}${item.status !== "cancelada" ? `<button class="btn secondary small" data-action="cancel-order" data-id="${item.id}">Cancelar</button>` : ""}</div></td>
      </tr>`).join("")}</tbody></table></div>` : empty("Ainda não há pedidos feitos pelo site.")}`;
  }

  function deliveryOptions(selected, type) {
    const values = type === "entrega_local"
      ? [["pendente","Pendente"],["separando","Separando"],["saiu_entrega","Saiu para entrega"],["entregue","Entregue"]]
      : [["sem_entrega","Pendente"],["separando","Separando"],["pronto_retirada","Pronto para retirada"],["entregue","Retirado"]];
    if (selected === "cancelado") values.push(["cancelado", "Cancelado"]);
    return values.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
  }

  async function renderCustomers() {
    loading("Carregando clientes...");
    state.customers = await request("/clientes");
    view.innerHTML = `<div class="page-actions"><div><strong>${state.customers.length} cliente(s)</strong><p>Cadastros criados na loja e no checkout.</p></div><button class="btn secondary" data-action="refresh">Atualizar</button></div>${state.customers.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Contato</th><th>CPF</th><th>Localização</th><th>Cadastro</th></tr></thead><tbody>${state.customers.map((item) => `<tr><td><strong>${escapeHtml(item.nome)}</strong></td><td>${escapeHtml(item.email || "—")}<div class="muted">${escapeHtml(item.telefone || "")}</div></td><td>${escapeHtml(item.cpf || "—")}</td><td>${escapeHtml([item.cidade,item.estado].filter(Boolean).join(" / ") || "—")}</td><td>${date(item.created_at)}</td></tr>`).join("")}</tbody></table></div>` : empty("Nenhum cliente cadastrado.")}`;
  }

  function freightForm(item = null) {
    return `<form data-form="freight" data-id="${item?.id || ""}"><div class="field-grid">
      <div class="field"><label>Bairro</label><input name="bairro" required value="${escapeHtml(item?.bairro || "")}"></div>
      <div class="field"><label>Cidade</label><input name="cidade" required value="${escapeHtml(item?.cidade || "")}"></div>
      <div class="field"><label>Estado</label><input name="estado" required maxlength="2" value="${escapeHtml(item?.estado || "SP")}"></div>
      <div class="field"><label>Valor (R$)</label><input name="valor" type="number" min="0" step="0.01" required value="${escapeHtml(valueOrEmpty(item?.valor))}"></div>
      <div class="field full"><label>Prazo estimado</label><input name="prazo_estimado" placeholder="Ex.: 1 a 2 dias úteis" value="${escapeHtml(item?.prazo_estimado || "")}"></div>
      <div class="field full"><label>Observações internas</label><textarea name="observacoes">${escapeHtml(item?.observacoes || "")}</textarea></div>
      <div class="field full"><label class="checkbox"><input name="ativo" type="checkbox" ${item?.ativo !== false ? "checked" : ""}> Entrega ativa para este bairro</label></div>
    </div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn">Salvar frete</button></div></form>`;
  }

  async function renderFreight() {
    loading("Carregando regiões de entrega...");
    state.freight = await request("/fretes-bairro");
    view.innerHTML = `<div class="page-actions"><div><strong>${state.freight.length} região(ões) configurada(s)</strong><p>Valores usados no cálculo da entrega local.</p></div><button class="btn" data-action="new-freight">＋ Novo bairro</button></div>${state.freight.length ? `<div class="table-wrap"><table><thead><tr><th>Bairro</th><th>Cidade/UF</th><th>Valor</th><th>Prazo</th><th>Status</th><th>Ações</th></tr></thead><tbody>${state.freight.map((item) => `<tr><td><strong>${escapeHtml(item.bairro)}</strong></td><td>${escapeHtml(item.cidade)} / ${escapeHtml(item.estado)}</td><td>${money(item.valor)}</td><td>${escapeHtml(item.prazo_estimado || "—")}</td><td><span class="badge ${item.ativo ? "" : "inactive"}">${item.ativo ? "Ativo" : "Inativo"}</span></td><td><div class="actions"><button class="btn secondary small" data-action="edit-freight" data-id="${item.id}">Editar</button>${item.ativo ? `<button class="btn secondary small" data-action="delete-freight" data-id="${item.id}">Desativar</button>` : ""}</div></td></tr>`).join("")}</tbody></table></div>` : empty("Nenhum bairro configurado para entrega local.")}`;
  }

  function machineForm(item = null) {
    const selected = (value, expected) => value === expected ? "selected" : "";
    return `<form data-form="machine" data-id="${item?.id || ""}"><div class="field-grid"><div class="field"><label>Nome da maquininha</label><input name="nome" maxlength="120" required value="${escapeHtml(item?.nome || "")}" placeholder="Ex.: Maquininha Balcão 1"></div><div class="field"><label>Uso</label><select name="tipo"><option value="loja" ${selected(item?.tipo || "loja", "loja")}>Loja</option><option value="motoboy" ${selected(item?.tipo, "motoboy")}>Motoboy</option><option value="outro" ${selected(item?.tipo, "outro")}>Outro</option></select></div><div class="field"><label>Provedor de pagamento</label><select name="provedor_pagamento"><option value="manual" ${selected(item?.provedor_pagamento || "manual", "manual")}>Manual / não integrada</option><option value="mercado_pago" ${selected(item?.provedor_pagamento, "mercado_pago")}>Mercado Pago</option></select></div><div class="field"><label>Código externo</label><input name="codigo_externo" maxlength="120" value="${escapeHtml(item?.codigo_externo || "")}" placeholder="Código no provedor"></div><div class="field"><label>Mercado Pago POS ID</label><input name="mercado_pago_pos_id" maxlength="160" value="${escapeHtml(item?.mercado_pago_pos_id || "")}"></div><div class="field"><label>Mercado Pago Store ID</label><input name="mercado_pago_store_id" maxlength="160" value="${escapeHtml(item?.mercado_pago_store_id || "")}"></div><div class="field"><label>Código no PDV</label><input name="pdv_codigo" maxlength="100" value="${escapeHtml(item?.pdv_codigo || "")}" placeholder="Ex.: BALCAO-01"></div><div class="field"><label>Tipo de terminal</label><input name="terminal_tipo" maxlength="100" value="${escapeHtml(item?.terminal_tipo || "")}" placeholder="Ex.: Point Smart"></div><div class="field"><label>Ordem de exibição</label><input name="ordem_exibicao" type="number" step="1" value="${Number(item?.ordem_exibicao || 0)}"></div><div class="field"><label>PIN administrativo</label><input name="admin_pin" type="password" inputmode="numeric" autocomplete="off" required placeholder="Obrigatório para salvar"></div><div class="field full"><label>Observações</label><textarea name="observacoes" maxlength="1000">${escapeHtml(item?.observacoes || "")}</textarea></div><div class="field full"><label class="checkbox"><input name="mercado_pago_integrada" type="checkbox" ${item?.mercado_pago_integrada ? "checked" : ""}> Integração Mercado Pago habilitada</label></div><div class="field full"><label class="checkbox"><input name="ativo" type="checkbox" ${item?.ativo !== false ? "checked" : ""}> Maquininha ativa no PDV</label></div><div class="field full help">O PIN administrativo é validado pelo servidor e não fica salvo no navegador.</div></div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn">${item ? "Salvar alterações" : "Cadastrar maquininha"}</button></div></form>`;
  }

  async function renderMachines() {
    loading("Carregando maquininhas...");
    state.machines = await request("/maquininhas");
    view.innerHTML = `<div class="page-actions"><div><strong>${state.machines.length} maquininha(s) cadastrada(s)</strong><p>Configure os terminais disponíveis no PDV e a integração com o Mercado Pago.</p></div><button class="btn" data-action="new-machine">＋ Nova maquininha</button></div>${state.machines.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Uso</th><th>Provedor</th><th>Código PDV</th><th>Terminal</th><th>Integração</th><th>Status</th><th>Ações</th></tr></thead><tbody>${state.machines.map((item) => `<tr><td><strong>${escapeHtml(item.nome)}</strong><div class="muted">${escapeHtml(item.codigo_externo || "Sem código externo")}</div></td><td>${escapeHtml(item.tipo || "loja")}</td><td>${escapeHtml(item.provedor_pagamento || "manual")}</td><td>${escapeHtml(item.pdv_codigo || "—")}</td><td>${escapeHtml(item.terminal_tipo || "—")}</td><td><span class="badge ${item.mercado_pago_integrada ? "" : "inactive"}">${item.mercado_pago_integrada ? "Mercado Pago" : "Manual"}</span></td><td><span class="badge ${item.ativo ? "" : "inactive"}">${item.ativo ? "Ativa" : "Inativa"}</span></td><td><div class="actions"><button class="btn secondary small" data-action="edit-machine" data-id="${item.id}">Editar</button>${item.ativo ? `<button class="btn secondary small" data-action="disable-machine" data-id="${item.id}">Desativar</button>` : ""}</div></td></tr>`).join("")}</tbody></table></div>` : empty("Nenhuma maquininha cadastrada.")}`;
  }

  function disableMachineForm(item) {
    return `<form data-form="disable-machine" data-id="${item.id}"><p>Desativar <strong>${escapeHtml(item.nome)}</strong>? Ela deixará de aparecer no PDV, mas o histórico de vendas será preservado.</p><div style="height:16px"></div><div class="field"><label>PIN administrativo</label><input name="admin_pin" type="password" inputmode="numeric" autocomplete="off" required></div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn danger">Desativar maquininha</button></div></form>`;
  }

  async function renderLabels() {
    loading("Carregando produtos para etiquetas...");
    state.labelProducts = await request("/produtos?status=ativos");
    const rows = state.labelProducts.flatMap((product) => (product.variacoes || []).filter((variation) => variation.ativo !== false).map((variation) => ({ product, variation })));
    view.innerHTML = `<div class="page-actions"><div><strong>${rows.length} variação(ões) disponíveis</strong></div><button class="btn secondary" data-action="generate-label-codes">Padronizar códigos</button></div><form data-form="print-labels"><section class="section"><div class="label-toolbar"><label class="checkbox"><input id="labelSelectAll" type="checkbox"> Selecionar todas</label><div class="field"><label>Tamanho da etiqueta</label><select name="label_size"><option value="40x30">40 × 30 mm</option><option value="50x30">50 × 30 mm</option><option value="60x40">60 × 40 mm</option></select></div><label class="checkbox"><input name="show_price" type="checkbox" checked> Mostrar preço</label><button class="btn">Imprimir selecionadas</button></div></section>${rows.length ? `<div class="table-wrap"><table><thead><tr><th></th><th>Produto</th><th>Variação</th><th>SKU</th><th>Código de barras</th><th>Preço</th><th>Estoque</th><th>Cópias</th></tr></thead><tbody>${rows.map(({ product, variation }) => `<tr><td><input class="label-select" type="checkbox" name="variation_id" value="${variation.id}"></td><td><strong>${escapeHtml(product.nome)}</strong><div class="muted">${escapeHtml(product.categoria)}</div></td><td>${escapeHtml(variation.tamanho)} / ${escapeHtml(variation.cor)}</td><td>${escapeHtml(variation.sku || "—")}</td><td><code>${escapeHtml(variation.codigo_barras || "Sem código")}</code></td><td>${money(pdvUnitPrice(product, variation))}</td><td>${Number(variation.quantidade_estoque || 0)}</td><td><input class="label-copy-count" data-id="${variation.id}" type="number" min="1" max="100" step="1" value="1" aria-label="Quantidade de cópias"></td></tr>`).join("")}</tbody></table></div>` : empty("Nenhuma variação ativa disponível para etiquetas.")}</form>`;
  }

  const code39Patterns = { "0":"nnnwwnwnn", "1":"wnnwnnnnw", "2":"nnwwnnnnw", "3":"wnwwnnnnn", "4":"nnnwwnnnw", "5":"wnnwwnnnn", "6":"nnwwwnnnn", "7":"nnnwnnwnw", "8":"wnnwnnwnn", "9":"nnwwnnwnn", "F":"nnwnwwnnn", "G":"nnnnnwwnw", "*":"nwnnwnwnn" };

  function barcodeSvg(value) {
    const code = String(value || "").toUpperCase();
    if (![...code].every((char) => code39Patterns[char])) return `<div class="barcode-fallback">${escapeHtml(code)}</div>`;
    let x = 0; const bars = [];
    for (const char of `*${code}*`) {
      [...code39Patterns[char]].forEach((width, index) => { const size = width === "w" ? 5 : 2; if (index % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${size}" height="38"/>`); x += size; });
      x += 2;
    }
    return `<svg class="barcode" viewBox="0 0 ${x} 38" preserveAspectRatio="none" aria-label="Código ${escapeHtml(code)}">${bars.join("")}</svg>`;
  }

  function labelItem(variationId) {
    for (const product of state.labelProducts) {
      const variation = (product.variacoes || []).find((item) => item.id === variationId);
      if (variation) return { product, variation };
    }
    return null;
  }

  async function submitPrintLabels(form) {
    const selected = [...form.querySelectorAll('.label-select:checked')];
    if (!selected.length) throw new Error("Selecione ao menos uma variação para imprimir.");
    const labels = [];
    for (const input of selected) {
      const item = labelItem(Number(input.value));
      if (!item) continue;
      if (!item.variation.codigo_barras) throw new Error(`A variação ${item.product.nome} — ${item.variation.tamanho}/${item.variation.cor} ainda não possui código de barras.`);
      const copies = Math.min(100, Math.max(1, Number(form.querySelector(`.label-copy-count[data-id="${item.variation.id}"]`)?.value || 1)));
      for (let index = 0; index < copies; index += 1) labels.push(item);
    }
    if (labels.length > 500) throw new Error("Imprima no máximo 500 etiquetas por vez.");
    const [width, height] = form.elements.label_size.value.split("x").map(Number);
    const showPrice = form.elements.show_price.checked;
    const popup = window.open("", "_blank");
    if (!popup) throw new Error("O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.");
    const content = labels.map(({ product, variation }) => `<article class="label"><strong>${escapeHtml(product.nome)}</strong><span>${escapeHtml(variation.tamanho)} · ${escapeHtml(variation.cor)}</span>${barcodeSvg(variation.codigo_barras)}<code>${escapeHtml(variation.codigo_barras)}</code>${showPrice ? `<b>${money(pdvUnitPrice(product, variation))}</b>` : ""}</article>`).join("");
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Etiquetas Gisele Flávia</title><style>@page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.label{width:${width}mm;height:${height}mm;padding:2.2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;page-break-after:always;overflow:hidden;text-align:center}.label strong{max-width:100%;font-size:${height <= 30 ? 9 : 11}pt;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.label span{font-size:7pt;margin-top:1mm}.barcode{width:90%;height:${height <= 30 ? 9 : 14}mm;margin-top:1mm;fill:#000}.label code{font:7pt monospace;letter-spacing:.4mm}.label b{font-size:${height <= 30 ? 9 : 11}pt;margin-top:.5mm}.barcode-fallback{font:9pt monospace;margin:2mm 0}@media screen{body{background:#ddd}.label{background:#fff;margin:4mm auto;box-shadow:0 1mm 4mm #999}}@media print{.label{margin:0;box-shadow:none}}</style></head><body>${content}<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);
    popup.document.close();
  }

  async function renderSettings() {
    loading("Carregando dados do site...");
    state.settings = await request("/configuracoes-site");
    const s = state.settings;
    view.innerHTML = `<section class="section"><div class="section-heading"><h2>Conteúdo da loja</h2><a class="btn secondary small" href="/" target="_blank" rel="noreferrer">Abrir site</a></div>
      <form data-form="settings"><div class="field-grid">
        <div class="field full"><label>Mensagem da faixa superior</label><input name="faixa_superior" maxlength="180" required value="${escapeHtml(s.faixa_superior)}"><div id="topbarPreview" class="settings-preview">${escapeHtml(s.faixa_superior)}</div></div>
        <div class="field full"><label>Título principal da home</label><input name="hero_titulo" maxlength="120" required value="${escapeHtml(s.hero_titulo)}"></div>
        <div class="field full"><label>Texto abaixo do título</label><textarea name="hero_subtitulo" maxlength="240" required>${escapeHtml(s.hero_subtitulo)}</textarea></div>
        <div class="field"><label>Instagram</label><input name="instagram_usuario" required value="@${escapeHtml(s.instagram_usuario)}"></div>
        <div class="field"><label>Frete grátis acima de (R$)</label><input name="frete_gratis_minimo" type="number" min="0" step="0.01" required value="${escapeHtml(s.frete_gratis_minimo)}"></div>
        <div class="field"><label>Parcelas sem juros</label><input name="parcelas_sem_juros" type="number" min="1" max="24" step="1" required value="${escapeHtml(s.parcelas_sem_juros)}"></div>
        <div class="field full help">Depois de salvar, os textos e o Instagram são atualizados na página pública. Produtos, fotos e vídeos são administrados na área “Produtos e uploads”.</div>
      </div><div class="form-actions"><button class="btn">Salvar dados do site</button></div></form>
    </section>`;
  }

  async function renderTeam() {
    loading("Carregando equipe...");
    state.users = await request("/usuarios");
    const admins = state.users.filter((item) => ["dona", "super_admin"].includes(item.tipo));
    view.innerHTML = `<div class="page-actions"><div><strong>${admins.length} de 2 administradores cadastrados</strong><p>Uma conta protegida FourCode e uma conta administrativa adicional.</p></div>${admins.length < 2 ? `<button class="btn" data-action="new-admin">＋ Novo administrador</button>` : `<span class="badge">Limite atingido</span>`}</div>${admins.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>${admins.map((item) => `<tr><td><strong>${escapeHtml(item.nome)}</strong></td><td>${escapeHtml(item.email)}${item.protegido ? ` <span class="badge">Protegido</span>` : ""}</td><td>Administrador</td><td><span class="badge ${item.ativo ? "" : "inactive"}">${item.ativo ? "Ativo" : "Inativo"}</span></td><td>${date(item.created_at)}</td><td>${item.protegido ? "Não pode ser excluído" : `<button class="btn secondary small" data-action="delete-admin" data-id="${item.id}">Excluir</button>`}</td></tr>`).join("")}</tbody></table></div>` : empty("Nenhum administrador cadastrado.")}`;
  }

  function adminForm() {
    return `<form data-form="admin"><div class="field-grid">
      <div class="field full"><label>Nome</label><input name="nome" minlength="2" maxlength="120" required></div>
      <div class="field full"><label>E-mail</label><input name="email" type="email" maxlength="160" required></div>
      <div class="field full"><label>Senha temporária</label><input name="senha" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="field full help">O sistema permite no máximo dois administradores ativos, incluindo a conta FourCode protegida.</div>
    </div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn" type="submit">Cadastrar administrador</button></div></form>`;
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  async function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector("button[type=submit], button:not([type])");
    const original = submit?.textContent;
    if (submit) { submit.disabled = true; submit.textContent = "Salvando..."; }
    try {
      const kind = form.dataset.form;
      if (kind === "product") await submitProduct(form);
      else if (kind === "variation") await submitVariation(form);
      else if (kind === "upload") await submitUpload(form);
      else if (kind === "media-url") await submitMediaUrl(form);
      else if (kind === "category") await submitCategory(form);
      else if (kind === "freight") await submitFreight(form);
      else if (kind === "settings") await submitSettings(form);
      else if (kind === "edit-category") await submitEditCategory(form);
      else if (kind === "pay-order") await submitPayOrder(form);
      else if (kind === "admin") await submitAdmin(form);
      else if (kind === "pdv-open-cash") await submitPdvOpenCash(form);
      else if (kind === "pdv-sale") await submitPdvSale(form);
      else if (kind === "pdv-close-cash") await submitPdvCloseCash(form);
      else if (kind === "machine") await submitMachine(form);
      else if (kind === "disable-machine") await submitDisableMachine(form);
      else if (kind === "edit-cash") await submitEditCash(form);
      else if (kind === "delete-cash") await submitDeleteCash(form);
      else if (kind === "print-labels") await submitPrintLabels(form);
    } catch (error) { toast(error.message, true); }
    finally { if (submit?.isConnected) { submit.disabled = false; submit.textContent = original; } }
  }

  async function submitProduct(form) {
    const data = formObject(form);
    const id = form.dataset.id;
    const payload = { nome: data.nome, categoria: data.categoria, descricao: data.descricao, preco: Number(data.preco), preco_promocional: data.preco_promocional === "" ? null : Number(data.preco_promocional), ativo: form.elements.ativo.checked };
    if (!id) payload.variacoes = [{ tamanho: data.tamanho, cor: data.cor, quantidade_inicial: Number(data.estoque || 0), estoque_minimo: 0 }];
    const product = await request(id ? `/produtos/${id}` : "/produtos", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    closeModal(); toast(id ? "Produto atualizado." : "Produto cadastrado. Agora adicione as fotos.");
    await navigate("product-editor", id || product.id);
  }

  async function submitVariation(form) {
    const data = formObject(form); const id = form.dataset.id;
    const payload = { ...data, preco_venda: data.preco_venda === "" ? null : Number(data.preco_venda), preco_promocional: data.preco_promocional === "" ? null : Number(data.preco_promocional), quantidade_estoque: Number(data.quantidade_estoque), estoque_minimo: Number(data.estoque_minimo), ativo: form.elements.ativo.checked };
    if (!id) payload.quantidade_inicial = payload.quantidade_estoque;
    await request(`/produtos/${state.product.id}/variacoes${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    closeModal(); toast("Variação salva."); await renderProductEditor(state.product.id);
  }

  async function submitUpload(form) {
    const body = new FormData(form);
    const result = await request(`/produtos/${state.product.id}/midias/upload`, { method: "POST", body });
    toast(result.message || "Arquivos enviados."); form.reset(); await renderProductEditor(state.product.id);
  }

  async function submitMediaUrl(form) {
    const data = formObject(form);
    await request(`/produtos/${state.product.id}/midias`, { method: "POST", body: JSON.stringify({ url: data.url, alt_text: state.product.nome }) });
    toast("Imagem adicionada."); await renderProductEditor(state.product.id);
  }

  async function submitCategory(form) {
    const data = formObject(form);
    await request("/produtos/categorias", { method: "POST", body: JSON.stringify({ nome: data.nome, ordem: Number(data.ordem || 0) }) });
    state.categories = await request("/produtos/categorias"); categoriesModal(); toast("Categoria adicionada.");
  }

  async function submitFreight(form) {
    const data = formObject(form); const id = form.dataset.id;
    const payload = { ...data, estado: data.estado.toUpperCase(), valor: Number(data.valor), ativo: form.elements.ativo.checked };
    await request(`/fretes-bairro${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    closeModal(); toast("Frete salvo."); await renderFreight();
  }

  async function submitSettings(form) {
    const data = formObject(form);
    data.instagram_usuario = data.instagram_usuario.replace(/^@/, "");
    const result = await request("/configuracoes-site", { method: "PUT", body: JSON.stringify(data) });
    state.settings = result.configuracoes; toast("Dados do site atualizados."); await renderSettings();
  }

  async function submitEditCategory(form) {
    const data = formObject(form);
    const item = state.categories.find((category) => category.id === Number(form.dataset.id));
    await request(`/produtos/categorias/${form.dataset.id}`, {
      method: "PUT",
      body: JSON.stringify({ nome: data.nome, ordem: Number(data.ordem || 0), descricao: item?.descricao, ativo: form.elements.ativo.checked }),
    });
    closeModal(); toast("Categoria atualizada.");
    state.categories = await request("/produtos/categorias");
    if (state.view === "products") await renderProducts();
  }

  async function submitPayOrder(form) {
    const result = await request(`/pedidos-site/${form.dataset.id}/confirmar-pagamento`, {
      method: "POST",
      body: JSON.stringify(formObject(form)),
    });
    closeModal(); toast(result.message); await renderOrders();
  }

  async function submitAdmin(form) {
    await request("/usuarios/administradores", { method: "POST", body: JSON.stringify(formObject(form)) });
    closeModal(); toast("Administrador cadastrado."); await renderTeam();
  }

  async function submitPdvOpenCash(form) {
    const data = formObject(form);
    await request("/caixas/abrir", { method: "POST", body: JSON.stringify({ valor_inicial: Number(data.valor_inicial || 0), observacoes_abertura: data.observacoes_abertura || null }) });
    toast("Caixa aberto. O PDV está pronto para vender.");
    await renderPdv();
  }

  async function submitPdvSale(form) {
    if (!state.pdvCart.length) throw new Error("Adicione ao menos um produto à venda.");
    const data = formObject(form);
    const totals = pdvTotals();
    if (totals.discount > totals.subtotal) throw new Error("O desconto não pode ser maior que o subtotal.");
    if (["debito", "credito"].includes(data.forma_pagamento) && !data.maquininha_id) throw new Error("Selecione a maquininha usada no pagamento.");
    const payload = {
      cliente_id: data.cliente_id ? Number(data.cliente_id) : null,
      caixa_id: state.pdvCash.id,
      canal_venda: "loja_fisica",
      origem_venda: "pdv_admin",
      desconto: totals.discount,
      frete: 0,
      forma_pagamento: data.forma_pagamento,
      maquininha_id: data.maquininha_id ? Number(data.maquininha_id) : null,
      itens: state.pdvCart.map((item) => ({ produto_id: item.produto_id, variacao_id: item.variacao_id, quantidade: item.quantidade, preco_unitario: item.preco })),
    };
    const sale = await request("/vendas", { method: "POST", body: JSON.stringify(payload) });
    state.pdvCart = [];
    toast(`Venda #${sale.id} finalizada — ${money(sale.total)}.`);
    await renderPdv();
  }

  function openPdvCloseCash() {
    if (state.pdvCart.length && !confirm("Existe uma venda não finalizada. Deseja descartá-la e continuar com o fechamento?")) return;
    openModal(`Fechar caixa #${state.pdvCash.id}`, `<form data-form="pdv-close-cash"><p class="help">Conte o valor recebido em cada forma de pagamento. O sistema calculará automaticamente qualquer diferença.</p><div style="height:16px"></div><div class="field-grid"><div class="field"><label>Dinheiro em caixa (R$)</label><input name="dinheiro" type="number" min="0" step="0.01" required inputmode="decimal"></div><div class="field"><label>Pix recebido (R$)</label><input name="pix" type="number" min="0" step="0.01" required inputmode="decimal"></div><div class="field"><label>Débito recebido (R$)</label><input name="debito" type="number" min="0" step="0.01" required inputmode="decimal"></div><div class="field"><label>Crédito recebido (R$)</label><input name="credito" type="number" min="0" step="0.01" required inputmode="decimal"></div><div class="field full"><label>Observação do fechamento</label><textarea name="observacoes_fechamento" maxlength="1000" placeholder="Opcional"></textarea></div></div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn danger">Confirmar fechamento</button></div></form>`);
  }

  async function submitPdvCloseCash(form) {
    const data = formObject(form);
    const payload = { dinheiro: Number(data.dinheiro), pix: Number(data.pix), debito: Number(data.debito), credito: Number(data.credito), observacoes_fechamento: data.observacoes_fechamento || null };
    if (Object.values(payload).slice(0, 4).some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Informe valores válidos para fechar o caixa.");
    const cash = await request(`/caixas/${state.pdvCash.id}/fechar`, { method: "POST", body: JSON.stringify(payload) });
    state.pdvCart = [];
    state.pdvCash = null;
    closeModal();
    const difference = Number(cash.divergencia || 0);
    toast(`Caixa fechado. Total informado: ${money(cash.total_informado)}${difference ? ` · Diferença: ${money(difference)}` : " · Sem diferença"}.`, difference !== 0);
    await renderPdv();
  }

  async function showCashDetails(id) {
    const detail = await request(`/caixas/${id}`);
    const cash = detail.caixa;
    openModal(`Caixa #${id}`, `<div class="field-grid"><div><strong>${escapeHtml(cash.status)}</strong><p class="muted">Aberto em ${date(cash.data_abertura)}</p></div><div><strong>${money(cash.valor_inicial)}</strong><p class="muted">Valor inicial</p></div></div><div style="height:16px"></div><div class="cards cash-detail-cards"><article class="card metric"><small>Total do sistema</small><strong>${money(detail.totais.sistema.total)}</strong></article><article class="card metric"><small>Total informado</small><strong>${cash.status === "fechado" ? money(detail.totais.informado.total) : "—"}</strong></article><article class="card metric ${Number(detail.totais.divergencia) ? "cash-difference" : ""}"><small>Diferença</small><strong>${cash.status === "fechado" ? money(detail.totais.divergencia) : "—"}</strong></article></div><div style="height:18px"></div><h3>Movimentações</h3><div style="height:10px"></div>${detail.movimentacoes.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Forma</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>${detail.movimentacoes.map((item) => `<tr><td>${date(item.created_at)}</td><td>${escapeHtml(item.tipo)}</td><td>${escapeHtml(item.forma_pagamento || "—")}</td><td>${escapeHtml(item.descricao || "—")}</td><td>${money(item.valor)}</td></tr>`).join("")}</tbody></table></div>` : empty("Nenhuma movimentação registrada.")}`);
  }

  async function openEditCash(id) {
    const detail = await request(`/caixas/${id}`);
    const cash = detail.caixa;
    const closedFields = cash.status === "fechado" ? `<div class="field"><label>Dinheiro informado (R$)</label><input name="dinheiro" type="number" min="0" step="0.01" required value="${Number(cash.valor_informado_dinheiro || 0)}"></div><div class="field"><label>Pix informado (R$)</label><input name="pix" type="number" min="0" step="0.01" required value="${Number(cash.valor_informado_pix || 0)}"></div><div class="field"><label>Débito informado (R$)</label><input name="debito" type="number" min="0" step="0.01" required value="${Number(cash.valor_informado_debito || 0)}"></div><div class="field"><label>Crédito informado (R$)</label><input name="credito" type="number" min="0" step="0.01" required value="${Number(cash.valor_informado_credito || 0)}"></div><div class="field full"><label>Observação do fechamento</label><textarea name="observacoes_fechamento" maxlength="1000">${escapeHtml(cash.observacoes_fechamento || "")}</textarea></div>` : "";
    openModal(`Editar caixa #${id}`, `<form data-form="edit-cash" data-id="${id}"><div class="field-grid"><div class="field"><label>Valor inicial (R$)</label><input name="valor_inicial" type="number" min="0" step="0.01" required value="${Number(cash.valor_inicial || 0)}"></div><div class="field"><label>PIN administrativo</label><input name="admin_pin" type="password" inputmode="numeric" autocomplete="off" required></div><div class="field full"><label>Observação da abertura</label><textarea name="observacoes_abertura" maxlength="1000">${escapeHtml(cash.observacoes_abertura || "")}</textarea></div>${closedFields}<div class="field full help">Os totais do sistema e a divergência serão recalculados automaticamente. Vendas e movimentações não serão alteradas.</div></div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn">Salvar histórico</button></div></form>`);
  }

  async function submitEditCash(form) {
    const data = formObject(form);
    const pin = data.admin_pin;
    delete data.admin_pin;
    const payload = { ...data, valor_inicial: Number(data.valor_inicial) };
    for (const field of ["dinheiro", "pix", "debito", "credito"]) if (data[field] !== undefined) payload[field] = Number(data[field]);
    await request(`/caixas/${form.dataset.id}`, { method: "PUT", headers: { "X-Admin-Pin": pin }, body: JSON.stringify(payload) });
    closeModal(); toast("Histórico do caixa atualizado."); await renderPdv();
  }

  function openDeleteCash(id) {
    openModal(`Excluir caixa #${id}`, `<form data-form="delete-cash" data-id="${id}"><p class="help">A exclusão só será permitida se não houver vendas vinculadas. Movimentações avulsas desse caixa também serão removidas.</p><div style="height:16px"></div><div class="field"><label>PIN administrativo</label><input name="admin_pin" type="password" inputmode="numeric" autocomplete="off" required></div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn danger">Excluir histórico</button></div></form>`);
  }

  async function submitDeleteCash(form) {
    const result = await request(`/caixas/${form.dataset.id}`, { method: "DELETE", headers: { "X-Admin-Pin": form.elements.admin_pin.value } });
    closeModal(); toast(result.message); await renderPdv();
  }

  async function submitMachine(form) {
    const data = formObject(form);
    const id = form.dataset.id;
    const pin = data.admin_pin;
    delete data.admin_pin;
    const payload = { ...data, ordem_exibicao: Number(data.ordem_exibicao || 0), ativo: form.elements.ativo.checked, mercado_pago_integrada: form.elements.mercado_pago_integrada.checked };
    await request(`/maquininhas${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: { "X-Admin-Pin": pin }, body: JSON.stringify(payload) });
    closeModal();
    toast(id ? "Maquininha atualizada." : "Maquininha cadastrada.");
    await renderMachines();
  }

  async function submitDisableMachine(form) {
    const pin = form.elements.admin_pin.value;
    await request(`/maquininhas/${form.dataset.id}`, { method: "DELETE", headers: { "X-Admin-Pin": pin } });
    closeModal();
    toast("Maquininha desativada. O histórico foi preservado.");
    await renderMachines();
  }

  async function handleClick(event) {
    const close = event.target.closest("[data-close-modal]"); if (close) { closeModal(); return; }
    const nav = event.target.closest("[data-nav]"); if (nav) { await navigate(nav.dataset.nav); return; }
    const target = event.target.closest("[data-action]"); if (!target) return;
    const action = target.dataset.action; const id = Number(target.dataset.id);
    try {
      if (action === "retry" || action === "refresh") await navigate(state.view, state.product?.id);
      else if (action === "new-product") { if (!state.categories.length) state.categories = await request("/produtos/categorias"); openModal("Cadastrar produto", productForm()); }
      else if (action === "edit-product") await navigate("product-editor", id);
      else if (action === "edit-product-data") openModal("Editar dados do produto", productForm(state.product));
      else if (action === "archive-product") await updateProductStatus(id, "arquivar");
      else if (action === "restore-product") await updateProductStatus(id, "restaurar");
      else if (action === "delete-product") await deleteProduct(id);
      else if (action === "new-variation") openModal("Adicionar variação", variationForm());
      else if (action === "edit-variation") openModal("Editar variação", variationForm(state.product.variacoes.find((item) => item.id === id)));
      else if (action === "delete-variation") await deleteVariation(id);
      else if (action === "main-media") await mainMedia(id);
      else if (action === "delete-media") await deleteMedia(id);
      else if (action === "categories") categoriesModal();
      else if (action === "edit-category") await editCategory(id);
      else if (action === "delete-category") await deleteCategory(id);
      else if (action === "order-details") await orderDetails(id);
      else if (action === "pay-order") await payOrder(id);
      else if (action === "cancel-order") await cancelOrder(id);
      else if (action === "new-freight") openModal("Novo bairro de entrega", freightForm());
      else if (action === "edit-freight") openModal("Editar frete", freightForm(state.freight.find((item) => item.id === id)));
      else if (action === "delete-freight") await deleteFreight(id);
      else if (action === "new-admin") openModal("Novo administrador", adminForm());
      else if (action === "delete-admin") await deleteAdmin(id);
      else if (action === "pdv-add" || action === "pdv-plus") changePdvItem(id, 1);
      else if (action === "pdv-minus") changePdvItem(id, -1);
      else if (action === "pdv-remove") { state.pdvCart = state.pdvCart.filter((item) => item.variacao_id !== id); updatePdvCart(); }
      else if (action === "pdv-clear") { state.pdvCart = []; updatePdvCart(); }
      else if (action === "pdv-close-cash") openPdvCloseCash();
      else if (action === "new-machine") openModal("Cadastrar maquininha", machineForm());
      else if (action === "edit-machine") openModal("Editar maquininha", machineForm(state.machines.find((item) => item.id === id)));
      else if (action === "disable-machine") openModal("Desativar maquininha", disableMachineForm(state.machines.find((item) => item.id === id)));
      else if (action === "cash-details") await showCashDetails(id);
      else if (action === "edit-cash") await openEditCash(id);
      else if (action === "delete-cash") openDeleteCash(id);
      else if (action === "generate-label-codes") {
        const result = await request("/produtos/gerar-codigos", { method: "POST", body: "{}" });
        toast(`${result.total_preenchido} código(s) gerado(s).`); await renderLabels();
      }
    } catch (error) { toast(error.message, true); }
  }

  async function updateProductStatus(id, action) {
    const result = await request(`/produtos/${id}/${action}`, { method: "PATCH" }); toast(result.message); await renderProducts();
  }

  async function deleteProduct(id) {
    if (!confirm("Excluir este produto? Se houver histórico, ele será arquivado com segurança.")) return;
    const result = await request(`/produtos/${id}`, { method: "DELETE" }); toast(result.message); await renderProducts();
  }

  async function deleteVariation(id) {
    if (!confirm("Remover esta variação?")) return;
    const result = await request(`/produtos/${state.product.id}/variacoes/${id}`, { method: "DELETE" }); toast(result.message); await renderProductEditor(state.product.id);
  }

  async function mainMedia(id) {
    const item = state.product.midias.find((media) => media.id === id);
    await request(`/produtos/${state.product.id}/midias/${id}`, { method: "PUT", body: JSON.stringify({ url: item.url, titulo: item.titulo, alt_text: item.alt_text, ordem: item.ordem, principal: true }) });
    toast("Foto principal atualizada."); await renderProductEditor(state.product.id);
  }

  async function deleteMedia(id) {
    if (!confirm("Remover esta foto ou vídeo do produto?")) return;
    const result = await request(`/produtos/${state.product.id}/midias/${id}`, { method: "DELETE" }); toast(result.message); await renderProductEditor(state.product.id);
  }

  async function editCategory(id) {
    const item = state.categories.find((category) => category.id === id);
    openModal("Editar categoria", `<form data-form="edit-category" data-id="${id}"><div class="field-grid"><div class="field full"><label>Nome</label><input name="nome" required value="${escapeHtml(item.nome)}"></div><div class="field"><label>Ordem</label><input name="ordem" type="number" value="${item.ordem || 0}"></div><div class="field"><label class="checkbox"><input name="ativo" type="checkbox" ${item.ativo ? "checked" : ""}> Categoria ativa</label></div></div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn">Salvar</button></div></form>`);
  }

  async function deleteCategory(id) {
    if (!confirm("Inativar esta categoria? Os produtos existentes não serão apagados.")) return;
    const result = await request(`/produtos/categorias/${id}`, { method: "DELETE" }); toast(result.message); state.categories = await request("/produtos/categorias"); categoriesModal();
  }

  async function orderDetails(id) {
    const item = await request(`/pedidos-site/${id}`);
    openModal(`Pedido #${id}`, `<div class="field-grid"><div><strong>${escapeHtml(item.cliente || "Cliente")}</strong><p class="muted">${escapeHtml(item.email || item.telefone || item.whatsapp || "")}</p></div><div><strong>${money(item.total)}</strong><p class="muted">${escapeHtml(item.forma_pagamento || "")}</p></div></div><div style="height:16px"></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Qtd.</th><th>Preço</th></tr></thead><tbody>${(item.itens || []).map((line) => `<tr><td>${escapeHtml(line.produto_nome)}</td><td>${line.quantidade}</td><td>${money(line.subtotal || Number(line.preco_unitario) * Number(line.quantidade))}</td></tr>`).join("")}</tbody></table></div>${item.entrega ? `<div class="help" style="margin-top:16px"><strong>Entrega:</strong> ${escapeHtml([item.entrega.endereco,item.entrega.bairro,item.entrega.cidade,item.entrega.estado].filter(Boolean).join(", "))}<br>${escapeHtml(item.entrega.observacoes || "")}</div>` : ""}`);
  }

  async function payOrder(id) {
    openModal(`Confirmar pagamento #${id}`, `<form data-form="pay-order" data-id="${id}"><div class="field-grid"><div class="field full"><label>Forma confirmada</label><select name="forma_pagamento_confirmada"><option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option></select></div><div class="field full"><label>Observação</label><textarea name="observacoes">Pagamento confirmado pelo painel administrativo</textarea></div></div><div class="form-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn">Confirmar pagamento</button></div></form>`);
  }

  async function cancelOrder(id) {
    if (!confirm(`Cancelar o pedido #${id}? O estoque será devolvido.`)) return;
    const result = await request(`/pedidos-site/${id}/cancelar`, { method: "POST", body: "{}" }); toast(result.message); await renderOrders();
  }

  async function deleteFreight(id) {
    if (!confirm("Desativar a entrega para este bairro?")) return;
    await request(`/fretes-bairro/${id}`, { method: "DELETE" }); toast("Frete desativado."); await renderFreight();
  }

  async function deleteAdmin(id) {
    if (!confirm("Excluir este administrador?")) return;
    const result = await request(`/usuarios/administradores/${id}`, { method: "DELETE" });
    toast(result.message); await renderTeam();
  }

  async function handleChange(event) {
    const select = event.target.closest('[data-action="delivery-status"]');
    if (select) {
      try { const result = await request(`/pedidos-site/${select.dataset.id}/status-entrega`, { method: "POST", body: JSON.stringify({ status_entrega: select.value }) }); toast(result.message); }
      catch (error) { toast(error.message, true); await renderOrders(); }
    }
    if (event.target.id === "labelSelectAll") document.querySelectorAll(".label-select").forEach((input) => { input.checked = event.target.checked; });
  }

  function bindEvents() {
    document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
    document.getElementById("logoutButton").addEventListener("click", logout);
    document.getElementById("menuButton").addEventListener("click", (event) => {
      const sidebar = document.getElementById("sidebar");
      const open = sidebar.classList.toggle("open");
      event.currentTarget.setAttribute("aria-expanded", String(open));
      event.currentTarget.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("change", handleChange);
    document.addEventListener("input", (event) => {
      if (event.target.name === "faixa_superior") { const preview = document.getElementById("topbarPreview"); if (preview) preview.textContent = event.target.value; }
      if (event.target.name === "pdv_desconto") updatePdvCart();
      if (event.target.name === "pdv_busca") {
        const search = event.target.value.trim().toLowerCase();
        document.querySelectorAll(".pdv-product").forEach((item) => { item.hidden = search && !item.dataset.search.includes(search); });
      }
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
  }

  async function init() {
    if (!state.session?.token) return redirectLogin();
    bindEvents();
    try {
      const me = await request("/auth/me");
      state.session.usuario = me.usuario; state.session.permissoes = me.permissoes;
      localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
      document.getElementById("userName").textContent = me.usuario.nome;
      document.getElementById("userRole").textContent = me.usuario.tipo === "super_admin" ? "Administrador geral" : me.usuario.tipo;
      document.getElementById("userInitial").textContent = firstLetter(me.usuario.nome);
      await navigate("dashboard");
    } catch (error) {
      if (String(error.message).includes("Sessão")) return;
      view.innerHTML = `<div class="empty-state"><strong>Não foi possível validar seu acesso.</strong><p>${escapeHtml(error.message)}</p><a class="btn" href="/login">Voltar ao login</a></div>`;
    }
  }

  init();
})();
