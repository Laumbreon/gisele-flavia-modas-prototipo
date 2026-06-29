/* ============================================================
   Gisele Flávia Modas — Boutique Feminina
   JavaScript puro (sem frameworks, sem backend, sem APIs)
   ============================================================ */

/* ----------------- DADOS MOCKADOS ----------------- */
const TAMANHOS = ["Único", "P", "M", "G", "GG"];
const API_BASE_URL = "http://localhost:3001/api";

// Gradientes por categoria (placeholder visual com CSS)
const CATEGORY_GRADIENTS = {
  Vestidos: "linear-gradient(135deg, #F80080, #c4006a)",
  Blusas: "linear-gradient(135deg, #F80080, #ff7fc0)",
  Calças: "linear-gradient(135deg, #D4AF37, #b8932a)",
  Saias: "linear-gradient(135deg, #F80080, #D4AF37)",
  Conjuntos: "linear-gradient(135deg, #c4006a, #063F2B)",
};

let products = [
  {
    id: 1,
    name: "Vestido Floral Midi",
    category: "Vestidos",
    price: 129.90,
    oldPrice: 169.90,
    colors: ["Rosa", "Verde", "Preto"],
    sizes: { "Único": 2, P: 4, M: 6, G: 3, GG: 0 },
    midias: [
      { id: 1, produto_id: 1, tipo: "imagem", url: "assets/produtos/vestido-floral-midi-1.jpg", titulo: "Imagem principal - Vestido Floral Midi", ordem: 1, principal: true },
      { id: 2, produto_id: 1, tipo: "imagem", url: "assets/produtos/vestido-floral-midi-2.jpg", titulo: "Detalhe do tecido - Vestido Floral Midi", ordem: 2, principal: false },
      { id: 3, produto_id: 1, tipo: "video", url: "assets/produtos/vestido-floral-midi-video.mp4", titulo: "Vídeo demonstrativo - Vestido Floral Midi", ordem: 3, principal: false },
    ],
  },
  {
    id: 2,
    name: "Blusa Canelada",
    category: "Blusas",
    price: 59.90,
    colors: ["Branco", "Rosa", "Bege"],
    sizes: { "Único": 5, P: 8, M: 10, G: 4, GG: 2 },
    midias: [
      { id: 4, produto_id: 2, tipo: "imagem", url: "assets/produtos/blusa-canelada-1.jpg", titulo: "Imagem principal - Blusa Canelada", ordem: 1, principal: true },
      { id: 5, produto_id: 2, tipo: "video", url: "assets/produtos/blusa-canelada-video.mp4", titulo: "Vídeo demonstrativo - Blusa Canelada", ordem: 2, principal: false },
    ],
  },
  {
    id: 3,
    name: "Cal?a Pantalona",
    category: "Calças",
    price: 149.90,
    colors: ["Preto", "Verde", "Caramelo"],
    sizes: { "Único": 1, P: 2, M: 3, G: 2, GG: 1 },
    midias: [
      { id: 6, produto_id: 3, tipo: "imagem", url: "assets/produtos/calca-pantalona-1.jpg", titulo: "Imagem principal - Cal?a Pantalona", ordem: 1, principal: true },
      { id: 7, produto_id: 3, tipo: "imagem", url: "assets/produtos/calca-pantalona-2.jpg", titulo: "Detalhe do caimento - Cal?a Pantalona", ordem: 2, principal: false },
    ],
  },
  {
    id: 4,
    name: "Saia Plissada",
    category: "Saias",
    price: 89.90,
    oldPrice: 119.90,
    colors: ["Dourado", "Rosa", "Preto"],
    sizes: { "Único": 0, P: 1, M: 2, G: 0, GG: 0 },
    midias: [
      { id: 8, produto_id: 4, tipo: "imagem", url: "assets/produtos/saia-plissada-1.jpg", titulo: "Imagem principal - Saia Plissada", ordem: 1, principal: true },
    ],
  },
  {
    id: 5,
    name: "Conjunto Alfaiataria",
    category: "Conjuntos",
    price: 219.90,
    colors: ["Verde", "Preto", "Off-white"],
    sizes: { "Único": 3, P: 5, M: 5, G: 4, GG: 2 },
    midias: [
      { id: 9, produto_id: 5, tipo: "imagem", url: "assets/produtos/conjunto-alfaiataria-1.jpg", titulo: "Imagem principal - Conjunto Alfaiataria", ordem: 1, principal: true },
      { id: 10, produto_id: 5, tipo: "video", url: "assets/produtos/conjunto-alfaiataria-video.mp4", titulo: "Vídeo demonstrativo - Conjunto Alfaiataria", ordem: 2, principal: false },
    ],
  },
  {
    id: 6,
    name: "Cropped B?sico",
    category: "Blusas",
    price: 45.00,
    colors: ["Rosa", "Branco", "Preto"],
    sizes: { "Único": 6, P: 9, M: 7, G: 3, GG: 1 },
    midias: [
      { id: 11, produto_id: 6, tipo: "imagem", url: "assets/produtos/cropped-basico-1.jpg", titulo: "Imagem principal - Cropped B?sico", ordem: 1, principal: true },
    ],
  },
  {
    id: 7,
    name: "Vestido Tubinho",
    category: "Vestidos",
    price: 159.90,
    colors: ["Preto", "Vermelho", "Rosa"],
    sizes: { "Único": 2, P: 1, M: 1, G: 0, GG: 0 },
    midias: [
      { id: 12, produto_id: 7, tipo: "imagem", url: "assets/produtos/vestido-tubinho-1.jpg", titulo: "Imagem principal - Vestido Tubinho", ordem: 1, principal: true },
      { id: 13, produto_id: 7, tipo: "video", url: "assets/produtos/vestido-tubinho-video.mp4", titulo: "Vídeo demonstrativo - Vestido Tubinho", ordem: 2, principal: false },
    ],
  },
  {
    id: 8,
    name: "Camisa Social Feminina",
    category: "Blusas",
    price: 99.90,
    oldPrice: 139.90,
    colors: ["Branco", "Azul", "Bege"],
    sizes: { "Único": 4, P: 6, M: 8, G: 5, GG: 3 },
    midias: [
      { id: 14, produto_id: 8, tipo: "imagem", url: "assets/produtos/camisa-social-feminina-1.jpg", titulo: "Imagem principal - Camisa Social Feminina", ordem: 1, principal: true },
    ],
  },
];

const suppliers = [
  { id: 1, name: "Rosa Bella Atacado", segment: "Vestidos e saias", city: "São Paulo, SP", contact: "Marina Costa", phone: "(11) 98888-1200", status: "Ativo", delivery: "5 a 7 dias", lastOrder: "Coleção Primavera", rating: "Premium" },
  { id: 2, name: "Flor de Linho", segment: "Blusas e camisas", city: "Fortaleza, CE", contact: "Helena Moura", phone: "(85) 97777-4300", status: "Ativo", delivery: "7 a 10 dias", lastOrder: "Reposição básica", rating: "Confiável" },
  { id: 3, name: "Dourado Fashion", segment: "Conjuntos", city: "Belo Horizonte, MG", contact: "Carla Nunes", phone: "(31) 96666-2100", status: "Inativo", delivery: "Sob consulta", lastOrder: "Mostruário festa", rating: "Novo" },
  { id: 4, name: "Verde Chic Confecções", segment: "Calças e alfaiataria", city: "Goiânia, GO", contact: "Paula Reis", phone: "(62) 95555-8100", status: "Ativo", delivery: "4 a 6 dias", lastOrder: "Alfaiataria casual", rating: "Premium" },
];

let estoqueApiRows = null;

