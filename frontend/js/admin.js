(function () {
  "use strict";

  const SESSION_KEY = "gisele-flavia-admin-session";
  const API = "/api";
  const titles = {
    dashboard: "Visão geral",
    products: "Produtos e uploads",
    "product-editor": "Editar produto",
    orders: "Pedidos",
    customers: "Clientes",
    freight: "Fretes por bairro",
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
      else if (viewName === "products") await renderProducts();
      else if (viewName === "product-editor") await renderProductEditor(data);
      else if (viewName === "orders") await renderOrders();
      else if (viewName === "customers") await renderCustomers();
      else if (viewName === "freight") await renderFreight();
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
    view.innerHTML = `<div class="page-actions"><div><strong>${admins.length} de 3 administradores cadastrados</strong><p>Contas com acesso total ao painel.</p></div>${admins.length < 3 ? `<button class="btn" data-action="new-admin">＋ Novo administrador</button>` : `<span class="badge">Limite atingido</span>`}</div>${admins.length ? `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>${admins.map((item) => `<tr><td><strong>${escapeHtml(item.nome)}</strong></td><td>${escapeHtml(item.email)}${item.protegido ? ` <span class="badge">Protegido</span>` : ""}</td><td>Administrador</td><td><span class="badge ${item.ativo ? "" : "inactive"}">${item.ativo ? "Ativo" : "Inativo"}</span></td><td>${date(item.created_at)}</td><td>${item.protegido ? "Não pode ser excluído" : `<button class="btn secondary small" data-action="delete-admin" data-id="${item.id}">Excluir</button>`}</td></tr>`).join("")}</tbody></table></div>` : empty("Nenhum administrador cadastrado.")}`;
  }

  function adminForm() {
    return `<form data-form="admin"><div class="field-grid">
      <div class="field full"><label>Nome</label><input name="nome" minlength="2" maxlength="120" required></div>
      <div class="field full"><label>E-mail</label><input name="email" type="email" maxlength="160" required></div>
      <div class="field full"><label>Senha temporária</label><input name="senha" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="field full help">O sistema permite no máximo três administradores ativos.</div>
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
    document.addEventListener("input", (event) => { if (event.target.name === "faixa_superior") { const preview = document.getElementById("topbarPreview"); if (preview) preview.textContent = event.target.value; } });
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