let stockMovements = [
  { id: 1, date: "2026-06-12T09:30:00", product: "Vestido Floral Midi", type: "Entrada", quantity: 8, reason: "Compra fornecedor", responsible: "Gisele" },
  { id: 2, date: "2026-06-13T14:15:00", product: "Saia Plissada", type: "Ajuste", quantity: 1, reason: "Conferência de estoque", responsible: "Flávia" },
  { id: 3, date: "2026-06-14T16:40:00", product: "Blusa Canelada", type: "Saída", quantity: 2, reason: "Venda balcão", responsible: "Gisele" },
  { id: 4, date: "2026-06-15T10:05:00", product: "Conjunto Alfaiataria", type: "Entrada", quantity: 5, reason: "Reposição coleção", responsible: "Flávia" },
];

let sales = [];        // histórico de vendas
let cart = [];         // carrinho (compartilhado entre vitrine e PDV)
let activeCategory = "Todos";
let nextProductId = 9;
let nextSaleId = 1;
let nextMovementId = 5;

const DELIVERY_OPTIONS = {
  retirada: { label: "Retirada na loja", price: 0 },
  local: { label: "Entrega local", price: 10 },
  pac: { label: "PAC simulado", price: 25 },
  sedex: { label: "Sedex simulado", price: 38 },
  personalizado: { label: "Frete personalizado", price: 0 },
};

/* ----------------- ÍCONES (SVG inline) ----------------- */
const ICONS = {
  vestidos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2l3 3 3-3"/><path d="M8 5l-2 5 3 2-2 10h10l-2-10 3-2-2-5"/></svg>',
  blusas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l5 4-3 4-2-1v11H8V10L6 11 3 7l5-4"/><path d="M9 3a3 3 0 0 0 6 0"/></svg>',
  calças: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12l-1 20h-4l-1-12-1 12H6L5 2"/></svg>',
  saias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8l4 8-8 11L4 11z"/><path d="M8 3l-4 8M16 3l4 8"/></svg>',
  conjuntos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
  promo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  pdv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  gestao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  movimentacoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h13l-3-3"/><path d="M16 7l-3 3"/><path d="M21 17H8l3 3"/><path d="M8 17l3-3"/></svg>',
  fornecedores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
};

/* ----------------- MENU CIRCULAR (DESTAQUES) ----------------- */
const NAV_ITEMS = [
  { key: "vestidos",  label: "Vestidos",  icon: "vestidos",  screen: "catalogo", category: "Vestidos" },
  { key: "blusas",    label: "Blusas",    icon: "blusas",    screen: "catalogo", category: "Blusas" },
  { key: "calcas",    label: "Calças",    icon: "calças",    screen: "catalogo", category: "Calças" },
  { key: "saias",     label: "Saias",     icon: "saias",     screen: "catalogo", category: "Saias" },
  { key: "conjuntos", label: "Conjuntos", icon: "conjuntos", screen: "catalogo", category: "Conjuntos" },
  { key: "promocoes", label: "Promoções", icon: "promo",     screen: "catalogo", category: "Promoções" },
  { key: "pdv",       label: "PDV",       icon: "pdv",       screen: "pdv" },
  { key: "gestao",    label: "Gestão",    icon: "gestao",    screen: "gestao" },
  { key: "movimentacoes", label: "Movimentações", icon: "movimentacoes", screen: "movimentacoes" },
  { key: "fornecedores", label: "Fornecedores", icon: "fornecedores", screen: "fornecedores" },
];

/* ----------------- HELPERS ----------------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function money(v) {
  return "R$ " + v.toFixed(2).replace(".", ",");
}

function totalStock(p) {
  return TAMANHOS.reduce((sum, s) => sum + (p.sizes[s] || 0), 0);
}

function productStatus(p) {
  const total = totalStock(p);
  if (total === 0) return "zero";
  if (total <= 4) return "low";
  return "ok";
}

// rótulos estilo e-commerce
function statusLabel(status) {
  return { ok: "Disponível", low: "Últimas unidades", zero: "Esgotado" }[status];
}

function isPromo(p) {
  return typeof p.oldPrice === "number" && p.oldPrice > p.price;
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2600);
}

function normalizarTamanho(tamanho) {
  const value = String(tamanho || "").trim();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (["unico", "nico", "Único", "Único"].includes(normalized)) return "Único";
  return TAMANHOS.includes(value) ? value : value.toUpperCase();
}

function normalizarCategoria(categoria) {
  const value = String(categoria || "").trim();
  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const map = {
    vestidos: "Vestidos",
    blusas: "Blusas",
    calcas: "Calças",
    saias: "Saias",
    conjuntos: "Conjuntos",
    promocoes: "Promoções",
  };
  return map[key] || value || "Outros";
}

function numeroApi(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function adaptarProdutoApi(produto) {
  const variacoes = Array.isArray(produto.variacoes) ? produto.variacoes : [];
  const sizes = TAMANHOS.reduce((acc, size) => {
    acc[size] = 0;
    return acc;
  }, {});
  const colors = [];

  variacoes.forEach(variacao => {
    const size = normalizarTamanho(variacao.tamanho);
    const color = String(variacao.cor || "Único").trim() || "Único";
    const quantity = numeroApi(variacao.quantidade_estoque);

    if (!Object.prototype.hasOwnProperty.call(sizes, size)) sizes[size] = 0;
    sizes[size] += quantity;
    if (!colors.includes(color)) colors.push(color);
  });

  return {
    id: Number(produto.id),
    name: produto.nome || "Produto sem nome",
    category: normalizarCategoria(produto.categoria),
    price: numeroApi(produto.preco),
    oldPrice: produto.preco_promocional ? numeroApi(produto.preco_promocional) : undefined,
    description: produto.descricao || "",
    colors: colors.length ? colors : ["Único"],
    sizes,
    midias: Array.isArray(produto.midias) ? produto.midias : [],
    ativo: produto.ativo !== false,
    apiVariacoes: variacoes,
  };
}

function atualizarProdutosNaTela() {
  nextProductId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
  renderHome();
  renderFilters();
  renderCatalog();
  renderPdv($("#pdvSearch")?.value || "");
  renderCart();
  updateCartBadge();
  renderDashboard();
  renderStockTable();
}

async function carregarProdutosDaApi() {
  try {
    const response = await fetch(`${API_BASE_URL}/produtos`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta inv?lida de produtos");

    const produtosApi = data.map(adaptarProdutoApi).filter(p => p.id && p.ativo);
    if (!produtosApi.length) throw new Error("Nenhum produto v?lido retornado pela API");

    products = produtosApi;
    atualizarProdutosNaTela();
  } catch (error) {
    console.info("API de produtos indispon?vel. Mantendo produtos mockados.", error);
  }
}

/* ----------------- NAVEGAÇÃO ENTRE TELAS ----------------- */

function estoqueStatusFrontend(status) {
  const value = String(status || "").toLowerCase();
  if (value === "zerado" || value === "zero") return "zero";
  if (value === "baixo" || value === "low") return "low";
  return "ok";
}

function piorStatusEstoque(statusAtual, novoStatus) {
  const peso = { ok: 0, low: 1, zero: 2 };
  return peso[novoStatus] > peso[statusAtual] ? novoStatus : statusAtual;
}

function estoqueParaGestao() {
  if (!Array.isArray(estoqueApiRows)) return products;
  const grouped = new Map();
  estoqueApiRows.forEach(row => {
    const id = Number(row.produto_id);
    if (!id) return;
    const size = normalizarTamanho(row.tamanho);
    const quantity = numeroApi(row.quantidade);
    const existingProduct = products.find(p => Number(p.id) === id);
    if (!grouped.has(id)) {
      grouped.set(id, { id, name: row.produto_nome || existingProduct?.name || "Produto sem nome", category: normalizarCategoria(row.categoria || existingProduct?.category), price: existingProduct?.price || 0, colors: [], sizes: TAMANHOS.reduce((acc, tamanho) => { acc[tamanho] = 0; return acc; }, {}), stockStatus: "ok" });
    }
    const product = grouped.get(id);
    if (!Object.prototype.hasOwnProperty.call(product.sizes, size)) product.sizes[size] = 0;
    product.sizes[size] += quantity;
    if (row.cor && !product.colors.includes(row.cor)) product.colors.push(row.cor);
    product.stockStatus = piorStatusEstoque(product.stockStatus, estoqueStatusFrontend(row.status));
  });
  return Array.from(grouped.values());
}

async function carregarEstoqueDaApi() {
  try {
    const response = await fetch(API_BASE_URL + "/estoque");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta invalida de estoque");
    estoqueApiRows = data;
    renderDashboard();
    renderStockTable();
  } catch (error) {
    estoqueApiRows = null;
    console.info("API de estoque indisponivel. Mantendo estoque mockado.", error);
  }
}

function movimentoTipoFrontend(tipo) {
  const value = String(tipo || "").toLowerCase();
  if (value === "entrada") return "Entrada";
  if (value === "saida" || value === "sa\u00edda") return "Sa\u00edda";
  return "Ajuste";
}

function adaptarMovimentacaoApi(movimentacao) {
  return { id: Number(movimentacao.id) || 0, date: movimentacao.created_at || new Date().toISOString(), product: movimentacao.produto || "Produto nao informado", type: movimentoTipoFrontend(movimentacao.tipo), quantity: numeroApi(movimentacao.quantidade), reason: movimentacao.motivo || "Movimentacao de estoque", responsible: movimentacao.responsavel || "Sistema", size: movimentacao.tamanho || "", color: movimentacao.cor || "", sku: movimentacao.sku || "", saleId: movimentacao.venda_id || null };
}

async function carregarMovimentacoesDaApi() {
  try {
    const response = await fetch(API_BASE_URL + "/movimentacoes");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta invalida de movimentacoes");
    stockMovements = data.map(adaptarMovimentacaoApi);
    renderMovements();
  } catch (error) {
    console.info("API de movimentacoes indisponivel. Mantendo movimentacoes mockadas.", error);
  }
}

function buildStoryNav() {
  const track = $("#storyTrack");
  track.innerHTML = NAV_ITEMS.map(item => `
    <button class="story-item" type="button" data-key="${item.key}" data-screen="${item.screen}" ${item.category ? `data-category="${item.category}"` : ""}>
      <span class="story-ring"><span class="story-inner">${ICONS[item.icon]}</span></span>
      <span class="story-label">${item.label}</span>
    </button>
  `).join("");

  $$(".story-item", track).forEach(btn => {
    btn.addEventListener("click", () => {
      navigate(btn.dataset.screen, btn.dataset.category || "Todos");
    });
  });
}

function navigate(screen, category = "Todos") {
  $$(".screen").forEach(s => s.classList.remove("active"));
  const target = $(`#screen-${screen}`);
  if (target) target.classList.add("active");

  // marca link da navbar ativo
  $$(".nav-link").forEach(b => b.classList.remove("active"));
  const navMap = { home: "home", catalogo: "catalogo", pdv: "pdv", gestao: "gestao", movimentacoes: "movimentacoes", fornecedores: "fornecedores" };
  const activeNav = $(`.nav-link[data-nav="${navMap[screen]}"]`);
  if (activeNav) activeNav.classList.add("active");

  // catálogo com categoria
  if (screen === "catalogo") {
    activeCategory = category;
    renderFilters();
    renderCatalog();
  }
  if (screen === "gestao") renderStockTable();
  if (screen === "pdv") renderPdv($("#pdvSearch").value);
  if (screen === "movimentacoes") renderMovements();
  if (screen === "fornecedores") renderSuppliers();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ----------------- VITRINE (cards de produto) ----------------- */
const COLOR_SWATCHES = {
  Rosa: "#F80080",
  Verde: "#063F2B",
  Preto: "#111827",
  Branco: "#FFFFFF",
  Bege: "#D9B99B",
  Caramelo: "#B7793E",
  Dourado: "#D4AF37",
  Vermelho: "#DC2626",
  Azul: "#2563EB",
  "Off-white": "#FFF7ED",
  Único: "#F80080",
};

function productMedia(p) {
  return Array.isArray(p.midias)
    ? [...p.midias].sort((a, b) => Number(b.principal) - Number(a.principal) || (a.ordem || 0) - (b.ordem || 0) || a.id - b.id)
    : [];
}

function mainProductImage(p) {
  const midias = productMedia(p);
  return midias.find(m => m.tipo === "imagem" && m.principal) || midias.find(m => m.tipo === "imagem") || null;
}

function productHasVideo(p) {
  return productMedia(p).some(m => m.tipo === "video");
}

function mediaAlt(media, p) {
  return media?.titulo || p.name;
}

function renderMediaStage(media, p, color) {
  if (media?.tipo === "video") {
    const poster = mainProductImage(p)?.url || "";
    return `<video class="detail-media-main" controls preload="metadata" ${poster ? `poster="${poster}"` : ""}>
      <source src="${media.url}" type="video/mp4" />
      Seu navegador n?o suporta v?deo HTML5.
    </video>`;
  }

  if (media?.tipo === "imagem") {
    return `<img class="detail-media-main" src="${media.url}" alt="${mediaAlt(media, p)}" onerror="this.closest('.detail-media-stage').classList.add('media-error');this.hidden=true" />
      <div class="detail-visual detail-visual-fallback" style="background:${colorGradient(color)}"><span>${p.name.charAt(0)}</span><strong>${color}</strong></div>`;
  }

  return `<div class="detail-visual" style="background:${colorGradient(color)}"><span>${p.name.charAt(0)}</span><strong>${color}</strong></div>`;
}

function renderMediaThumb(media, index, active) {
  const videoMark = media.tipo === "video" ? `<span class="media-play">Play</span>` : "";
  const preview = media.tipo === "imagem"
    ? `<img src="${media.url}" alt="${media.titulo || `Mídia ${index + 1}`}" onerror="this.hidden=true" />`
    : `<span class="media-video-thumb">Vídeo</span>`;

  return `<button class="detail-media-thumb ${active ? "active" : ""}" type="button" data-detail-media="${index}" aria-label="Ver mídia ${index + 1}">
    ${preview}${videoMark}<small>${index + 1}</small>
  </button>`;
}

function bindDetailGallery(p, color) {
  const midias = productMedia(p);
  const stage = $("#detailMediaStage");
  if (!stage || !midias.length) return;

  $('[data-detail-media]').forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.detailMedia);
      const media = midias[index];
      if (!media) return;
      stage.classList.remove("media-error");
      stage.innerHTML = renderMediaStage(media, p, color);
      $('[data-detail-media]').forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}
function colorHex(color) {
  return COLOR_SWATCHES[color] || "#F80080";
}

function colorGradient(color) {
  const hex = colorHex(color);
  if (color === "Branco" || color === "Off-white") {
    return "linear-gradient(135deg, #FFFFFF, #FFE4F2 55%, #D4AF37)";
  }
  return `linear-gradient(135deg, ${hex}, #F80080 58%, #D4AF37)`;
}

function colorSizes(p, color) {
  const colorIndex = Math.max(0, p.colors.indexOf(color));
  return TAMANHOS.reduce((acc, size, sizeIndex) => {
    const base = p.sizes[size] || 0;
    const reduction = colorIndex === 0 ? 0 : ((colorIndex + sizeIndex) % 3);
    acc[size] = Math.max(0, base - reduction);
    return acc;
  }, {});
}

function firstAvailableSize(sizes) {
  return TAMANHOS.find(size => (sizes[size] || 0) > 0) || "";
}

function shopCard(p) {
  const status = productStatus(p);
  const selectedColor = p.colors[0] || "Único";
  const availableByColor = colorSizes(p, selectedColor);
  const selectedSize = firstAvailableSize(availableByColor);
  const sizes = TAMANHOS.map(s => {
    const off = (availableByColor[s] || 0) === 0 ? "off" : "";
    const active = s === selectedSize ? "active" : "";
    const disabled = off ? "disabled" : "";
    return `<button class="size-chip ${off} ${active}" data-card-size="${s}" type="button" ${disabled}>${s}</button>`;
  }).join("");
  const colors = p.colors.map((c, idx) => `
    <button class="color-dot ${idx === 0 ? "active" : ""}" data-card-color="${c}" type="button" aria-label="Selecionar cor ${c}">
      <span class="color-swatch" style="background:${colorHex(c)}"></span>
      <span>${c}</span>
    </button>
  `).join("");
  const promoTag = isPromo(p) ? `<span class="shop-tag promo">Promoção</span>` : "";
  const priceRow = isPromo(p)
    ? `<span class="shop-price">${money(p.price)}</span><span class="shop-old-price">${money(p.oldPrice)}</span>`
    : `<span class="shop-price">${money(p.price)}</span>`;
  const disabled = selectedSize ? "" : "disabled";
  const btnLabel = selectedSize ? "Adicionar ao carrinho" : "Esgotado";
  const mainImage = mainProductImage(p);
  const mediaBadge = productHasVideo(p) ? '<span class="media-badge">Vídeo</span>' : "";

  return `
  <article class="shop-card" data-product-card="${p.id}" data-selected-color="${selectedColor}" data-selected-size="${selectedSize}">
    <div class="shop-thumb" style="background:${colorGradient(selectedColor)}">
      <span class="cat-pill">${p.category}</span>
      <span class="shop-tag ${status}">${statusLabel(status)}</span>
      ${promoTag}
      ${mediaBadge}
      ${mainImage ? `<img class="shop-thumb-img" src="${mainImage.url}" alt="${mediaAlt(mainImage, p)}" loading="lazy" onerror="this.hidden=true" />` : ""}
      <span class="thumb-letter">${p.name.charAt(0)}</span>
      <span class="thumb-color-label">${selectedColor}</span>
    </div>
    <div class="shop-body">
      <span class="shop-cat">${p.category}</span>
      <h3 class="shop-name">${p.name}</h3>
      <div class="shop-price-row">${priceRow}</div>
      <div class="shop-sizes">${sizes}</div>
      <div class="shop-colors">${colors}</div>
      <div class="shop-foot">
        <button class="btn btn-ghost btn-detail" data-detail="${p.id}" type="button">Ver detalhes</button>
        <button class="btn btn-pink btn-buy" data-buy="${p.id}" type="button" ${disabled}>${btnLabel}</button>
      </div>
    </div>
  </article>`;
}

function renderCardSizes(card, p, color) {
  const sizes = colorSizes(p, color);
  const selectedSize = firstAvailableSize(sizes);
  $(".shop-sizes", card).innerHTML = TAMANHOS.map(s => {
    const off = (sizes[s] || 0) === 0 ? "off" : "";
    const active = s === selectedSize ? "active" : "";
    const disabled = off ? "disabled" : "";
    return `<button class="size-chip ${off} ${active}" data-card-size="${s}" type="button" ${disabled}>${s}</button>`;
  }).join("");
  card.dataset.selectedSize = selectedSize;
  const buy = $(".btn-buy", card);
  buy.disabled = !selectedSize;
  buy.textContent = selectedSize ? "Adicionar ao carrinho" : "Esgotado";
}

function bindCardSizeButtons(card) {
  $$("[data-card-size]", card).forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      card.dataset.selectedSize = btn.dataset.cardSize;
      $$("[data-card-size]", card).forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function bindBuyButtons(ctx) {
  $$("[data-product-card]", ctx).forEach(card => {
    const p = products.find(x => x.id === Number(card.dataset.productCard));
    if (!p) return;

    $$("[data-card-color]", card).forEach(btn => {
      btn.addEventListener("click", () => {
        const color = btn.dataset.cardColor;
        card.dataset.selectedColor = color;
        $$(".color-dot", card).forEach(item => item.classList.remove("active"));
        btn.classList.add("active");
        $(".shop-thumb", card).style.background = colorGradient(color);
        $(".thumb-color-label", card).textContent = color;
        renderCardSizes(card, p, color);
        bindCardSizeButtons(card);
      });
    });

    bindCardSizeButtons(card);
  });

  $$("[data-buy]", ctx).forEach(b => {
    b.addEventListener("click", () => {
      const card = b.closest("[data-product-card]");
      addToCart(Number(b.dataset.buy), card.dataset.selectedSize, card.dataset.selectedColor);
    });
  });

  $$("[data-detail]", ctx).forEach(b => {
    b.addEventListener("click", () => {
      const card = b.closest("[data-product-card]");
      openProductDetailModal(Number(b.dataset.detail), card.dataset.selectedColor, card.dataset.selectedSize);
    });
  });
}

function productDescription(p) {
  return `Peça versátil da Gisele Flávia Modas, pensada para valorizar a silhueta com conforto, acabamento delicado e presença elegante no dia a dia.`;
}

function fabricComposition(p) {
  const byCategory = {
    Vestidos: "96% viscose premium, 4% elastano",
    Blusas: "92% algodão penteado, 8% elastano",
    Calças: "88% poliéster alfaiataria, 12% elastano",
    Saias: "95% poliéster leve, 5% elastano",
    Conjuntos: "90% crepe alfaiataria, 10% elastano",
  };
  return byCategory[p.category] || "90% poliéster, 10% elastano";
}

function measurementRows() {
  const rows = [
    { size: "Único", bust: 82, waist: 64, hip: 90, length: 88 },
    { size: "P", bust: 88, waist: 70, hip: 96, length: 90 },
    { size: "M", bust: 94, waist: 76, hip: 102, length: 92 },
    { size: "G", bust: 102, waist: 84, hip: 110, length: 94 },
    { size: "GG", bust: 110, waist: 92, hip: 118, length: 96 },
  ];
  return rows.map(r => `
    <tr>
      <td>${r.size}</td>
      <td>${r.bust} cm</td>
      <td>${r.waist} cm</td>
      <td>${r.hip} cm</td>
      <td>${r.length} cm</td>
    </tr>
  `).join("");
}

function openProductDetailModal(id, selectedColor = "", selectedSize = "") {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const color = selectedColor || p.colors[0] || "Único";
  const sizes = colorSizes(p, color);
  const size = selectedSize || firstAvailableSize(sizes);
  const colorChips = p.colors.map(c => `
    <span class="detail-color-chip">
      <span class="color-swatch" style="background:${colorHex(c)}"></span>${c}
    </span>
  `).join("");
  const sizeChips = TAMANHOS.map(s => {
    const off = (sizes[s] || 0) === 0 ? "off" : "";
    return `<span class="detail-size-chip ${off}">${s}</span>`;
  }).join("");
  const midias = productMedia(p);
  const activeMedia = mainProductImage(p) || midias[0] || null;
  const galleryThumbs = midias.map((media, index) => renderMediaThumb(media, index, media === activeMedia)).join("");

  $("#detailTitle").textContent = p.name;
  $("#detailBody").innerHTML = `
    <div class="detail-layout">
      <div class="detail-gallery">
        <div class="detail-media-stage" id="detailMediaStage">
          ${renderMediaStage(activeMedia, p, color)}
        </div>
        ${midias.length > 1 ? `<div class="detail-media-thumbs">${galleryThumbs}</div>` : ""}
      </div>
      <div class="detail-content">
        <span class="shop-cat">${p.category}</span>
        <h2>${p.name}</h2>
        <div class="detail-price">${money(p.price)}</div>
        <p class="detail-description">${productDescription(p)}</p>
        <div class="detail-block">
          <h4>Cores disponíveis</h4>
          <div class="detail-chips">${colorChips}</div>
        </div>
        <div class="detail-block">
          <h4>Tamanhos disponíveis</h4>
          <div class="detail-chips">${sizeChips}</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Tabela de medidas</h4>
      <table class="detail-measures">
        <thead><tr><th>Tam.</th><th>Busto</th><th>Cintura</th><th>Quadril</th><th>Comp.</th></tr></thead>
        <tbody>${measurementRows()}</tbody>
      </table>
    </div>
    <div class="detail-section detail-info-grid">
      <div>
        <h4>Composição</h4>
        <p>${fabricComposition(p)}</p>
      </div>
      <div>
        <h4>Cuidados com a peça</h4>
        <p>Lavar à mão ou em ciclo delicado, secar à sombra, não usar alvejante e passar em temperatura baixa.</p>
      </div>
    </div>
    <p class="detail-note">As medidas são aproximadas e podem variar conforme o modelo.</p>
    <div class="modal-foot">
      <button type="button" class="btn btn-ghost" id="detailCancel">Fechar</button>
      <button type="button" class="btn btn-pink" id="detailAdd" ${size ? "" : "disabled"}>Adicionar ao carrinho</button>
    </div>
  `;

  bindDetailGallery(p, color);
  $("#detailCancel").addEventListener("click", closeProductDetailModal);
  $("#detailAdd").addEventListener("click", () => {
    addToCart(p.id, size, color);
    closeProductDetailModal();
  });
  openModal("#productDetailModal");
}

function closeProductDetailModal() {
  closeModal("#productDetailModal");
}

function renderHome() {
  // destaques: 4 primeiros disponíveis
  const featured = products.filter(p => productStatus(p) !== "zero").slice(0, 4);
  $("#featuredGrid").innerHTML = featured.map(shopCard).join("");
  bindBuyButtons($("#featuredGrid"));

  // novidades: os últimos cadastrados
  const news = [...products].slice(-4).reverse();
  $("#newsGrid").innerHTML = news.map(shopCard).join("");
  bindBuyButtons($("#newsGrid"));
}

/* ----------------- CATÁLOGO (vitrine filtrável) ----------------- */
function renderFilters() {
  const cats = ["Todos", "Vestidos", "Blusas", "Calças", "Saias", "Conjuntos", "Promoções"];
  $("#catalogFilters").innerHTML = cats.map(c =>
    `<button class="filter-pill ${c === activeCategory ? "active" : ""}" data-cat="${c}" type="button">${c}</button>`
  ).join("");

  $$("#catalogFilters .filter-pill").forEach(b => {
    b.addEventListener("click", () => {
      activeCategory = b.dataset.cat;
      renderFilters();
      renderCatalog();
    });
  });
}

function filteredProducts() {
  if (activeCategory === "Todos") return products;
  if (activeCategory === "Promoções") return products.filter(isPromo);
  return products.filter(p => p.category === activeCategory);
}

function renderCatalog() {
  const list = filteredProducts();
  const grid = $("#catalogGrid");
  if (!list.length) {
    grid.innerHTML = `<p class="empty-note">Nenhum produto nesta categoria.</p>`;
    return;
  }
  grid.innerHTML = list.map(shopCard).join("");
  bindBuyButtons(grid);
}

/* ----------------- MODAL COMPRAR (escolher tam/cor) ----------------- */
function openBuyModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const sizeOpts = TAMANHOS.filter(s => (p.sizes[s] || 0) > 0)
    .map(s => `<option value="${s}">${s} — ${p.sizes[s]} disponível(is)</option>`).join("");
  const colorOpts = p.colors.map(c => `<option value="${c}">${c}</option>`).join("");

  $("#buyBody").innerHTML = `
    <div class="buy-product">
      <div class="buy-thumb" style="background:${CATEGORY_GRADIENTS[p.category]}">${p.name.charAt(0)}</div>
      <div class="buy-info">
        <div class="name">${p.name}</div>
        <div class="price">${money(p.price)}</div>
      </div>
    </div>
    <div class="form-row">
      <label for="buySize">Tamanho</label>
      <select id="buySize">${sizeOpts}</select>
    </div>
    <div class="form-row">
      <label for="buyColor">Cor</label>
      <select id="buyColor">${colorOpts}</select>
    </div>
    <div class="modal-foot">
      <button type="button" class="btn btn-ghost" id="buyCancel">Cancelar</button>
      <button type="button" class="btn btn-pink" id="buyConfirm" data-id="${p.id}">Adicionar ao carrinho</button>
    </div>
  `;

  $("#buyCancel").addEventListener("click", closeBuyModal);
  $("#buyConfirm").addEventListener("click", () => {
    const size = $("#buySize").value;
    const color = $("#buyColor").value;
    addToCart(p.id, size, color);
    closeBuyModal();
  });

  openModal("#buyModal");
}
function closeBuyModal() { closeModal("#buyModal"); }

/* ----------------- CARRINHO ----------------- */
function cartSubtotal() {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getShippingData() {
  const deliveryType = $("#deliveryType")?.value || "retirada";
  const option = DELIVERY_OPTIONS[deliveryType] || DELIVERY_OPTIONS.retirada;
  const customValue = parseFloat($("#customShippingValue")?.value || "0") || 0;
  const shippingValue = deliveryType === "personalizado" ? Math.max(0, customValue) : option.price;
  return {
    cep: $("#customerCep")?.value.trim() || "",
    deliveryType,
    deliveryLabel: option.label,
    shippingValue,
  };
}

function updateCartTotals() {
  const subtotal = cartSubtotal();
  const shipping = getShippingData();
  const shippingValue = cart.length ? shipping.shippingValue : 0;
  $("#cartSubtotal").textContent = money(subtotal);
  $("#cartShipping").textContent = money(shippingValue);
  $("#cartTotal").textContent = money(subtotal + shippingValue);
  $("#customShippingWrap").classList.toggle("show", shipping.deliveryType === "personalizado");
}

function addToCart(id, size, color) {
  const p = products.find(x => x.id === id);
  if (!p || !size) { showToast("Selecione um tamanho disponível"); return; }

  const inCart = cart
    .filter(i => i.id === id && i.size === size)
    .reduce((sum, i) => sum + i.qty, 0);

  if (inCart + 1 > (p.sizes[size] || 0)) {
    showToast(`Estoque insuficiente no tamanho ${size}`);
    return;
  }

  const existing = cart.find(i => i.id === id && i.size === size && i.color === color);
  if (existing) existing.qty += 1;
  else cart.push({ id, name: p.name, price: p.price, size, color, qty: 1 });

  renderCart();
  updateCartBadge();
  showToast(`${p.name} (${size}) adicionado ao carrinho`);
}

function renderCart() {
  const box = $("#cartItems");
  if (!cart.length) {
    box.innerHTML = `<p class="cart-empty">Nenhum item adicionado ainda.</p>`;
    updateCartTotals();
    return;
  }

  box.innerHTML = cart.map((i, idx) => `
    <div class="cart-row">
      <div class="info">
        <div class="name">${i.name}</div>
        <div class="meta">Tam: ${i.size} · Cor: ${i.color} · Qtd: ${i.qty}</div>
        <div class="sub">${money(i.price * i.qty)}</div>
      </div>
      <button class="cart-remove" data-cart="${idx}" type="button" aria-label="Remover">&times;</button>
    </div>
  `).join("");

  $$("[data-cart]", box).forEach(b =>
    b.addEventListener("click", () => {
      cart.splice(Number(b.dataset.cart), 1);
      renderCart();
      updateCartBadge();
    })
  );

  updateCartTotals();
}

function updateCartBadge() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  $("#cartBadge").textContent = count;
}

function checkout() {
  if (!cart.length) { showToast("Adicione itens ao carrinho primeiro"); return; }

  const subtotal = cartSubtotal();
  const shipping = getShippingData();
  const total = subtotal + shipping.shippingValue;

  // baixa no estoque
  cart.forEach(i => {
    const p = products.find(x => x.id === i.id);
    if (p) p.sizes[i.size] = Math.max(0, (p.sizes[i.size] || 0) - i.qty);
  });

  // registra venda
  sales.push({
    id: nextSaleId++,
    date: new Date().toISOString(),
    subtotal,
    shippingType: shipping.deliveryLabel,
    shippingCep: shipping.cep,
    shippingValue: shipping.shippingValue,
    total,
    items: cart.map(i => ({ ...i, subtotal: i.price * i.qty })),
  });

  cart.forEach(i => {
    stockMovements.unshift({
      id: nextMovementId++,
      date: new Date().toISOString(),
      product: i.name,
      size: i.size,
      color: i.color,
      type: "Saída",
      quantity: i.qty,
      reason: "Venda PDV",
      responsible: "PDV",
    });
  });

  cart = [];
  renderCart();
  updateCartBadge();
  renderHome();
  renderCatalog();
  renderPdv($("#pdvSearch").value);
  renderDashboard();
  renderStockTable();
  renderMovements();
  renderSuppliers();
  renderHistory();
  showToast("Venda finalizada com sucesso");
}

/* ----------------- PDV ----------------- */
function renderPdv(filter = "") {
  const term = filter.toLowerCase();
  const list = products.filter(p => p.name.toLowerCase().includes(term) && totalStock(p) > 0);
  const grid = $("#pdvGrid");

  if (!list.length) {
    grid.innerHTML = `<p class="empty-note">Nenhum produto disponível para venda.</p>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const sizeOpts = TAMANHOS.filter(s => (p.sizes[s] || 0) > 0)
      .map(s => `<option value="${s}">${s} (${p.sizes[s]})</option>`).join("");
    const colorOpts = p.colors.map(c => `<option value="${c}">${c}</option>`).join("");

    return `
    <div class="pdv-card">
      <div class="pdv-thumb" style="background:${CATEGORY_GRADIENTS[p.category]}">${p.name.charAt(0)}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price">${money(p.price)}</div>
      <div class="pdv-select-row">
        <select data-size="${p.id}">${sizeOpts}</select>
        <select data-color="${p.id}">${colorOpts}</select>
      </div>
      <button class="pdv-add" data-add="${p.id}" type="button">Adicionar</button>
    </div>`;
  }).join("");

  $$("[data-add]", grid).forEach(b => {
    b.addEventListener("click", () => {
      const id = Number(b.dataset.add);
      const size = $(`[data-size="${id}"]`, grid).value;
      const color = $(`[data-color="${id}"]`, grid).value;
      addToCart(id, size, color);
    });
  });
}

/* ----------------- GESTÃO: DASHBOARD ----------------- */
function renderDashboard() {
  const today = new Date().toDateString();
  const salesToday = sales.filter(s => new Date(s.date).toDateString() === today);
  const totalVendasDia = salesToday.reduce((sum, s) => sum + s.total, 0);
  const totalCaixa = sales.reduce((sum, s) => sum + s.total, 0);
  const stockProducts = estoqueParaGestao();
  const totalPecas = stockProducts.reduce((sum, p) => sum + totalStock(p), 0);
  const baixoEstoque = stockProducts.filter(p => (p.stockStatus || productStatus(p)) !== "ok").length;

  const cards = [
    { label: "Vendas de hoje", value: money(totalVendasDia), icon: "money", cls: "pink" },
    { label: "Peças em estoque", value: totalPecas, icon: "box", cls: "green" },
    { label: "Estoque baixo / zerado", value: baixoEstoque, icon: "alert", cls: "warn" },
    { label: "Total em caixa", value: money(totalCaixa), icon: "cash", cls: "gold" },
  ];

  $("#dashboardCards").innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-icon ${c.cls}">${ICONS[c.icon]}</div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}</div>
    </div>
  `).join("");

  const low = stockProducts.filter(p => (p.stockStatus || productStatus(p)) !== "ok");
  $("#lowCount").textContent = low.length;
  $("#lowStockList").innerHTML = low.length
    ? low.map(p => {
        const st = p.stockStatus || productStatus(p);
        return `<div class="low-row">
          <div><span class="name">${p.name}</span><div class="meta">${p.category} · ${totalStock(p)} un.</div></div>
          <span class="tag-status ${st === "zero" ? "tag-zero" : "tag-low"}">${statusLabel(st)}</span>
        </div>`;
      }).join("")
    : `<p class="empty-note">Tudo certo! Nenhuma peça com estoque baixo.</p>`;

  const recent = [...sales].reverse().slice(0, 4);
  $("#recentSalesList").innerHTML = recent.length
    ? recent.map(s => `<div class="recent-row">
        <div><span class="name">Venda #${String(s.id).padStart(3, "0")}</span><div class="meta">${s.items.length} item(ns)</div></div>
        <span class="sub" style="font-weight:700;color:var(--pink-brand)">${money(s.total)}</span>
      </div>`).join("")
    : `<p class="empty-note">Nenhuma venda registrada ainda. Use o PDV para vender.</p>`;
}

/* ----------------- GESTÃO: TABELA DE ESTOQUE ----------------- */
function renderStockTable() {
  const table = $("#stockTable");
  const stockProducts = estoqueParaGestao();
  const header = `
    <thead>
      <tr>
        <th>Produto</th><th>Categoria</th><th>Preço</th>
        <th class="num">Único</th><th class="num">P</th><th class="num">M</th><th class="num">G</th><th class="num">GG</th>
        <th class="num">Total</th><th>Status</th><th>Ações</th>
      </tr>
    </thead>`;

  if (!stockProducts.length) {
    table.innerHTML = header + `<tbody><tr><td colspan="11"><p class="empty-note">Nenhum produto cadastrado.</p></td></tr></tbody>`;
    return;
  }

  const rows = stockProducts.map(p => {
    const st = p.stockStatus || productStatus(p);
    const tagCls = st === "zero" ? "tag-zero" : (st === "low" ? "tag-low" : "");
    const statusBadge = st === "ok"
      ? `<span class="tag-status" style="background:#D1FAE5;color:#065F46">Normal</span>`
      : `<span class="tag-status ${tagCls}">${st === "zero" ? "Zerado" : "Baixo"}</span>`;
    const sizeCells = TAMANHOS.map(s => {
      const q = p.sizes[s] || 0;
      const style = q === 0 ? 'style="color:var(--danger);font-weight:700"' : "";
      return `<td class="num" ${style}>${q}</td>`;
    }).join("");
    const canEdit = products.some(item => Number(item.id) === Number(p.id));
    const actions = canEdit
      ? `<button class="icon-btn edit" data-edit="${p.id}" type="button">${ICONS.edit} Editar</button>
          <button class="icon-btn remove" data-remove="${p.id}" type="button">${ICONS.trash}</button>`
      : `<span class="chip">API</span>`;

    return `
    <tr>
      <td><span class="name">${p.name}</span></td>
      <td>${p.category}</td>
      <td>${money(p.price || 0)}</td>
      ${sizeCells}
      <td class="num"><strong>${totalStock(p)}</strong></td>
      <td>${statusBadge}</td>
      <td><div class="stock-actions">${actions}</div></td>
    </tr>`;
  }).join("");

  table.innerHTML = header + `<tbody>${rows}</tbody>`;

  $$('[data-edit]', table).forEach(b => b.addEventListener("click", () => openProductModal(Number(b.dataset.edit))));
  $$('[data-remove]', table).forEach(b => b.addEventListener("click", () => removeProduct(Number(b.dataset.remove))));
}

function removeProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (confirm(`Remover o produto "${p.name}"?`)) {
    products = products.filter(x => x.id !== id);
    renderStockTable();
    renderDashboard();
    renderHome();
    renderCatalog();
    showToast("Produto removido com sucesso");
  }
}

/* ----------------- MODAL DE PRODUTO (CRUD) ----------------- */
function openProductModal(id = null) {
  const form = $("#productForm");
  form.reset();

  if (id) {
    const p = products.find(x => x.id === id);
    $("#modalTitle").textContent = "Editar produto";
    $("#fId").value = p.id;
    $("#fName").value = p.name;
    $("#fCategory").value = p.category;
    $("#fPrice").value = p.price;
    $("#fColors").value = p.colors.join(", ");
    TAMANHOS.forEach(s => { $(`#f${s}`).value = p.sizes[s] || 0; });
  } else {
    $("#modalTitle").textContent = "Adicionar produto";
    $("#fId").value = "";
  }

  openModal("#productModal");
}

function handleProductSubmit(e) {
  e.preventDefault();
  const id = $("#fId").value;
  const data = {
    name: $("#fName").value.trim(),
    category: $("#fCategory").value,
    price: parseFloat($("#fPrice").value) || 0,
    colors: $("#fColors").value.split(",").map(c => c.trim()).filter(Boolean),
    sizes: TAMANHOS.reduce((o, s) => { o[s] = parseInt($(`#f${s}`).value) || 0; return o; }, {}),
  };
  if (!data.colors.length) data.colors = ["Único"];

  if (id) {
    const p = products.find(x => x.id === Number(id));
    Object.assign(p, data);
    showToast("Produto atualizado");
  } else {
    products.push({ id: nextProductId++, ...data });
    showToast("Produto adicionado ao catálogo");
  }

  closeModal("#productModal");
  renderStockTable();
  renderDashboard();
  renderHome();
  renderCatalog();
}

/* ----------------- MOVIMENTAÇÕES DE ESTOQUE ----------------- */
function movementDateLabel(date) {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function movementTypeClass(type) {
  return { Entrada: "entrada", Saída: "saida", Ajuste: "ajuste" }[type] || "ajuste";
}

function renderMovements() {
  const counts = stockMovements.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {});

  $("#movementSummary").innerHTML = [
    { label: "Movimentações", value: stockMovements.length, cls: "pink" },
    { label: "Entradas", value: counts.Entrada || 0, cls: "green" },
    { label: "Saídas", value: counts.Saída || 0, cls: "pink" },
    { label: "Ajustes", value: counts.Ajuste || 0, cls: "gold" },
  ].map(item => `
    <div class="movement-stat ${item.cls}">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  $("#movementCount").textContent = stockMovements.length;

  if (!stockMovements.length) {
    $("#movementList").innerHTML = `<p class="empty-note">Nenhuma movimentação registrada ainda.</p>`;
    return;
  }

  $("#movementList").innerHTML = stockMovements.map(m => `
    <article class="movement-row">
      <div class="movement-date">
        <span>${movementDateLabel(m.date)}</span>
        <strong>#${String(m.id).padStart(3, "0")}</strong>
      </div>
      <div class="movement-main">
        <h3>${m.product}</h3>
        <p>${m.reason}${m.size || m.color ? ` · Tam: ${m.size || "-"} · Cor: ${m.color || "-"}` : ""}</p>
      </div>
      <span class="movement-type ${movementTypeClass(m.type)}">${m.type}</span>
      <div class="movement-qty">
        <span>Qtd.</span>
        <strong>${m.quantity}</strong>
      </div>
      <div class="movement-owner">
        <span>Responsável</span>
        <strong>${m.responsible}</strong>
      </div>
    </article>
  `).join("");
}

/* ----------------- FORNECEDORES ----------------- */
function renderSuppliers() {
  const activeCount = suppliers.filter(s => s.status === "Ativo").length;
  const inactiveCount = suppliers.filter(s => s.status === "Inativo").length;
  const citiesCount = new Set(suppliers.map(s => s.city)).size;

  $("#supplierSummary").innerHTML = [
    { label: "Fornecedores", value: suppliers.length, cls: "pink" },
    { label: "Ativos", value: activeCount, cls: "green" },
    { label: "Inativos", value: inactiveCount, cls: "pink" },
    { label: "Cidades", value: citiesCount, cls: "gold" },
  ].map(item => `
    <div class="supplier-stat ${item.cls}">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  $("#supplierGrid").innerHTML = suppliers.map(s => `
    <article class="supplier-card">
      <div class="supplier-card-top">
        <div class="supplier-avatar">${s.name.charAt(0)}</div>
        <div>
          <span class="supplier-rating">${s.rating}</span>
          <h3>${s.name}</h3>
          <p>${s.segment}</p>
        </div>
      </div>
      <div class="supplier-info">
        <div><span>Categoria fornecida</span><strong>${s.segment}</strong></div>
        <div><span>Cidade</span><strong>${s.city}</strong></div>
        <div><span>Contato</span><strong>${s.contact}</strong></div>
        <div><span>WhatsApp</span><strong>${s.phone}</strong></div>
        <div><span>Última compra</span><strong>${s.lastOrder}</strong></div>
      </div>
      <div class="supplier-card-bottom">
        <span class="supplier-status ${s.status === "Ativo" ? "active" : "inactive"}">${s.status}</span>
        <div class="supplier-actions">
          <button class="supplier-action primary" type="button">Ver detalhes</button>
          <button class="supplier-action" type="button">Editar</button>
        </div>
      </div>
    </article>
  `).join("");
}

/* ----------------- HISTÓRICO ----------------- */
function renderHistory() {
  const box = $("#historyList");
  if (!sales.length) {
    box.innerHTML = `<p class="empty-note">Nenhuma venda registrada ainda. Finalize uma venda no PDV.</p>`;
    return;
  }

  box.innerHTML = [...sales].reverse().map(s => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const rows = s.items.map(i => `
      <tr>
        <td>${i.name}</td>
        <td>${i.size}</td>
        <td>${i.color}</td>
        <td>${i.qty}</td>
        <td>${money(i.subtotal)}</td>
      </tr>`).join("");

    return `
    <div class="history-card">
      <div class="history-head">
        <div>
          <div class="history-id">Venda #${String(s.id).padStart(3, "0")}</div>
          <div class="history-date">${dateStr}</div>
        </div>
        <div class="history-value">${money(s.total)}</div>
      </div>
      <div class="history-shipping">
        <div><span>Entrega</span><strong>${s.shippingType || "Retirada na loja"}</strong></div>
        <div><span>CEP</span><strong>${s.shippingCep || "Não informado"}</strong></div>
        <div><span>Subtotal</span><strong>${money(s.subtotal || s.total)}</strong></div>
        <div><span>Frete</span><strong>${money(s.shippingValue || 0)}</strong></div>
      </div>
      <table class="history-items">
        <thead><tr><th>Produto</th><th>Tam.</th><th>Cor</th><th>Qtd</th><th>Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join("");
}

/* ----------------- RELATÓRIOS ----------------- */
function reportTypeLabel(type) {
  return { vendas: "Vendas", estoque: "Estoque", movimentacoes: "Movimentações" }[type] || "Vendas";
}

function reportPeriodLabel(period) {
  return { hoje: "Hoje", 7: "Últimos 7 dias", 30: "Últimos 30 dias" }[period] || "Hoje";
}

function getSelectedReportFields() {
  return $$(".report-field")
    .filter(input => input.checked)
    .map(input => input.value);
}

function isWithinReportPeriod(date, period, start, end) {
  const d = new Date(date);
  const now = new Date();
  if (period === "hoje") return d.toDateString() === now.toDateString();
  if (period === "7" || period === "30") {
    const limit = new Date();
    limit.setDate(limit.getDate() - Number(period));
    return d >= limit;
  }
  return true;
}

function reportCell(enabled, html) {
  return enabled ? html : "";
}

function buildSalesReport(fields, period, start, end) {
  const rows = sales.filter(s => isWithinReportPeriod(s.date, period, start, end));
  if (!rows.length) return `<p class="report-empty">Nenhuma venda encontrada para o período selecionado.</p>`;

  return `
    <table class="report-table">
      <thead>
        <tr>
          <th>Data</th>
          ${reportCell(fields.includes("produtos"), "<th>Produtos</th>")}
          ${reportCell(fields.includes("tamanhos"), "<th>Tamanhos</th>")}
          ${reportCell(fields.includes("cores"), "<th>Cores</th>")}
          ${reportCell(fields.includes("valores"), "<th>Valores</th>")}
          <th>Entrega</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(s => `
          <tr>
            <td>${movementDateLabel(s.date)}</td>
            ${reportCell(fields.includes("produtos"), `<td>${s.items.map(i => i.name).join(", ")}</td>`)}
            ${reportCell(fields.includes("tamanhos"), `<td>${s.items.map(i => i.size).join(", ")}</td>`)}
            ${reportCell(fields.includes("cores"), `<td>${s.items.map(i => i.color).join(", ")}</td>`)}
            ${reportCell(fields.includes("valores"), `<td>Subtotal: ${money(s.subtotal || s.total)}<br>Frete: ${money(s.shippingValue || 0)}<br>Total: ${money(s.total)}</td>`)}
            <td>${s.shippingType || "Retirada na loja"}<br>${s.shippingCep || "CEP não informado"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function buildStockReport(fields) {
  return `
    <table class="report-table">
      <thead>
        <tr>
          ${reportCell(fields.includes("produtos"), "<th>Produto</th>")}
          <th>Categoria</th>
          ${reportCell(fields.includes("tamanhos"), "<th>Tamanhos</th>")}
          ${reportCell(fields.includes("cores"), "<th>Cores</th>")}
          ${reportCell(fields.includes("valores"), "<th>Preço</th>")}
          ${reportCell(fields.includes("fornecedor"), "<th>Fornecedor</th>")}
          ${reportCell(fields.includes("status"), "<th>Status</th>")}
        </tr>
      </thead>
      <tbody>
        ${products.map((p, idx) => `
          <tr>
            ${reportCell(fields.includes("produtos"), `<td>${p.name}</td>`)}
            <td>${p.category}</td>
            ${reportCell(fields.includes("tamanhos"), `<td>${TAMANHOS.map(s => `${s}: ${p.sizes[s] || 0}`).join("<br>")}</td>`)}
            ${reportCell(fields.includes("cores"), `<td>${p.colors.join(", ")}</td>`)}
            ${reportCell(fields.includes("valores"), `<td>${money(p.price)}</td>`)}
            ${reportCell(fields.includes("fornecedor"), `<td>${suppliers[idx % suppliers.length].name}</td>`)}
            ${reportCell(fields.includes("status"), `<td>${statusLabel(productStatus(p))}</td>`)}
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function buildMovementReport(fields, period, start, end) {
  const rows = stockMovements.filter(m => isWithinReportPeriod(m.date, period, start, end));
  if (!rows.length) return `<p class="report-empty">Nenhuma movimentação encontrada para o período selecionado.</p>`;

  return `
    <table class="report-table">
      <thead>
        <tr>
          <th>Data</th>
          ${reportCell(fields.includes("produtos"), "<th>Produto</th>")}
          ${reportCell(fields.includes("movimentacoes"), "<th>Tipo</th>")}
          <th>Quantidade</th>
          <th>Motivo</th>
          <th>Responsável</th>
          ${reportCell(fields.includes("status"), "<th>Status</th>")}
        </tr>
      </thead>
      <tbody>
        ${rows.map(m => `
          <tr>
            <td>${movementDateLabel(m.date)}</td>
            ${reportCell(fields.includes("produtos"), `<td>${m.product}</td>`)}
            ${reportCell(fields.includes("movimentacoes"), `<td>${m.type}</td>`)}
            <td>${m.quantity}</td>
            <td>${m.reason}</td>
            <td>${m.responsible}</td>
            ${reportCell(fields.includes("status"), `<td>${m.type === "Saída" ? "Baixa" : "Registrado"}</td>`)}
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

function buildReport() {
  const type = $("#reportType").value;
  const period = $("#reportPeriod").value;
  const start = "";
  const end = "";
  const fields = getSelectedReportFields();
  const issuedAt = new Date();
  const body = type === "estoque"
    ? buildStockReport(fields)
    : type === "movimentacoes"
      ? buildMovementReport(fields, period, start, end)
      : buildSalesReport(fields, period, start, end);

  $("#reportOutput").innerHTML = `
    <div class="report-paper">
      <div class="report-head">
        <div>
          <h1>Gisele Flávia Modas</h1>
          <p>Boutique Feminina</p>
        </div>
        <div class="report-meta">
          <strong>${reportTypeLabel(type)}</strong>
          <span>Período: ${reportPeriodLabel(period)}</span>
          <span>Emissão: ${movementDateLabel(issuedAt.toISOString())}</span>
        </div>
      </div>
      <div class="report-body">${body}</div>
    </div>
  `;
}

function openReportModal() {
  buildReport();
  openModal("#reportModal");
}

/* ----------------- MODAIS (helpers) ----------------- */
function openModal(sel) {
  const m = $(sel);
  m.classList.add("open");
  m.setAttribute("aria-hidden", "false");
}
function closeModal(sel) {
  const m = $(sel);
  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
}

/* ----------------- INICIALIZAÇÃO ----------------- */
function init() {
  buildStoryNav();
  renderHome();
  renderFilters();
  renderCatalog();
  renderPdv();
  renderCart();
  updateCartBadge();
  renderDashboard();
  renderStockTable();
  renderMovements();
  renderSuppliers();
  renderHistory();
  carregarProdutosDaApi();
  carregarEstoqueDaApi();
  carregarMovimentacoesDaApi();

  // navegação (topbar, banner, links)
  $$("[data-nav]").forEach(b => {
    b.addEventListener("click", () => navigate(b.dataset.nav, "Todos"));
  });

  // carrinho -> abre PDV
  $("#cartButton").addEventListener("click", () => navigate("pdv"));

  // CRUD de produto
  $("#btnAddProduct").addEventListener("click", () => openProductModal());
  $("#productForm").addEventListener("submit", handleProductSubmit);
  $("#modalClose").addEventListener("click", () => closeModal("#productModal"));
  $("#modalCancel").addEventListener("click", () => closeModal("#productModal"));
  $("#productModal").addEventListener("click", (e) => {
    if (e.target.id === "productModal") closeModal("#productModal");
  });

  // relatórios
  $("#btnOpenReport").addEventListener("click", openReportModal);
  $("#reportClose").addEventListener("click", () => closeModal("#reportModal"));
  $("#reportModal").addEventListener("click", (e) => {
    if (e.target.id === "reportModal") closeModal("#reportModal");
  });
  $("#reportPreview").addEventListener("click", () => {
    buildReport();
    closeModal("#reportModal");
  });
  $("#reportPrint").addEventListener("click", () => {
    buildReport();
    window.print();
  });

  // modal comprar
  $("#buyClose").addEventListener("click", closeBuyModal);
  $("#buyModal").addEventListener("click", (e) => {
    if (e.target.id === "buyModal") closeBuyModal();
  });

  // modal detalhes do produto
  $("#detailClose").addEventListener("click", closeProductDetailModal);
  $("#productDetailModal").addEventListener("click", (e) => {
    if (e.target.id === "productDetailModal") closeProductDetailModal();
  });

  // PDV
  $("#pdvSearch").addEventListener("input", (e) => renderPdv(e.target.value));
  $("#deliveryType").addEventListener("change", updateCartTotals);
  $("#customShippingValue").addEventListener("input", updateCartTotals);
  $("#customerCep").addEventListener("input", updateCartTotals);
  $("#btnCheckout").addEventListener("click", checkout);

  // marca "Início" como ativo
  const homeNav = $('.nav-link[data-nav="home"]');
  if (homeNav) homeNav.classList.add("active");
}

document.addEventListener("DOMContentLoaded", init);
