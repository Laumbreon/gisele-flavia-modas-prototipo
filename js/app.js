/* ============================================================
   Gisele Flávia Modas — Boutique Feminina
   JavaScript puro (sem frameworks, sem backend, sem APIs)
   ============================================================ */

/* ----------------- DADOS MOCKADOS ----------------- */
const TAMANHOS = ["Único", "P", "M", "G", "GG"];
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api"
    : "/api";
const AUTH_STORAGE_KEY = "gfm_admin_auth";
const ADMIN_SCREENS = new Set(["pdv", "gestao", "movimentacoes", "fornecedores", "historico", "maquininhas", "etiquetas", "pedidos-site", "fiscal"]);
const ADMIN_PIN_SESSION_KEY = "adminPinOk";

// Gradientes por categoria (placeholder visual com CSS)
const CATEGORY_GRADIENTS = {
  Vestidos: "linear-gradient(135deg, #F80080, #c4006a)",
  Blusas: "linear-gradient(135deg, #F80080, #ff7fc0)",
  Calças: "linear-gradient(135deg, #D4AF37, #b8932a)",
  Saias: "linear-gradient(135deg, #F80080, #D4AF37)",
  Conjuntos: "linear-gradient(135deg, #c4006a, #063F2B)",
};

const produtosDemoDesativados = [
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
let products = [];

const suppliers = [
  { id: 1, name: "Rosa Bella Atacado", segment: "Vestidos e saias", city: "São Paulo, SP", contact: "Marina Costa", phone: "(11) 98888-1200", status: "Ativo", delivery: "5 a 7 dias", lastOrder: "Coleção Primavera", rating: "Premium" },
  { id: 2, name: "Flor de Linho", segment: "Blusas e camisas", city: "Fortaleza, CE", contact: "Helena Moura", phone: "(85) 97777-4300", status: "Ativo", delivery: "7 a 10 dias", lastOrder: "Reposição básica", rating: "Confiável" },
  { id: 3, name: "Dourado Fashion", segment: "Conjuntos", city: "Belo Horizonte, MG", contact: "Carla Nunes", phone: "(31) 96666-2100", status: "Inativo", delivery: "Sob consulta", lastOrder: "Mostruário festa", rating: "Novo" },
  { id: 4, name: "Verde Chic Confecções", segment: "Calças e alfaiataria", city: "Goiânia, GO", contact: "Paula Reis", phone: "(62) 95555-8100", status: "Ativo", delivery: "4 a 6 dias", lastOrder: "Alfaiataria casual", rating: "Premium" },
];

let clientesApiRows = null;
let estoqueApiRows = null;

const movimentacoesDemoDesativadas = [
  { id: 1, date: "2026-06-12T09:30:00", product: "Vestido Floral Midi", type: "Entrada", quantity: 8, reason: "Compra fornecedor", responsible: "Gisele" },
  { id: 2, date: "2026-06-13T14:15:00", product: "Saia Plissada", type: "Ajuste", quantity: 1, reason: "Conferência de estoque", responsible: "Flávia" },
  { id: 3, date: "2026-06-14T16:40:00", product: "Blusa Canelada", type: "Saída", quantity: 2, reason: "Venda balcão", responsible: "Gisele" },
  { id: 4, date: "2026-06-15T10:05:00", product: "Conjunto Alfaiataria", type: "Entrada", quantity: 5, reason: "Reposição coleção", responsible: "Flávia" },
];
let stockMovements = [];

let sales = [];        // histórico de vendas
let cart = [];         // carrinho público da vitrine
let activeCategory = "Todos";
let nextProductId = 9;
let nextSaleId = 1;
let nextMovementId = 5;
let adminSession = carregarSessaoAdmin();
let pendingAdminAction = null;
let localShippingQuote = null;
let fretesBairro = [];
let freightStatusFilter = "todos";
let freightDeactivateConfirmId = null;
let maquininhas = [];
let adminPinValue = "";
let productFilesSelected = [];
let pendingPinAction = null;
let pdvCart = [];
let pdvCaixa = null;
let pdvMaquininhas = [];
let pdvFrete = null;
let pdvProdutosPublicos = [];
let ultimaVendaPdv = null;
let variacoesEtiquetas = [];
let etiquetasSelecionadas = [];
let pedidosSite = [];
let pedidoSiteAtual = null;
let fiscalProdutos = [];
let fiscalDocumentos = [];

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

function carregarSessaoAdmin() {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved);
    return session?.token && session?.usuario ? session : null;
  } catch (error) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function salvarSessaoAdmin(session) {
  adminSession = session;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  atualizarAuthUi();
}

function usuarioLogado() {
  return Boolean(adminSession?.token && adminSession?.usuario);
}

function usuarioAdministrador() {
  return usuarioLogado() && ["dona", "super_admin"].includes(adminSession.usuario.tipo);
}

function temPermissao(nome) {
  return (adminSession?.permissoes || []).some(item => item.permissao === nome && item.permitido !== false);
}

function podeAcessarPdv() {
  return usuarioLogado() && (usuarioAdministrador() || temPermissao("pdv.acessar") || temPermissao("vendas.criar"));
}

function podeAcessarEtiquetas() {
  return usuarioLogado() && (usuarioAdministrador() || temPermissao("produtos.editar") || temPermissao("etiquetas.imprimir"));
}

function podeVerPedidosSite() {
  return usuarioLogado() && (usuarioAdministrador() || temPermissao("vendas.criar") || temPermissao("relatorios.ver"));
}

function podeOperarPedidosSite() {
  return usuarioLogado() && (usuarioAdministrador() || temPermissao("vendas.criar") || temPermissao("configuracoes.editar"));
}
function podeVerFiscal() { return usuarioLogado() && (usuarioAdministrador() || temPermissao("fiscal.ver") || temPermissao("fiscal.gerenciar") || temPermissao("configuracoes.editar")); }
function podeGerenciarFiscal() { return usuarioLogado() && (usuarioAdministrador() || temPermissao("fiscal.gerenciar") || temPermissao("configuracoes.editar")); }

function getAuthHeaders(extraHeaders = {}) {
  return {
    ...extraHeaders,
    ...(adminSession?.token ? { Authorization: `Bearer ${adminSession.token}` } : {}),
  };
}

async function fetchAdmin(path, options = {}) {
  if (!usuarioLogado()) return null;

  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: getAuthHeaders(options.headers || {}),
  });

  if (response.status === 401) {
    tratarNaoAutorizado();
    return null;
  }

  return response;
}

function limparLogin() {
  adminSession = null;
  adminPinValue = "";
  sessionStorage.removeItem(ADMIN_PIN_SESSION_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
  atualizarAuthUi();
}

function atualizarAuthUi() {
  const logoutBtn = $("#btnLogout");
  if (logoutBtn) logoutBtn.hidden = !usuarioLogado();
  $$(".admin-only").forEach(element => { element.hidden = !usuarioAdministrador(); });
  $$(".pdv-only").forEach(element => { element.hidden = !podeAcessarPdv(); });
  $$(".labels-only").forEach(element => { element.hidden = !podeAcessarEtiquetas(); });
  $$(".orders-only").forEach(element => { element.hidden = !podeVerPedidosSite(); });
  $$(".fiscal-only").forEach(element => { element.hidden = !podeGerenciarFiscal(); });
  $$(".mp-only").forEach(element => { element.hidden = usuarioAdministrador() || !(temPermissao("mercado_pago.configurar") || temPermissao("configuracoes.editar")); });
  if ($("#storyTrack")) buildStoryNav();
}

function solicitarPin(callback) {
  pendingPinAction = callback;
  $("#pinError").textContent = "";
  $("#pinForm").reset();
  openModal("#pinModal");
  setTimeout(() => $("#adminPin")?.focus(), 50);
}

async function validarPin(event) {
  event.preventDefault();
  const pin = $("#adminPin").value;
  const response = await fetchAdmin("/admin/validar-pin", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin })
  });
  const data = await response?.json().catch(() => ({}));
  if (!response?.ok) { $("#pinError").textContent = data.message || "PIN inválido."; return; }
  adminPinValue = pin;
  sessionStorage.setItem(ADMIN_PIN_SESSION_KEY, "true");
  closeModal("#pinModal");
  const action = pendingPinAction; pendingPinAction = null;
  if (action) action();
}

function comPin(callback) {
  if (adminPinValue && sessionStorage.getItem(ADMIN_PIN_SESSION_KEY) === "true") callback(adminPinValue);
  else solicitarPin(() => callback(adminPinValue));
}

function abrirLoginAdmin(callback = null) {
  pendingAdminAction = typeof callback === "function" ? callback : null;
  const error = $("#loginError");
  if (error) error.textContent = "";
  const form = $("#loginForm");
  if (form) form.reset();
  openModal("#loginModal");
  setTimeout(() => $("#loginEmail")?.focus(), 60);
}

function fecharLoginAdmin() {
  closeModal("#loginModal");
}

function cancelarLoginAdmin() {
  pendingAdminAction = null;
  fecharLoginAdmin();
}

function logoutAdmin() {
  pdvCart = [];
  pdvCaixa = null;
  pdvMaquininhas = [];
  pdvFrete = null;
  ultimaVendaPdv = null;
  etiquetasSelecionadas = [];
  if ($("#receiptPrintArea")) $("#receiptPrintArea").innerHTML = "";
  limparLogin();
  showToast("Sessao administrativa encerrada");
  if (ADMIN_SCREENS.has($(".screen.active")?.id?.replace("screen-", ""))) {
    navigate("home");
  }
}

function tratarNaoAutorizado() {
  limparLogin();
  showToast("Sessão expirada ou token inválido. Entre novamente.");
  abrirLoginAdmin();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = $("#loginEmail").value.trim();
  const senha = $("#loginSenha").value;
  const error = $("#loginError");
  const submit = $("#loginSubmit");

  if (error) error.textContent = "";
  if (submit) {
    submit.disabled = true;
    submit.textContent = "Entrando...";
  }

  try {
    const response = await fetch(API_BASE_URL + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Nao foi possivel entrar");

    salvarSessaoAdmin({
      token: data.token,
      usuario: data.usuario,
      permissoes: data.permissoes || [],
    });
    if (!usuarioAdministrador() && !temPermissao("pdv.acessar") && !temPermissao("vendas.criar") && !temPermissao("relatorios.ver") && !temPermissao("configuracoes.editar") && !temPermissao("fiscal.ver") && !temPermissao("fiscal.gerenciar") && !temPermissao("mercado_pago.configurar") && !temPermissao("produtos.editar") && !temPermissao("etiquetas.imprimir")) {
      limparLogin();
      throw new Error("Usuário sem permissão para acessar áreas administrativas.");
    }
    fecharLoginAdmin();
    showToast("Login realizado com sucesso");
    if (usuarioAdministrador()) {
      await Promise.allSettled([
        carregarEstoqueDaApi(), carregarMovimentacoesDaApi(), carregarFornecedoresDaApi(),
        carregarClientesDaApi(), carregarFretesBairro(),
      ]);
    }
    const action = pendingAdminAction;
    pendingAdminAction = null;
    if (action) action();
  } catch (err) {
    if (error) error.textContent = err.message || "Falha ao fazer login";
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  }
}

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
  const raw = value.toLowerCase();
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mojibakeUnico = String.fromCharCode(0x00e3, 0x0161) + "nico";
  const seedCorrompidoUnico = String.fromCharCode(0x012f) + "snico";

  if (
    raw === "\u00fanico" ||
    raw === "unico" ||
    normalized === "unico" ||
    normalized === "nico" ||
    raw.includes(mojibakeUnico) ||
    raw.includes(seedCorrompidoUnico) ||
    raw.includes("?nico")
  ) {
    return "\u00DAnico";
  }

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
    medidas: Array.isArray(produto.medidas) ? produto.medidas : [],
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
  const endpoints = ["/public/produtos", "/produtos"];
  let ultimoErro = null;

  try {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Resposta inv?lida de produtos");

        const produtosApi = data.map(adaptarProdutoApi).filter(p => p.id && p.ativo);
        products = produtosApi;
        atualizarProdutosNaTela();
        return;
      } catch (error) {
        ultimoErro = error;
      }
    }

    throw ultimoErro || new Error("API de produtos indispon?vel");
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
  if (!usuarioLogado()) return;

  try {
    const response = await fetchAdmin("/estoque");
    if (!response) return;
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
  if (!usuarioLogado()) return;

  try {
    const response = await fetchAdmin("/movimentacoes");
    if (!response) return;
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta invalida de movimentacoes");
    stockMovements = data.map(adaptarMovimentacaoApi);
    renderMovements();
  } catch (error) {
    console.info("API de movimentacoes indisponivel. Mantendo movimentacoes mockadas.", error);
  }
}

function adaptarFornecedorApi(fornecedor) {
  const cidadeEstado = [fornecedor.cidade, fornecedor.estado].filter(Boolean).join(", ");
  const ativo = String(fornecedor.status || "").toLowerCase() !== "inativo";

  return {
    id: Number(fornecedor.id) || 0,
    name: fornecedor.nome || "Fornecedor sem nome",
    segment: fornecedor.categoria_fornecida || "Categoria nao informada",
    city: cidadeEstado || "Cidade nao informada",
    contact: fornecedor.contato || fornecedor.email || "Contato nao informado",
    phone: fornecedor.whatsapp || "WhatsApp nao informado",
    status: ativo ? "Ativo" : "Inativo",
    delivery: "Sob consulta",
    lastOrder: fornecedor.ultima_compra || "Sem compra registrada",
    rating: ativo ? "Ativo" : "Inativo",
  };
}

async function carregarFornecedoresDaApi() {
  if (!usuarioLogado()) return;

  try {
    const response = await fetchAdmin("/fornecedores");
    if (!response) return;
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta invalida de fornecedores");
    const fornecedoresApi = data.map(adaptarFornecedorApi).filter(s => s.id && s.name);
    if (!fornecedoresApi.length) return;
    suppliers.splice(0, suppliers.length, ...fornecedoresApi);
    renderSuppliers();
  } catch (error) {
    console.info("API de fornecedores indisponivel. Mantendo fornecedores mockados.", error);
  }
}

async function carregarClientesDaApi() {
  if (!usuarioLogado()) return;

  try {
    const response = await fetchAdmin("/clientes");
    if (!response) return;
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta invalida de clientes");
    clientesApiRows = data;
  } catch (error) {
    clientesApiRows = null;
    console.info("API de clientes indisponivel. Mantendo fluxo sem clientes reais.", error);
  }
}

function freightNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function filteredFretesBairro() {
  const term = ($("#freightSearch")?.value || "").trim().toLowerCase();
  return fretesBairro.filter(frete => {
    const ativo = frete.ativo !== false;
    const statusOk = freightStatusFilter === "todos"
      || (freightStatusFilter === "ativos" && ativo)
      || (freightStatusFilter === "inativos" && !ativo);
    const text = `${frete.bairro || ""} ${frete.cidade || ""}`.toLowerCase();
    return statusOk && (!term || text.includes(term));
  });
}

function renderFreightSummary() {
  const total = fretesBairro.length;
  const ativos = fretesBairro.filter(frete => frete.ativo !== false).length;
  const valores = fretesBairro.map(frete => freightNumber(frete.valor)).filter(valor => valor >= 0);
  const menor = valores.length ? Math.min(...valores) : 0;
  const maior = valores.length ? Math.max(...valores) : 0;
  const items = [
    { label: "Bairros cadastrados", value: total },
    { label: "Bairros ativos", value: ativos },
    { label: "Menor frete", value: money(menor) },
    { label: "Maior frete", value: money(maior) },
  ];

  $("#freightSummary").innerHTML = items.map(item => `
    <div class="freight-stat">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");
}

function renderFretesBairro() {
  const table = $("#freightTable");
  if (!table) return;

  renderFreightSummary();
  const rows = filteredFretesBairro();

  table.innerHTML = `
    <thead>
      <tr>
        <th>Bairro</th><th>Cidade</th><th>Estado</th><th>Valor</th><th>Prazo</th><th>Status</th><th>Ações</th>
      </tr>
    </thead>
    <tbody>
      ${rows.length ? rows.map(frete => `
        <tr>
          <td>${frete.bairro || "-"}</td>
          <td>${frete.cidade || "-"}</td>
          <td>${frete.estado || "SP"}</td>
          <td>${money(freightNumber(frete.valor))}</td>
          <td>${frete.prazo_estimado || "-"}</td>
          <td><span class="freight-status ${frete.ativo !== false ? "active" : "inactive"}">${frete.ativo !== false ? "Ativo" : "Inativo"}</span></td>
          <td>
            <div class="stock-actions">
              <button class="icon-btn edit" data-freight-edit="${frete.id}" type="button">Editar</button>
              <button class="icon-btn remove" data-freight-disable="${frete.id}" type="button">${freightDeactivateConfirmId === frete.id ? "Confirmar" : "Desativar"}</button>
            </div>
          </td>
        </tr>
      `).join("") : `<tr><td colspan="7">Nenhum frete encontrado.</td></tr>`}
    </tbody>
  `;

  $$("[data-freight-edit]", table).forEach(btn => {
    btn.addEventListener("click", () => editarFreteBairro(Number(btn.dataset.freightEdit)));
  });
  $$("[data-freight-disable]", table).forEach(btn => {
    btn.addEventListener("click", () => desativarFreteBairro(Number(btn.dataset.freightDisable)));
  });
}

async function carregarFretesBairro() {
  if (!usuarioLogado()) return;

  try {
    const response = await fetchAdmin("/fretes-bairro");
    if (!response) return;
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta invalida de fretes por bairro");
    fretesBairro = data;
    freightDeactivateConfirmId = null;
    renderFretesBairro();
  } catch (error) {
    console.info("API de fretes por bairro indisponivel.", error);
    showToast("Não foi possível carregar os fretes por bairro agora");
  }
}

function openFreightModal(frete = null) {
  $("#freightTitle").textContent = frete ? "Editar frete" : "Cadastrar frete";
  $("#freightId").value = frete?.id || "";
  $("#freightDistrict").value = frete?.bairro || "";
  $("#freightCity").value = frete?.cidade || "";
  $("#freightState").value = (frete?.estado || "SP").toUpperCase();
  $("#freightValue").value = frete ? freightNumber(frete.valor).toFixed(2) : "";
  $("#freightDeadline").value = frete?.prazo_estimado || "";
  $("#freightNotes").value = frete?.observacoes || "";
  $("#freightActive").checked = frete ? frete.ativo !== false : true;
  $("#freightError").textContent = "";
  openModal("#freightModal");
}

function closeFreightModal() {
  closeModal("#freightModal");
}

function freightFormPayload() {
  return {
    bairro: $("#freightDistrict").value.trim(),
    cidade: $("#freightCity").value.trim(),
    estado: ($("#freightState").value.trim() || "SP").toUpperCase(),
    valor: Number($("#freightValue").value),
    prazo_estimado: $("#freightDeadline").value.trim(),
    observacoes: $("#freightNotes").value.trim(),
    ativo: $("#freightActive").checked,
  };
}

async function salvarFreteBairro(event) {
  event.preventDefault();
  if (!usuarioLogado()) {
    abrirLoginAdmin(() => openFreightModal());
    return;
  }

  const id = $("#freightId").value;
  const payload = freightFormPayload();
  const error = $("#freightError");
  error.textContent = "";

  if (!payload.bairro || !payload.cidade || !Number.isFinite(payload.valor) || payload.valor < 0) {
    error.textContent = "Informe bairro, cidade e valor válido.";
    return;
  }

  try {
    const response = await fetchAdmin(id ? `/fretes-bairro/${id}` : "/fretes-bairro", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response) return;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Não foi possível salvar o frete.");
    closeFreightModal();
    showToast(id ? "Frete atualizado com sucesso" : "Frete cadastrado com sucesso");
    await carregarFretesBairro();
  } catch (err) {
    error.textContent = err.message || "Não foi possível salvar o frete.";
  }
}

function editarFreteBairro(id) {
  const frete = fretesBairro.find(item => Number(item.id) === Number(id));
  if (!frete) {
    showToast("Frete não encontrado");
    return;
  }
  openFreightModal(frete);
}

async function desativarFreteBairro(id) {
  if (freightDeactivateConfirmId !== id) {
    freightDeactivateConfirmId = id;
    renderFretesBairro();
    showToast("Clique em Confirmar para desativar o frete");
    return;
  }

  try {
    const response = await fetchAdmin(`/fretes-bairro/${id}`, { method: "DELETE" });
    if (!response) return;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Não foi possível desativar o frete.");
    showToast("Frete desativado com sucesso");
    await carregarFretesBairro();
  } catch (err) {
    showToast(err.message || "Não foi possível desativar o frete");
  }
}

function buildStoryNav() {
  const track = $("#storyTrack");
  track.innerHTML = NAV_ITEMS.filter(item => !ADMIN_SCREENS.has(item.screen) || usuarioAdministrador()).map(item => `
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
  if (screen === "pdv" && !podeAcessarPdv()) {
    if (usuarioLogado()) {
      showToast("Você não tem permissão para acessar o PDV.");
      return;
    }
    abrirLoginAdmin(() => navigate(screen, category));
    return;
  }
  if (screen === "etiquetas" && !podeAcessarEtiquetas()) {
    if (usuarioLogado()) { showToast("Você não tem permissão para acessar Códigos e Etiquetas."); return; }
    abrirLoginAdmin(() => navigate(screen, category)); return;
  }
  if (screen === "pedidos-site" && !podeVerPedidosSite()) {
    if (usuarioLogado()) { showToast("Você não tem permissão para acessar Pedidos do Site."); return; }
    abrirLoginAdmin(() => navigate(screen, category)); return;
  }
  if (screen === "fiscal" && !podeGerenciarFiscal()) { if(usuarioLogado()){showToast("Você não tem permissão para acessar a área fiscal.");return;} abrirLoginAdmin(()=>navigate(screen));return; }
  if (screen === "maquininhas" && !usuarioAdministrador() && !temPermissao("mercado_pago.configurar") && !temPermissao("configuracoes.editar")) { showToast("Você não tem permissão para acessar Mercado Pago."); return; }
  if (ADMIN_SCREENS.has(screen) && !["pdv", "etiquetas", "pedidos-site", "fiscal", "maquininhas"].includes(screen) && !usuarioAdministrador()) {
    abrirLoginAdmin(() => navigate(screen, category));
    return;
  }
  if (screen === "maquininhas" && (!adminPinValue || sessionStorage.getItem(ADMIN_PIN_SESSION_KEY) !== "true")) {
    solicitarPin(() => navigate(screen, category));
    return;
  }

  $$(".screen").forEach(s => s.classList.remove("active"));
  const target = $(`#screen-${screen}`);
  if (target) target.classList.add("active");

  // marca link da navbar ativo
  $$(".nav-link").forEach(b => b.classList.remove("active"));
  const navMap = { home: "home", catalogo: "catalogo", pdv: "pdv", gestao: "gestao", movimentacoes: "movimentacoes", fornecedores: "fornecedores", maquininhas: "maquininhas", etiquetas: "etiquetas", "pedidos-site": "pedidos-site", fiscal:"fiscal" };
  const activeNav = $(`.nav-link[data-nav="${navMap[screen]}"]`);
  if (activeNav) activeNav.classList.add("active");

  // catálogo com categoria
  if (screen === "catalogo") {
    activeCategory = category;
    renderFilters();
    renderCatalog();
  }
  if (screen === "gestao") {
    renderStockTable();
    renderFretesBairro();
    carregarUsuariosAdmin();
    carregarFretesBairro();
  }
  if (screen === "maquininhas") { carregarMaquininhas(); carregarConfigMercadoPago(); }
  if (screen === "pdv") iniciarPdvLoja();
  if (screen === "etiquetas") iniciarEtiquetas();
  if (screen === "checkout-publico") renderCart();
  if (screen === "pedidos-site") carregarPedidosSite();
  if (screen === "fiscal") iniciarFiscal();
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
function mediaUrl(url) { const value=String(url||"");return value.startsWith("/uploads/")?`${API_BASE_URL.replace(/\/api$/,"")}${value}`:value; }

function mainProductImage(p) {
  const midias = productMedia(p);
  return midias.find(m => m.tipo === "imagem" && m.principal) || midias.find(m => m.tipo === "imagem") || null;
}

function productHasVideo(p) {
  return productMedia(p).some(m => m.tipo === "video");
}

function mediaAlt(media, p) {
  return media?.alt_text || media?.titulo || p.name;
}

function renderMediaStage(media, p, color) {
  if (media?.tipo === "video") {
    const poster = mediaUrl(mainProductImage(p)?.url || "");
    return `<video class="detail-media-main" controls preload="metadata" ${poster ? `poster="${poster}"` : ""}>
      <source src="${mediaUrl(media.url)}" />
      Seu navegador n?o suporta v?deo HTML5.
    </video>`;
  }

  if (media?.tipo === "imagem") {
    return `<img class="detail-media-main" src="${mediaUrl(media.url)}" alt="${mediaAlt(media, p)}" onerror="this.closest('.detail-media-stage').classList.add('media-error');this.hidden=true" />
      <div class="detail-visual detail-visual-fallback"><strong>Sem foto cadastrada</strong></div>`;
  }

  return `<div class="detail-visual"><strong>Sem foto cadastrada</strong></div>`;
}

function renderMediaThumb(media, index, active) {
  const videoMark = media.tipo === "video" ? `<span class="media-play">Play</span>` : "";
  const preview = media.tipo === "imagem"
    ? `<img src="${mediaUrl(media.url)}" alt="${media.titulo || `Foto ${index + 1}`}" onerror="this.hidden=true" />`
    : `<span class="media-video-thumb">Vídeo</span>`;

  return `<button class="detail-media-thumb ${active ? "active" : ""}" type="button" data-detail-media="${index}" aria-label="Ver mídia ${index + 1}">
    ${preview}${videoMark}<small>${index + 1}</small>
  </button>`;
}

function bindDetailGallery(p, color) {
  const midias = productMedia(p);
  const stage = $("#detailMediaStage");
  if (!stage || !midias.length) return;

  $$('[data-detail-media]').forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.detailMedia);
      const media = midias[index];
      if (!media) return;
      stage.classList.remove("media-error");
      stage.innerHTML = renderMediaStage(media, p, color);
      $$('[data-detail-media]').forEach(item => item.classList.remove("active"));
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
      ${mainImage ? `<span class="shop-photo-fallback">Sem foto cadastrada</span><img class="shop-thumb-img" src="${mediaUrl(mainImage.url)}" alt="${mediaAlt(mainImage, p)}" loading="lazy" onerror="this.hidden=true" />` : '<span class="shop-photo-fallback">Sem foto cadastrada</span>'}
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
  return p.description || "";
}

function measurementRows(rows=[]) {
  return rows.map(r => `<tr><td>${escaparHtml(r.tamanho||"—")}</td><td>${escaparHtml(r.busto||"—")}</td><td>${escaparHtml(r.cintura||"—")}</td><td>${escaparHtml(r.quadril||"—")}</td><td>${escaparHtml(r.comprimento||"—")}</td><td>${escaparHtml(r.observacao||"")}</td></tr>`).join("");
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
        ${productDescription(p)?`<p class="detail-description">${escaparHtml(productDescription(p))}</p>`:""}
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
    ${p.medidas?.length?`<div class="detail-section">
      <h4>Tabela de medidas</h4>
      <table class="detail-measures">
        <thead><tr><th>Tam.</th><th>Busto</th><th>Cintura</th><th>Quadril</th><th>Comp.</th><th>Observação</th></tr></thead>
        <tbody>${measurementRows(p.medidas)}</tbody>
      </table>
    </div>`:""}
    <p class="detail-note">As informações podem variar conforme o modelo. Consulte a loja em caso de dúvida.</p>
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
  const vazio = `<div class="catalog-empty"><strong>Nenhum produto cadastrado ainda.</strong><span>A loja está preparando novidades para você.</span></div>`;
  $("#featuredGrid").innerHTML = featured.length ? featured.map(shopCard).join("") : vazio;
  bindBuyButtons($("#featuredGrid"));

  // novidades: os últimos cadastrados
  const news = [...products].slice(-4).reverse();
  $("#newsGrid").innerHTML = news.length ? news.map(shopCard).join("") : vazio;
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
    grid.innerHTML = `<div class="catalog-empty"><strong>Nenhum produto cadastrado ainda.</strong><span>A loja está preparando novidades para você.</span></div>`;
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

function localShippingKey() {
  const bairro = $("#customerDistrict")?.value.trim() || "";
  const cidade = $("#customerCity")?.value.trim() || "";
  const estado = ($("#customerState")?.value.trim() || "SP").toUpperCase();
  return `${bairro.toLowerCase()}|${cidade.toLowerCase()}|${estado}`;
}

function setShippingStatus(message = "", type = "") {
  const status = $("#shippingStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("ok", "warn");
  if (type) status.classList.add(type);
}

function resetLocalShippingQuote() {
  localShippingQuote = null;
  setShippingStatus("");
  updateCartTotals();
}

async function calcularFreteBairro() {
  const bairro = $("#customerDistrict")?.value.trim() || "";
  const cidade = $("#customerCity")?.value.trim() || "";
  const estado = ($("#customerState")?.value.trim() || "SP").toUpperCase();

  if (!bairro || !cidade) {
    localShippingQuote = { status: "missing", key: localShippingKey(), value: 0 };
    setShippingStatus("Informe cidade e bairro para calcular a entrega local.", "warn");
    updateCartTotals();
    return;
  }

  setShippingStatus("Calculando frete local...");

  const params = new URLSearchParams({ bairro, cidade, estado });

  try {
    const response = await fetch(`${API_BASE_URL}/public/frete-bairro?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      localShippingQuote = { status: "not_found", key: localShippingKey(), value: 0 };
      setShippingStatus("Ainda não atendemos esse bairro com entrega local. Consulte a loja pelo WhatsApp.", "warn");
      updateCartTotals();
      return;
    }

    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);

    const value = Number(data.valor);
    if (!Number.isFinite(value) || value < 0) throw new Error("Valor de frete inválido");

    localShippingQuote = {
      status: "found",
      key: localShippingKey(),
      value,
      prazo: data.prazo_estimado || "",
      bairro: data.bairro || bairro,
      cidade: data.cidade || cidade,
      estado: data.estado || estado,
    };

    setShippingStatus(`Entrega local: ${money(value)}${localShippingQuote.prazo ? ` · ${localShippingQuote.prazo}` : ""}`, "ok");
    updateCartTotals();
  } catch (error) {
    localShippingQuote = { status: "error", key: localShippingKey(), value: 0 };
    setShippingStatus("Não foi possível calcular o frete agora. O carrinho continua funcionando normalmente.", "warn");
    updateCartTotals();
    console.info("API de frete por bairro indisponível.", error);
  }
}

function getShippingData() {
  const deliveryType = $("input[name='publicDelivery']:checked")?.value || "retirada";
  const option = DELIVERY_OPTIONS[deliveryType] || DELIVERY_OPTIONS.retirada;
  const customValue = parseFloat($("#customShippingValue")?.value || "0") || 0;
  const localKey = localShippingKey();
  const hasLocalAddress = Boolean($("#customerDistrict")?.value.trim() || $("#customerCity")?.value.trim());
  const localQuoteIsCurrent = localShippingQuote?.key === localKey;
  let shippingValue = deliveryType === "personalizado" ? Math.max(0, customValue) : option.price;

  if (deliveryType === "local") {
    if (localQuoteIsCurrent && localShippingQuote.status === "found") {
      shippingValue = localShippingQuote.value;
    } else {
      shippingValue = 0;
    }
  }

  return {
    cep: $("#customerCep")?.value.trim() || "",
    city: $("#customerCity")?.value.trim() || "",
    state: ($("#customerState")?.value.trim() || "SP").toUpperCase(),
    district: $("#customerDistrict")?.value.trim() || "",
    deliveryType,
    deliveryLabel: option.label,
    shippingValue,
    shippingDeadline: localQuoteIsCurrent ? localShippingQuote?.prazo || "" : "",
  };
}

function updateCartTotals() {
  if (!$("#cartSubtotal")) return;
  const subtotal = cartSubtotal();
  const shipping = getShippingData();
  const shippingValue = cart.length ? shipping.shippingValue : 0;
  $("#cartSubtotal").textContent = money(subtotal);
  $("#cartShipping").textContent = money(shippingValue);
  $("#cartTotal").textContent = money(subtotal + shippingValue);
  $("#customShippingWrap").classList.toggle("show", shipping.deliveryType === "personalizado");
  $("#localShippingWrap").classList.toggle("show", shipping.deliveryType === "local");
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

  const variacao = encontrarVariacaoApi(p, size, color);
  const existing = cart.find(i => i.id === id && i.size === size && i.color === color);
  if (existing) existing.qty += 1;
  else cart.push({
    id,
    productId: id,
    variacao_id: variacao ? Number(variacao.id) : null,
    name: p.name,
    price: p.price,
    size,
    color,
    qty: 1,
  });

  renderCart();
  updateCartBadge();
  showToast(`${p.name} (${size}) adicionado ao carrinho`);
}


function encontrarVariacaoApi(produto, size, color) {
  const variacoes = Array.isArray(produto.apiVariacoes) ? produto.apiVariacoes : [];
  const normalizedSize = normalizarTamanho(size);
  const normalizedColor = String(color || "").trim().toLowerCase();

  return variacoes.find(variacao => {
    const variationSize = normalizarTamanho(variacao.tamanho);
    const variationColor = String(variacao.cor || "").trim().toLowerCase();
    return variationSize === normalizedSize && variationColor === normalizedColor && Number(variacao.id) > 0;
  }) || null;
}

function montarPayloadVendaApi(shipping) {
  const itens = cart.map(item => {
    const produto = products.find(p => Number(p.id) === Number(item.id));
    const variacao = produto ? encontrarVariacaoApi(produto, item.size, item.color) : null;
    const variacaoId = Number(item.variacao_id || variacao?.id);

    return {
      produto_id: Number(item.productId || item.id),
      variacao_id: Number.isFinite(variacaoId) && variacaoId > 0 ? variacaoId : null,
      quantidade: Number(item.qty),
      preco_unitario: Number(item.price),
    };
  });

  if (itens.some(item => !item.produto_id || !item.variacao_id)) return null;

  return {
    cliente_id: null,
    itens,
    forma_pagamento: "pdv",
    desconto: 0,
    frete: shipping.shippingValue,
    observacoes: "Venda PDV - " + shipping.deliveryLabel + (shipping.cep ? " - CEP " + shipping.cep : ""),
  };
}

async function enviarVendaParaApi(venda) {
  const response = await fetchAdmin("/vendas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(venda),
  });
  if (!response) throw new Error("Login administrativo necessario para finalizar venda");

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Nao foi possivel finalizar a venda pela API");
  }

  return data;
}

function finalizarVendaMockada(shipping, apiVenda = null, options = {}) {
  const subtotal = cartSubtotal();
  const total = subtotal + shipping.shippingValue;
  const aplicarBaixaLocal = options.aplicarBaixaLocal !== false;
  const registrarMovimentacaoLocal = options.registrarMovimentacaoLocal !== false;
  const saleItems = cart.map(i => ({ ...i, subtotal: i.price * i.qty }));

  if (aplicarBaixaLocal) {
    cart.forEach(i => {
      const p = products.find(x => Number(x.id) === Number(i.id));
      if (p) p.sizes[i.size] = Math.max(0, (p.sizes[i.size] || 0) - i.qty);
    });
  }

  sales.push({
    id: apiVenda?.id || nextSaleId++,
    date: apiVenda?.created_at || new Date().toISOString(),
    subtotal: Number(apiVenda?.subtotal ?? subtotal),
    shippingType: shipping.deliveryLabel,
    shippingCep: shipping.cep,
    shippingValue: Number(apiVenda?.frete_valor ?? shipping.shippingValue),
    total: Number(apiVenda?.total ?? total),
    items: saleItems,
  });

  if (registrarMovimentacaoLocal) {
    cart.forEach(i => {
      stockMovements.unshift({
        id: nextMovementId++,
        date: new Date().toISOString(),
        product: i.name,
        size: i.size,
        color: i.color,
        type: "Sa?da",
        quantity: i.qty,
        reason: "Venda PDV",
        responsible: "PDV",
      });
    });
  }

  cart = [];
  renderCart();
  updateCartBadge();
  renderHome();
  renderCatalog();
  renderPdv($("#pdvSearch").value);
  renderDashboard();
  renderStockTable();
  renderFretesBairro();
  renderMovements();
  renderSuppliers();
  renderHistory();
}

function renderCart() {
  const box = $("#cartItems");
  if (!box) return;
  const emptyActions = $("#publicCartEmptyActions");
  if (emptyActions) emptyActions.hidden = Boolean(cart.length);
  if (!cart.length) {
    box.innerHTML = "";
    updateCartTotals();
    return;
  }

  box.innerHTML = cart.map((i, idx) => `
    <div class="cart-row public-cart-row">
      <div class="info">
        <div class="name">${i.name}</div>
        <div class="meta">Tam: ${i.size} · Cor: ${i.color}</div>
        <div class="sub">${money(i.price * i.qty)}</div>
      </div>
      <div class="qty-control"><button data-public-minus="${idx}" type="button">−</button><span>${i.qty}</span><button data-public-plus="${idx}" type="button">+</button></div>
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
  $$('[data-public-minus]', box).forEach(button => button.addEventListener("click", () => alterarQuantidadeCarrinhoPublico(Number(button.dataset.publicMinus), -1)));
  $$('[data-public-plus]', box).forEach(button => button.addEventListener("click", () => alterarQuantidadeCarrinhoPublico(Number(button.dataset.publicPlus), 1)));

  updateCartTotals();
}

function alterarQuantidadeCarrinhoPublico(index, delta) {
  const item = cart[index]; if (!item) return;
  const produto = products.find(p => Number(p.id) === Number(item.id));
  const estoque = Number(produto?.sizes?.[item.size] || 0);
  if (delta > 0 && item.qty >= estoque) return showToast("Quantidade limitada ao estoque disponível.");
  item.qty += delta; if (item.qty <= 0) cart.splice(index, 1); renderCart(); updateCartBadge();
}

function updateCartBadge() {
  const count = cart.reduce((sum, i) => sum + i.qty, 0);
  $("#cartBadge").textContent = count;
}

async function checkout() {
  if (!cart.length) { showToast("Adicione itens ao carrinho primeiro"); return; }
  const shipping = getShippingData();
  const nome = $("#publicCustomerName").value.trim(), telefone = $("#publicCustomerPhone").value.trim();
  const local = shipping.deliveryType === "local";
  const error = $("#publicCheckoutError"); error.textContent = "";
  if (!nome || !telefone) return error.textContent = "Informe nome e telefone/WhatsApp.";
  if (local && localShippingQuote?.status !== "found") return error.textContent = "Calcule o frete local antes de finalizar.";
  if (local && (!["#customerCity","#customerDistrict","#publicAddress","#publicAddressNumber"].every(id => $(id).value.trim()))) return error.textContent = "Preencha cidade, bairro, endereço e número.";
  const itens = cart.map(item => ({ produto_id:Number(item.productId || item.id), variacao_id:Number(item.variacao_id), quantidade:Number(item.qty), preco_unitario:Number(item.price) }));
  if (itens.some(item => !item.variacao_id)) return error.textContent = "Uma variação do carrinho não está disponível. Remova-a e adicione novamente.";
  const payload = { cliente:{ nome,telefone,email:$("#publicCustomerEmail").value.trim()||null }, itens, tipo_entrega:local?"entrega_local":"retirada", forma_pagamento:$("input[name='publicPayment']:checked").value, frete:shipping.shippingValue, observacoes:$("#publicOrderNotes").value.trim()||null };
  if (local) payload.entrega={ destinatario_nome:nome,destinatario_telefone:telefone,estado:shipping.state,cidade:shipping.city,bairro:shipping.district,endereco:$("#publicAddress").value.trim(),numero:$("#publicAddressNumber").value.trim(),complemento:$("#publicComplement").value.trim()||null,referencia:$("#publicReference").value.trim()||null };
  const button=$("#btnCheckout"); button.disabled=true; button.textContent="Enviando pedido...";
  try {
    const response=await fetch(`${API_BASE_URL}/public/checkout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.message||"Não foi possível finalizar o pedido.");
    cart=[];localShippingQuote=null;renderCart();updateCartBadge();$("#publicCheckoutContent").hidden=true;const mensagem=encodeURIComponent(`Olá! Acabei de fazer o pedido #${data.venda_id} pelo site.`);$("#publicOrderSuccess").hidden=false;$("#publicOrderSuccess").innerHTML=`<div class="success-mark">✓</div><h3>Pedido recebido com sucesso!</h3><p>Número do pedido: <strong>#${data.venda_id}</strong></p><p>A loja entrará em contato para confirmar o pagamento e a entrega.</p><a class="btn btn-pink" href="https://wa.me/5511999990000?text=${mensagem}" target="_blank" rel="noopener">Chamar no WhatsApp</a><button class="btn btn-ghost" id="publicContinueShopping" type="button">Continuar comprando</button>`;$("#publicContinueShopping").onclick=fecharCheckoutPublico;
    if (["cartao", "pix"].includes(payload.forma_pagamento)) {
      $("#publicOrderSuccess").insertAdjacentHTML("beforeend", '<p class="mp-checkout-note">A loja enviará o link de pagamento Mercado Pago após conferir seu pedido.</p>');
    }
    await carregarProdutosDaApi();
  } catch(err) { error.textContent=err.message||"Backend indisponível. Tente novamente."; }
  finally { button.disabled=false;button.textContent="Finalizar pedido"; }
}

function abrirCheckoutPublico() {
  $("#publicCheckoutContent").hidden = false;
  $("#publicOrderSuccess").hidden = true;
  $("#publicCheckoutError").textContent = "";
  renderCart();
  navigate("checkout-publico");
}
function fecharCheckoutPublico() { navigate("catalogo"); }

/* ----------------- PDV ----------------- */
function renderPdv(filter = "") {
  const term = filter.toLowerCase();
  const list = products.filter(p => p.name.toLowerCase().includes(term) && totalStock(p) > 0);
  const grid = $("#pdvGrid");
  if (!grid) return;

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
  if (Array.isArray(estoqueApiRows)) {
    const categorias=[...new Set(estoqueApiRows.map(r=>r.categoria).filter(Boolean))].sort();const categoriaAtual=$("#stockV2Category").value;$("#stockV2Category").innerHTML='<option value="">Todas as categorias</option>'+categorias.map(c=>`<option ${c===categoriaAtual?'selected':''}>${escaparHtml(c)}</option>`).join('');
    const termo=$("#stockV2Search").value.trim().toLowerCase(),statusFiltro=$("#stockV2Status").value,categoriaFiltro=$("#stockV2Category").value;const filtrados=estoqueApiRows.filter(r=>!termo||[r.produto_nome,r.sku,r.codigo_barras,r.codigo_interno,r.cor,r.tamanho].some(v=>String(v||'').toLowerCase().includes(termo))).filter(r=>!categoriaFiltro||r.categoria===categoriaFiltro).filter(r=>!statusFiltro||r.status===statusFiltro);
    const produtosTotal=new Set(estoqueApiRows.map(r=>r.produto_id)).size,baixos=estoqueApiRows.filter(r=>r.status==='baixo').length,zerados=estoqueApiRows.filter(r=>r.status==='zerado').length;$("#stockV2Summary").innerHTML=[["Produtos",produtosTotal],["Variações",estoqueApiRows.length],["Estoque baixo",baixos],["Zerados",zerados]].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join('');
    const header = `<thead><tr><th>Produto</th><th>Variação</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead>`;
    const rows = filtrados.map(row => `<tr data-stock-detail="${row.variacao_id}"><td data-label="Produto"><strong>${escaparHtml(row.produto_nome)}</strong><small>${escaparHtml(row.categoria||"—")}</small></td><td data-label="Variação">${escaparHtml([row.tamanho,row.cor].filter(Boolean).join(" / "))}</td><td data-label="Estoque"><strong>${row.quantidade} un.</strong></td><td data-label="Status"><span class="tag-status ${row.status==='zerado'?'tag-zero':row.status==='baixo'?'tag-low':''}">${row.status==='zerado'?'Zerado':row.status==='baixo'?'Baixo':'Normal'}</span></td><td data-label="Ações"><div class="stock-actions"><button class="btn btn-ghost btn-sm" data-detail-button="${row.variacao_id}" type="button">Ver detalhes</button><button class="btn btn-pink btn-sm" data-stock-move="${row.variacao_id}" data-stock-label="${escaparHtml(row.produto_nome)} — ${escaparHtml(row.tamanho)}/${escaparHtml(row.cor)}" type="button">Movimentar</button></div></td></tr>`).join("");
    table.innerHTML=header+`<tbody>${rows||'<tr><td colspan="5">Nenhuma variação encontrada.</td></tr>'}</tbody>`;
    $$('[data-stock-move]',table).forEach(b=>b.addEventListener("click",()=>abrirMovimentoEstoque(b)));
    $$('[data-detail-button]',table).forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();abrirDetalheEstoque(Number(b.dataset.detailButton));}));$$('[data-stock-detail]',table).forEach(row=>row.addEventListener("click",e=>{if(!e.target.closest('button'))abrirDetalheEstoque(Number(row.dataset.stockDetail));}));
    return;
  }
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

/* ----------------- PEDIDOS DO SITE ----------------- */
function rotuloStatusPedido(status) {
  return ({ pendente:"Pendente", pago:"Pago", cancelado:"Cancelado", sem_entrega:"Sem entrega", separando:"Separando", pronto_retirada:"Pronto para retirada", saiu_entrega:"Saiu para entrega", entregue:"Entregue" })[status] || String(status || "—").replaceAll("_", " ");
}

function classeStatusPedido(status) {
  if (["pago", "entregue"].includes(status)) return "success";
  if (["cancelado", "cancelada"].includes(status)) return "danger";
  if (["separando", "pronto_retirada", "saiu_entrega"].includes(status)) return "info";
  return "warning";
}

function atualizarResumoPedidosSite() {
  const resumo = $("#siteOrdersSummary");
  if (!resumo) return;
  const pendentes = pedidosSite.filter(p => p.status !== "cancelada" && p.status_entrega !== "entregue").length;
  const pagamentos = pedidosSite.filter(p => p.status_pagamento === "pendente").length;
  const andamento = pedidosSite.filter(p => ["separando", "pronto_retirada", "saiu_entrega"].includes(p.status_entrega)).length;
  const concluidos = pedidosSite.filter(p => p.status_entrega === "entregue").length;
  resumo.innerHTML = `<div class="stat-card"><span>Pedidos pendentes</span><strong>${pendentes}</strong></div><div class="stat-card"><span>Pagamentos pendentes</span><strong>${pagamentos}</strong></div><div class="stat-card"><span>Prontos/em andamento</span><strong>${andamento}</strong></div><div class="stat-card"><span>Entregues/concluídos</span><strong>${concluidos}</strong></div>`;
}

function renderPedidosSite() {
  const table = $("#siteOrdersTable");
  if (!table) return;
  atualizarResumoPedidosSite();
  if (!pedidosSite.length) {
    table.innerHTML = `<tbody><tr><td><p class="empty-note">Nenhum pedido encontrado para os filtros selecionados.</p></td></tr></tbody>`;
    return;
  }
  table.innerHTML = `<thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Entrega</th><th>Data</th><th>Ações</th></tr></thead><tbody>${pedidosSite.map(p => `<tr><td data-label="Pedido"><strong>#${p.id}</strong><small>${escaparHtml(p.tipo_entrega === "entrega_local" ? "Entrega local" : "Retirada")}</small></td><td data-label="Cliente"><strong>${escaparHtml(p.cliente || "Cliente")}</strong><small>${escaparHtml(p.telefone || "Sem telefone")}</small></td><td data-label="Total"><strong>${formatarMoeda(p.total)}</strong></td><td data-label="Pagamento"><span class="order-status ${classeStatusPedido(p.status_pagamento)}">${escaparHtml(rotuloStatusPedido(p.status_pagamento))}</span><small>${escaparHtml(rotuloStatusPedido(p.forma_pagamento))}</small></td><td data-label="Entrega"><span class="order-status ${classeStatusPedido(p.status_entrega)}">${escaparHtml(rotuloStatusPedido(p.status_entrega))}</span><small>${escaparHtml([p.bairro,p.cidade].filter(Boolean).join(" / ") || "—")}</small></td><td data-label="Data">${new Date(p.created_at).toLocaleString("pt-BR")}</td><td data-label="Ações"><button class="btn btn-ghost btn-sm" data-site-order="${p.id}" type="button">Ver detalhes</button></td></tr>`).join("")}</tbody>`;
  $$('[data-site-order]', table).forEach(button => button.addEventListener("click", () => abrirPedidoSite(Number(button.dataset.siteOrder))));
}

async function carregarPedidosSite() {
  if (!podeVerPedidosSite()) return;
  const status = $("#siteOrdersStatus");
  status.textContent = "Carregando pedidos...";
  const params = new URLSearchParams();
  const filtros = { busca:$("#siteOrdersSearch").value.trim(), status_pagamento:$("#siteOrdersPaymentFilter").value, status_entrega:$("#siteOrdersDeliveryFilter").value, tipo_entrega:$("#siteOrdersTypeFilter").value, data_inicio:$("#siteOrdersStart").value, data_fim:$("#siteOrdersEnd").value };
  Object.entries(filtros).forEach(([key,value]) => { if (value) params.set(key,value); });
  try {
    const response = await fetchAdmin(`/pedidos-site${params.size ? `?${params}` : ""}`);
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) throw new Error(data.message || "Não foi possível carregar os pedidos.");
    pedidosSite = Array.isArray(data) ? data : [];
    renderPedidosSite();
    status.textContent = `${pedidosSite.length} pedido(s) encontrado(s).`;
  } catch (error) { status.textContent = error.message || "Backend indisponível."; }
}

function montarEnderecoPedidoSite(entrega) {
  if (!entrega) return "Retirada na loja";
  return [entrega.endereco, entrega.numero, entrega.complemento, entrega.bairro, entrega.cidade, entrega.estado].filter(Boolean).join(", ");
}

function linkWhatsappPedidoSite(pedido, mensagem) {
  const telefone = String(pedido.telefone || pedido.whatsapp || pedido.entrega?.destinatario_telefone || "").replace(/\D/g, "");
  const destino = telefone ? (telefone.startsWith("55") ? telefone : `55${telefone}`) : "5511999990000";
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensagem)}`;
}

function mensagemWhatsappPedidoSite(pedido) {
  if (pedido.status_entrega === "pronto_retirada") return `Seu pedido #${pedido.id} está pronto para retirada.`;
  if (pedido.status_entrega === "saiu_entrega") return `Seu pedido #${pedido.id} saiu para entrega.`;
  return `Olá! Recebemos seu pedido #${pedido.id} no site da Gisele Flávia Modas. Vamos confirmar o pagamento e a entrega.`;
}

function montarHtmlDetalhePedidoSite(pedido) {
  const itens = (pedido.itens || []).map(i => `<tr><td>${escaparHtml(i.produto_nome)}</td><td>${escaparHtml(i.tamanho || "—")}</td><td>${escaparHtml(i.cor || "—")}</td><td>${i.quantidade}</td><td>${formatarMoeda(i.subtotal)}</td></tr>`).join("");
  const operar = podeOperarPedidosSite() && pedido.status !== "cancelada";
  const retirada = !pedido.entrega;
  const opcoes = (retirada ? ["separando","pronto_retirada","entregue"] : ["pendente","separando","saiu_entrega","entregue"]).map(s => `<option value="${s}" ${pedido.status_entrega===s?"selected":""}>${rotuloStatusPedido(s)}</option>`).join("");
  const mensagem = mensagemWhatsappPedidoSite(pedido);
  return `<div class="site-order-meta"><div><span>Cliente</span><strong>${escaparHtml(pedido.cliente || "—")}</strong><small>${escaparHtml(pedido.telefone || pedido.whatsapp || "—")} · ${escaparHtml(pedido.email || "E-mail não informado")}</small></div><div><span>Total</span><strong>${formatarMoeda(pedido.total)}</strong><small>${escaparHtml(rotuloStatusPedido(pedido.forma_pagamento))}</small></div><div><span>Pagamento</span><strong>${escaparHtml(rotuloStatusPedido(pedido.status_pagamento))}</strong></div><div><span>Entrega</span><strong>${escaparHtml(rotuloStatusPedido(pedido.status_entrega))}</strong><small>${escaparHtml(montarEnderecoPedidoSite(pedido.entrega))}</small></div></div><h4>Itens</h4><div class="stock-table-wrap"><table class="history-items"><thead><tr><th>Produto</th><th>Tam.</th><th>Cor</th><th>Qtd.</th><th>Subtotal</th></tr></thead><tbody>${itens || '<tr><td colspan="5">Sem itens.</td></tr>'}</tbody></table></div>${pedido.observacoes?`<div class="admin-notice"><strong>Observações:</strong> ${escaparHtml(pedido.observacoes)}</div>`:""}<div class="site-order-actions"><a class="btn btn-ghost" href="${linkWhatsappPedidoSite(pedido,mensagem)}" target="_blank" rel="noopener">Abrir WhatsApp</a><button class="btn btn-ghost" id="siteOrderPrint" type="button">Imprimir separação</button>${operar&&pedido.status_pagamento!=="pago"?'<button class="btn btn-pink" id="siteOrderPay" type="button">Confirmar pagamento</button>':""}${operar?`<select id="siteOrderDeliveryStatus">${opcoes}</select><button class="btn btn-ghost" id="siteOrderUpdateDelivery" type="button">Atualizar entrega</button><button class="btn btn-danger" id="siteOrderCancel" type="button">Cancelar pedido</button>`:""}</div><p class="login-error" id="siteOrderActionError"></p>`;
}

async function abrirPedidoSite(id) {
  try {
    const response = await fetchAdmin(`/pedidos-site/${id}`); const data = await response?.json().catch(() => ({}));
    if (!response?.ok) throw new Error(data.message || "Não foi possível abrir o pedido.");
    pedidoSiteAtual = data;
    $("#siteOrderModalTitle").textContent = `Pedido #${data.id}`;
    $("#siteOrderDetail").innerHTML = montarHtmlDetalhePedidoSite(data);
    if (data.status_pagamento === "pendente") {
      $(".site-order-actions", $("#siteOrderDetail"))?.insertAdjacentHTML("afterbegin", '<button class="btn btn-mp" id="siteOrderMercadoPago" type="button">Gerar link Mercado Pago</button>');
    }
    $(".site-order-actions", $("#siteOrderDetail"))?.insertAdjacentHTML("afterend", '<div class="mp-payment-result" id="siteOrderMpResult"><small>Pagamentos Mercado Pago são confirmados automaticamente pelo webhook quando configurado.</small></div>');
    openModal("#siteOrderModal");
    $("#siteOrderPrint")?.addEventListener("click", () => imprimirPedidoSite(pedidoSiteAtual));
    $("#siteOrderPay")?.addEventListener("click", confirmarPagamentoPedidoSite);
    $("#siteOrderUpdateDelivery")?.addEventListener("click", atualizarEntregaPedidoSite);
    $("#siteOrderCancel")?.addEventListener("click", cancelarPedidoSite);
    $("#siteOrderMercadoPago")?.addEventListener("click", () => gerarLinkMercadoPagoPedido(data));
    carregarLinkMercadoPagoExistente(data);
  } catch (error) { showToast(error.message || "Backend indisponível."); }
}

async function executarAcaoPedidoSite(path, body, confirmacao) {
  if (confirmacao && !confirm(confirmacao)) return;
  const error = $("#siteOrderActionError"); if (error) error.textContent = "Processando...";
  try {
    const response = await fetchAdmin(path, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body || {}) });
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) throw new Error(data.message || "Não foi possível concluir a ação.");
    showToast(data.message || "Pedido atualizado."); closeModal("#siteOrderModal"); await carregarPedidosSite();
  } catch (err) { if (error) error.textContent = err.message || "Backend indisponível."; }
}

function confirmarPagamentoPedidoSite() {
  const forma = pedidoSiteAtual?.forma_pagamento;
  executarAcaoPedidoSite(`/pedidos-site/${pedidoSiteAtual.id}/confirmar-pagamento`, { forma_pagamento_confirmada:forma, observacoes:"Pagamento confirmado pela loja" }, `Confirmar pagamento do pedido #${pedidoSiteAtual.id}?`);
}
function cancelarPedidoSite() { executarAcaoPedidoSite(`/pedidos-site/${pedidoSiteAtual.id}/cancelar`, {}, `Cancelar o pedido #${pedidoSiteAtual.id} e devolver os itens ao estoque?`); }
function atualizarEntregaPedidoSite() {
  const status = $("#siteOrderDeliveryStatus").value;
  executarAcaoPedidoSite(`/pedidos-site/${pedidoSiteAtual.id}/status-entrega`, { status_entrega:status }, `Atualizar o pedido #${pedidoSiteAtual.id} para “${rotuloStatusPedido(status)}”?`);
}

function imprimirPedidoSite(pedido) {
  if (!pedido) return showToast("Pedido não disponível para impressão.");
  const itens = (pedido.itens || []).map(i => `<tr><td>${escaparHtml(i.produto_nome)}</td><td>${escaparHtml([i.tamanho,i.cor].filter(Boolean).join(" / "))}</td><td>${i.quantidade}</td></tr>`).join("");
  $("#siteOrderPrintArea").innerHTML = `<h1>Pedido #${pedido.id}</h1><p><strong>Cliente:</strong> ${escaparHtml(pedido.cliente || "—")}</p><p><strong>Telefone:</strong> ${escaparHtml(pedido.telefone || pedido.whatsapp || "—")}</p><table><thead><tr><th>Produto</th><th>Variação</th><th>Qtd.</th></tr></thead><tbody>${itens}</tbody></table><p><strong>Recebimento:</strong> ${escaparHtml(pedido.entrega ? "Entrega local" : "Retirada na loja")}</p><p>${escaparHtml(montarEnderecoPedidoSite(pedido.entrega))}</p><p><strong>Total:</strong> ${formatarMoeda(pedido.total)}</p>${pedido.observacoes?`<p><strong>Observações:</strong> ${escaparHtml(pedido.observacoes)}</p>`:""}`;
  document.body.classList.add("printing-site-order");
  try { window.print(); } finally { document.body.classList.remove("printing-site-order"); }
}

/* ----------------- MERCADO PAGO — CHECKOUT PRO FASE 1 ----------------- */
function urlMercadoPago(data){return data?.url_pagamento||data?.sandbox_init_point||data?.init_point||"";}
function mostrarLinkMercadoPago(pedido,data){const box=$("#siteOrderMpResult");if(!box)return;const url=urlMercadoPago(data),status=data?.payment_status||data?.status||"criado";const mensagem=`Olá! Segue o link de pagamento do seu pedido #${pedido.id} na Gisele Flávia Modas: ${url}`;box.innerHTML=`<strong>Mercado Pago: ${escaparHtml(rotuloStatusPedido(status))}</strong>${url?`<a href="${escaparHtml(url)}" target="_blank" rel="noopener">${escaparHtml(url)}</a>`:""}<div>${url?`<a class="btn btn-mp btn-sm" href="${escaparHtml(url)}" target="_blank" rel="noopener">Abrir pagamento</a><button class="btn btn-ghost btn-sm" id="mpCopyLink" type="button">Copiar link</button><a class="btn btn-ghost btn-sm" href="${linkWhatsappPedidoSite(pedido,mensagem)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>`:""}<button class="btn btn-ghost btn-sm" id="mpSyncPayment" type="button">Sincronizar pagamento Mercado Pago</button></div><small>Pagamentos Mercado Pago são confirmados automaticamente pelo webhook quando configurado.</small>`;if($("#mpCopyLink"))$("#mpCopyLink").onclick=async()=>{try{await navigator.clipboard.writeText(url);showToast("Link copiado.");}catch{showToast("Não foi possível copiar automaticamente.");}};$("#mpSyncPayment")?.addEventListener("click",()=>sincronizarPagamentoMercadoPago(pedido.id));}
async function carregarLinkMercadoPagoExistente(pedido){try{const r=await fetchAdmin(`/mercado-pago/vendas/${pedido.id}`),d=await r?.json().catch(()=>null);if(r?.ok&&d)mostrarLinkMercadoPago(pedido,d);}catch(error){console.info("Link Mercado Pago ainda não disponível.",error);}}
async function sincronizarPagamentoMercadoPago(vendaId){const button=$("#mpSyncPayment");if(button){button.disabled=true;button.textContent="Sincronizando...";}try{const r=await fetchAdmin(`/mercado-pago/vendas/${vendaId}/sincronizar-pagamento`,{method:"POST"}),d=await r?.json().catch(()=>({}));if(!r?.ok)throw new Error(d.message||"Não foi possível sincronizar o pagamento.");showToast(d.message||"Pagamento sincronizado.");closeModal("#siteOrderModal");await carregarPedidosSite();await abrirPedidoSite(vendaId);}catch(error){showToast(error.message);}finally{if(button){button.disabled=false;button.textContent="Sincronizar pagamento Mercado Pago";}}}
async function gerarLinkMercadoPagoPedido(pedido){const button=$("#siteOrderMercadoPago");if(button){button.disabled=true;button.textContent="Gerando link...";}try{const r=await fetchAdmin(`/mercado-pago/vendas/${pedido.id}/criar-preferencia`,{method:"POST",headers:{"Content-Type":"application/json"}}),d=await r?.json().catch(()=>({}));if(!r?.ok)throw new Error(d.message||"Não foi possível gerar o link.");mostrarLinkMercadoPago(pedido,d);showToast("Link Mercado Pago disponível. O pagamento segue pendente.");}catch(error){const box=$("#siteOrderMpResult");if(box)box.innerHTML=`<p class="login-error">${escaparHtml(error.message)}</p>`;}finally{if(button){button.disabled=false;button.textContent="Gerar link Mercado Pago";}}}
function preencherConfigMercadoPago(c={}){$("#mpEnvironment").value=c.ambiente||"sandbox";$("#mpPublicKey").value=c.public_key||"";$("#mpSuccessUrl").value=c.success_url||"";$("#mpFailureUrl").value=c.failure_url||"";$("#mpPendingUrl").value=c.pending_url||"";$("#mpWebhookUrl").value=c.webhook_url||"";$("#mpWebhookSuggested").textContent=c.webhook_url_sugerida||"Configure APP_PUBLIC_URL no backend";$("#mpActive").checked=Boolean(c.ativo);const badge=$("#mpTokenStatus");badge.textContent=c.access_token_configurado?"Access Token configurado":"Access Token não configurado";badge.className=`status-badge ${c.access_token_configurado?"open":"closed"}`;}
async function carregarConfigMercadoPago(){try{const r=await fetchAdmin("/mercado-pago/config"),d=await r?.json().catch(()=>({}));if(!r?.ok)throw new Error(d.message);preencherConfigMercadoPago(d);$("#mpConfigStatus").textContent="";}catch(error){$("#mpConfigStatus").textContent=error.message||"Não foi possível carregar a configuração.";}}
function salvarConfigMercadoPago(event){event.preventDefault();comPin(async pin=>{const body={ambiente:$("#mpEnvironment").value,ativo:$("#mpActive").checked,public_key:$("#mpPublicKey").value.trim()||null,success_url:$("#mpSuccessUrl").value.trim()||null,failure_url:$("#mpFailureUrl").value.trim()||null,pending_url:$("#mpPendingUrl").value.trim()||null,webhook_url:$("#mpWebhookUrl").value.trim()||null};const r=await fetchAdmin("/mercado-pago/config",{method:"PUT",headers:{"Content-Type":"application/json","X-Admin-Pin":pin},body:JSON.stringify(body)}),d=await r?.json().catch(()=>({}));if(!r?.ok)return $("#mpConfigStatus").textContent=d.message||"Não foi possível salvar.";preencherConfigMercadoPago(d);$("#mpConfigStatus").textContent="Configuração salva. Nenhum pagamento foi confirmado.";});}

/* ----------------- NOTA FISCAL — PREPARAÇÃO V1 ----------------- */
function valorFiscal(id){return $(id)?.value?.trim()||null;}
function preencherConfigFiscal(c={}){const map={"#fiscalRazaoSocial":"razao_social","#fiscalNomeFantasia":"nome_fantasia","#fiscalCnpj":"cnpj","#fiscalIe":"inscricao_estadual","#fiscalIm":"inscricao_municipal","#fiscalRegime":"regime_tributario","#fiscalCrt":"crt","#fiscalCep":"cep","#fiscalEstado":"estado","#fiscalCidade":"cidade","#fiscalBairro":"bairro","#fiscalEndereco":"endereco","#fiscalNumero":"numero","#fiscalComplemento":"complemento","#fiscalProvedor":"provedor_fiscal","#fiscalSerieNfce":"serie_nfce","#fiscalNumeroNfce":"proximo_numero_nfce","#fiscalSerieNfe":"serie_nfe","#fiscalNumeroNfe":"proximo_numero_nfe","#fiscalObservacoes":"observacoes"};Object.entries(map).forEach(([id,key])=>{$(id).value=c?.[key]??"";});$("#fiscalAmbiente").value=c?.ambiente_fiscal||"homologacao";$("#fiscalEmitirNfce").checked=Boolean(c?.emitir_nfce);$("#fiscalEmitirNfe").checked=Boolean(c?.emitir_nfe);atualizarBadgeAmbienteFiscal();}
function atualizarBadgeAmbienteFiscal(){const producao=$("#fiscalAmbiente").value==="producao";const badge=$("#fiscalEnvironmentBadge");badge.textContent=producao?"Produção — atenção":"Homologação";badge.className=`fiscal-environment ${producao?"production":""}`;}
async function carregarConfigFiscal(){try{const r=await fetchAdmin("/fiscal/config"),d=await r?.json().catch(()=>null);if(!r?.ok)throw new Error(d?.message||"Falha ao carregar configuração.");preencherConfigFiscal(d||{});}catch(e){$("#fiscalConfigStatus").textContent=e.message;}}
function payloadConfigFiscal(){return{razao_social:valorFiscal("#fiscalRazaoSocial"),nome_fantasia:valorFiscal("#fiscalNomeFantasia"),cnpj:valorFiscal("#fiscalCnpj"),inscricao_estadual:valorFiscal("#fiscalIe"),inscricao_municipal:valorFiscal("#fiscalIm"),regime_tributario:valorFiscal("#fiscalRegime"),crt:valorFiscal("#fiscalCrt"),cep:valorFiscal("#fiscalCep"),estado:valorFiscal("#fiscalEstado"),cidade:valorFiscal("#fiscalCidade"),bairro:valorFiscal("#fiscalBairro"),endereco:valorFiscal("#fiscalEndereco"),numero:valorFiscal("#fiscalNumero"),complemento:valorFiscal("#fiscalComplemento"),ambiente_fiscal:$("#fiscalAmbiente").value,provedor_fiscal:valorFiscal("#fiscalProvedor"),serie_nfce:valorFiscal("#fiscalSerieNfce"),proximo_numero_nfce:valorFiscal("#fiscalNumeroNfce"),serie_nfe:valorFiscal("#fiscalSerieNfe"),proximo_numero_nfe:valorFiscal("#fiscalNumeroNfe"),emitir_nfce:$("#fiscalEmitirNfce").checked,emitir_nfe:$("#fiscalEmitirNfe").checked,observacoes:valorFiscal("#fiscalObservacoes")};}
function salvarConfigFiscal(event){event.preventDefault();comPin(async pin=>{const s=$("#fiscalConfigStatus");s.textContent="Salvando...";const r=await fetchAdmin("/fiscal/config",{method:"PUT",headers:{"Content-Type":"application/json","X-Admin-Pin":pin},body:JSON.stringify(payloadConfigFiscal())}),d=await r?.json().catch(()=>({}));s.textContent=r?.ok?"Configuração fiscal salva. Nenhuma nota foi emitida.":d.message||"Não foi possível salvar.";if(r?.ok)preencherConfigFiscal(d);});}
function renderProdutosFiscais(){const termo=$("#fiscalProductsSearch").value.trim().toLowerCase();const list=fiscalProdutos.filter(p=>[p.produto,p.categoria,p.sku,p.codigo_barras,p.codigo_interno].some(v=>String(v||"").toLowerCase().includes(termo)));$("#fiscalProductsTable").innerHTML=`<thead><tr><th>Produto</th><th>Variação</th><th>Código</th><th>NCM</th><th>CFOP</th><th>CSOSN/CST</th><th>Status</th><th></th></tr></thead><tbody>${list.map(p=>`<tr><td data-label="Produto"><strong>${escaparHtml(p.produto)}</strong><small>${escaparHtml(p.categoria||"—")}</small></td><td data-label="Variação">${escaparHtml([p.tamanho,p.cor].filter(Boolean).join(" / ")||"Geral")}</td><td data-label="Código">${escaparHtml(p.codigo_barras||p.sku||p.codigo_interno||"—")}</td><td data-label="NCM">${escaparHtml(p.ncm||"—")}</td><td data-label="CFOP">${escaparHtml(p.cfop||"—")}</td><td data-label="Tributação">${escaparHtml(p.csosn||p.cst_icms||"—")}</td><td data-label="Status"><span class="fiscal-status ${p.status_fiscal}">${p.status_fiscal}</span></td><td data-label="Ação"><button class="btn btn-ghost btn-sm" data-fiscal-product="${p.produto_id}" data-fiscal-variation="${p.produto_variacao_id||""}" type="button">Editar</button></td></tr>`).join("")||'<tr><td colspan="8">Nenhum produto encontrado.</td></tr>'}</tbody>`;$$('[data-fiscal-product]').forEach(b=>b.addEventListener("click",()=>abrirFiscalProduto(b)));}
async function carregarProdutosFiscais(){const s=$("#fiscalProductsStatus");s.textContent="Carregando...";try{const r=await fetchAdmin("/fiscal/produtos"),d=await r?.json().catch(()=>({}));if(!r?.ok)throw new Error(d.message);fiscalProdutos=Array.isArray(d)?d:[];renderProdutosFiscais();s.textContent=`${fiscalProdutos.length} variação(ões).`;}catch(e){s.textContent=e.message||"Backend indisponível.";}}
function abrirFiscalProduto(button){const p=fiscalProdutos.find(x=>Number(x.produto_id)===Number(button.dataset.fiscalProduct)&&String(x.produto_variacao_id||"")===String(button.dataset.fiscalVariation||""));if(!p)return;$("#fiscalProductId").value=p.produto_id;$("#fiscalVariationId").value=p.produto_variacao_id||"";$("#fiscalProductTitle").textContent=`Fiscal — ${p.produto}${p.tamanho?` (${p.tamanho}/${p.cor})`:""}`;[["#fiscalNcm","ncm"],["#fiscalCest","cest"],["#fiscalCfop","cfop"],["#fiscalOrigem","origem"],["#fiscalUnidade","unidade_comercial"],["#fiscalCsosn","csosn"],["#fiscalCstIcms","cst_icms"],["#fiscalCstPis","cst_pis"],["#fiscalCstCofins","cst_cofins"]].forEach(([id,k])=>$(id).value=p[k]||"");$("#fiscalProductError").textContent="";openModal("#fiscalProductModal");}
function salvarFiscalProduto(event){event.preventDefault();comPin(async pin=>{const id=$("#fiscalProductId").value,b={produto_variacao_id:Number($("#fiscalVariationId").value)||null,ncm:valorFiscal("#fiscalNcm"),cest:valorFiscal("#fiscalCest"),cfop:valorFiscal("#fiscalCfop"),origem:valorFiscal("#fiscalOrigem"),unidade_comercial:valorFiscal("#fiscalUnidade")||"UN",csosn:valorFiscal("#fiscalCsosn"),cst_icms:valorFiscal("#fiscalCstIcms"),cst_pis:valorFiscal("#fiscalCstPis"),cst_cofins:valorFiscal("#fiscalCstCofins")};const r=await fetchAdmin(`/fiscal/produtos/${id}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Admin-Pin":pin},body:JSON.stringify(b)}),d=await r?.json().catch(()=>({}));if(!r?.ok)return $("#fiscalProductError").textContent=d.message||"Não foi possível salvar.";closeModal("#fiscalProductModal");showToast("Fiscal do produto salvo.");await carregarProdutosFiscais();});}
function statusFiscalClasse(s){return["pronto","emitido"].includes(s)?"complete":["erro","cancelado"].includes(s)?"error":"draft";}
function renderDocumentosFiscais(){$("#fiscalDocsTable").innerHTML=`<thead><tr><th>Documento</th><th>Venda</th><th>Tipo</th><th>Status</th><th>Ambiente</th><th>Total</th><th>Data</th><th></th></tr></thead><tbody>${fiscalDocumentos.map(d=>`<tr><td>#${d.id}</td><td>#${d.venda_id}</td><td>${String(d.tipo_documento).toUpperCase()}</td><td><span class="fiscal-doc-status ${statusFiscalClasse(d.status)}">${escaparHtml(d.status)}</span></td><td>${escaparHtml(d.ambiente)}</td><td>${formatarMoeda(d.total)}</td><td>${new Date(d.created_at).toLocaleString("pt-BR")}</td><td><button class="btn btn-ghost btn-sm" data-fiscal-doc="${d.id}" type="button">Ver rascunho</button></td></tr>`).join("")||'<tr><td colspan="8">Nenhum documento fiscal preparado.</td></tr>'}</tbody>`;$$('[data-fiscal-doc]').forEach(b=>b.addEventListener("click",()=>abrirDocumentoFiscal(Number(b.dataset.fiscalDoc))));}
async function carregarDocumentosFiscais(){const s=$("#fiscalDocsStatus");s.textContent="Carregando...";try{const r=await fetchAdmin("/fiscal/documentos"),d=await r?.json().catch(()=>({}));if(!r?.ok)throw new Error(d.message);fiscalDocumentos=Array.isArray(d)?d:[];renderDocumentosFiscais();s.textContent=`${fiscalDocumentos.length} documento(s).`;}catch(e){s.textContent=e.message||"Backend indisponível.";}}
function prepararNotaFiscalVenda(vendaId){comPin(async pin=>{const r=await fetchAdmin(`/fiscal/vendas/${vendaId}/preparar`,{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Pin":pin}}),d=await r?.json().catch(()=>({}));if(!r?.ok)return showToast(d.message||"Não foi possível preparar a nota.");showToast(`Rascunho fiscal #${d.id} preparado. Nenhuma nota foi emitida.`);await carregarDocumentosFiscais();});}
function prepararNotaFiscalForm(event){event.preventDefault();prepararNotaFiscalVenda(Number($("#fiscalSaleId").value));}
async function abrirDocumentoFiscal(id){const r=await fetchAdmin(`/fiscal/documentos/${id}`),d=await r?.json().catch(()=>({}));if(!r?.ok)return showToast(d.message||"Documento não encontrado.");const alertas=d.payload_json?.alertas||[];$("#fiscalDocumentTitle").textContent=`Rascunho fiscal #${d.id}`;$("#fiscalDocumentDetail").innerHTML=`<div class="fiscal-doc-head"><span class="fiscal-doc-status ${statusFiscalClasse(d.status)}">${escaparHtml(d.status)}</span><strong>Venda #${d.venda_id} · ${formatarMoeda(d.total)}</strong></div>${alertas.length?`<div class="fiscal-alerts"><strong>Alertas para corrigir</strong><ul>${alertas.map(a=>`<li>${escaparHtml(a)}</li>`).join("")}</ul></div>`:'<div class="admin-notice">Rascunho sem alertas básicos.</div>'}<pre class="fiscal-json">${escaparHtml(JSON.stringify(d.payload_json,null,2))}</pre><div class="modal-foot"><button class="btn btn-ghost" id="fiscalMarkError" type="button">Marcar erro</button><button class="btn btn-pink" id="fiscalMarkReady" type="button">Marcar pronto</button></div>`;openModal("#fiscalDocumentModal");$("#fiscalMarkReady").onclick=()=>alterarDocumentoFiscal(id,"marcar-pronto");$("#fiscalMarkError").onclick=()=>alterarDocumentoFiscal(id,"marcar-erro",{mensagem_erro:"Erro registrado manualmente."});}
function alterarDocumentoFiscal(id,action,body={}){comPin(async pin=>{const r=await fetchAdmin(`/fiscal/documentos/${id}/${action}`,{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Pin":pin},body:JSON.stringify(body)}),d=await r?.json().catch(()=>({}));if(!r?.ok)return showToast(d.message||"Não foi possível atualizar.");closeModal("#fiscalDocumentModal");showToast("Status fiscal atualizado.");await carregarDocumentosFiscais();});}
function iniciarFiscal(){carregarConfigFiscal();carregarProdutosFiscais();carregarDocumentosFiscais();}

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

function valorPdv(id) { return Math.max(0, Number($(id)?.value || 0) || 0); }
function totalCarrinhoPdv() { return pdvCart.reduce((sum, item) => sum + item.preco * item.quantidade, 0); }
function totalVendaPdv() { return Math.max(0, totalCarrinhoPdv() - valorPdv("#pdvDiscount") + Number(pdvFrete?.valor || 0)); }

async function iniciarPdvLoja() {
  $("#pdvTerminal").value = localStorage.getItem("pdvSelecionado") || "pdv_loja_1";
  atualizarCarrinhoPdv();
  await Promise.allSettled([carregarCaixaAberto(), carregarMaquininhasPdv(), carregarProdutosPdv()]);
}

async function carregarCaixaAberto() {
  const response = await fetchAdmin("/caixas/aberto");
  const data = await response?.json().catch(() => ({}));
  if (!response?.ok) { pdvCaixa = null; $("#pdvCashStatus").innerHTML = `<p class="login-error">${data.message || "Não foi possível consultar o caixa."}</p>`; return; }
  pdvCaixa = data || null;
  $("#pdvCashBadge").textContent = pdvCaixa ? "Aberto" : "Fechado";
  $("#pdvCashBadge").className = `status-badge ${pdvCaixa ? "open" : "closed"}`;
  const podeAbrir = usuarioAdministrador() || temPermissao("caixa.abrir");
  const podeMovimentar = usuarioAdministrador() || temPermissao("caixa.movimentar");
  const podeFechar = usuarioAdministrador() || temPermissao("caixa.fechar");
  $("#pdvOpenCashForm").hidden = Boolean(pdvCaixa) || !podeAbrir; $("#pdvCashActions").hidden = !pdvCaixa || !podeMovimentar;
  $(".cash-close").hidden = !pdvCaixa || !podeFechar;
  $("#pdvCashStatus").innerHTML = pdvCaixa ? `<dl class="cash-status-list"><div><dt>ID</dt><dd>#${pdvCaixa.id}</dd></div><div><dt>Valor inicial</dt><dd>${money(Number(pdvCaixa.valor_inicial))}</dd></div><div><dt>Abertura</dt><dd>${new Date(pdvCaixa.data_abertura).toLocaleString("pt-BR")}</dd></div></dl>` : `<p class="empty-note">Nenhum caixa aberto.${podeAbrir ? " Abra um caixa para iniciar as vendas." : " Aguarde uma responsável abrir o caixa."}</p>`;
  $("#pdvFinalize").disabled = !pdvCaixa;
}

async function abrirCaixaPdv(event) {
  event.preventDefault();
  const response = await fetchAdmin("/caixas/abrir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor_inicial: valorPdv("#pdvOpeningValue"), observacoes_abertura: $("#pdvOpeningNotes").value.trim() || null }) });
  const data = await response?.json().catch(() => ({}));
  if (!response?.ok) return showToast(data.message || "Não foi possível abrir o caixa.");
  showToast(`Caixa #${data.id} aberto`); $("#pdvOpenCashForm").reset(); await carregarCaixaAberto();
}

async function carregarMaquininhasPdv() {
  const response = await fetchAdmin("/maquininhas");
  const data = await response?.json().catch(() => []);
  pdvMaquininhas = response?.ok && Array.isArray(data) ? data.filter(item => item.ativo) : [];
  renderMaquininhasPdv();
}

function selecionarTerminalPdv() { localStorage.setItem("pdvSelecionado", $("#pdvTerminal").value); renderMaquininhasPdv(); }
function renderMaquininhasPdv() {
  const terminal = $("#pdvTerminal").value;
  const ordenadas = [...pdvMaquininhas].sort((a,b) => Number(b.pdv_codigo === terminal) - Number(a.pdv_codigo === terminal));
  const options = `<option value="">Selecione a maquininha</option>` + ordenadas.map(m => `<option value="${m.id}">${m.nome}${m.pdv_codigo === terminal ? " · sugerida" : ""}</option>`).join("");
  $("#machineDebit").innerHTML = options; $("#machineCredit").innerHTML = options;
}

async function carregarProdutosPdv() {
  try { const response = await fetch(`${API_BASE_URL}/public/produtos`); const data = await response.json(); pdvProdutosPublicos = Array.isArray(data) ? data : []; }
  catch { pdvProdutosPublicos = []; }
}

function produtoCodigoParaPdv(data) {
  return { id: Number(data.produto.id), nome: data.produto.nome, categoria: data.produto.categoria, variacoes: [{ ...data.variacao, quantidade_estoque: Number(data.estoque?.quantidade || 0), preco_venda: data.preco, preco_promocional: data.preco_promocional }] };
}

async function buscarProdutoPdv(event) {
  event?.preventDefault();
  const termo = $("#pdvStoreSearch").value.trim();
  if (!termo) return renderResultadosPdv(pdvProdutosPublicos.slice(0, 12));
  $("#pdvSearchStatus").textContent = "Buscando...";
  let encontrados = [];
  if (/^[\w.-]{3,}$/.test(termo)) {
    const response = await fetchAdmin(`/produtos/codigo/${encodeURIComponent(termo)}`);
    if (response?.ok) encontrados = [produtoCodigoParaPdv(await response.json())];
  }
  if (!encontrados.length) {
    if (!pdvProdutosPublicos.length) await carregarProdutosPdv();
    const busca = termo.toLowerCase();
    encontrados = pdvProdutosPublicos.filter(p => `${p.nome} ${p.categoria} ${(p.variacoes || []).map(v => `${v.sku} ${v.codigo_barras} ${v.codigo_interno}`).join(" ")}`.toLowerCase().includes(busca));
  }
  $("#pdvSearchStatus").textContent = encontrados.length ? `${encontrados.length} produto(s) encontrado(s).` : "Nenhum produto encontrado.";
  renderResultadosPdv(encontrados);
}

function renderResultadosPdv(lista) {
  $("#pdvSearchResults").innerHTML = lista.map((p, index) => {
    const variacoes = (p.variacoes || []).filter(v => v.ativo !== false && Number(v.quantidade_estoque ?? v.estoque?.quantidade ?? 0) > 0);
    return `<article class="pdv-result-card"><strong>${p.nome}</strong><small>${p.categoria || ""}</small><select data-pdv-variation="${index}">${variacoes.map(v => `<option value="${v.id}" data-stock="${Number(v.quantidade_estoque ?? v.estoque?.quantidade ?? 0)}" data-price="${Number(v.preco_promocional || v.preco_venda || p.preco_promocional || p.preco || 0)}">${v.tamanho} · ${v.cor} · estoque ${Number(v.quantidade_estoque ?? v.estoque?.quantidade ?? 0)}</option>`).join("")}</select><button class="btn btn-pink btn-sm" data-pdv-add="${index}" ${variacoes.length ? "" : "disabled"}>Adicionar</button></article>`;
  }).join("") || `<p class="empty-note">Nenhum resultado para exibir.</p>`;
  $$('[data-pdv-add]').forEach(button => button.addEventListener("click", () => adicionarProdutoPdv(lista[Number(button.dataset.pdvAdd)], Number(button.dataset.pdvAdd))));
}

function adicionarProdutoPdv(produto, index) {
  const select = $(`[data-pdv-variation="${index}"]`); const variacao = (produto.variacoes || []).find(v => Number(v.id) === Number(select.value));
  if (!variacao) return showToast("Selecione uma variação disponível.");
  const estoque = Number(select.selectedOptions[0].dataset.stock); const preco = Number(select.selectedOptions[0].dataset.price);
  const existente = pdvCart.find(item => item.variacao_id === Number(variacao.id));
  if (existente && existente.quantidade >= estoque) return showToast("Estoque insuficiente.");
  if (existente) existente.quantidade += 1; else pdvCart.push({ produto_id: Number(produto.id), variacao_id: Number(variacao.id), nome: produto.nome, tamanho: variacao.tamanho, cor: variacao.cor, preco, estoque, quantidade: 1 });
  atualizarCarrinhoPdv(); showToast(`${produto.nome} adicionado`);
}

function alterarQuantidadePdv(index, delta) { const item = pdvCart[index]; if (!item) return; item.quantidade = Math.min(item.estoque, item.quantidade + delta); if (item.quantidade <= 0) pdvCart.splice(index, 1); atualizarCarrinhoPdv(); }
function atualizarCarrinhoPdv() {
  $("#pdvCartCount").textContent = `${pdvCart.reduce((s,i) => s + i.quantidade, 0)} itens`;
  $("#pdvStoreCart").innerHTML = pdvCart.map((i,index) => `<div class="pdv-cart-line"><div><strong>${i.nome}</strong><small>${i.tamanho} · ${i.cor} · ${money(i.preco)}</small></div><div class="qty-control"><button data-pdv-minus="${index}">−</button><span>${i.quantidade}</span><button data-pdv-plus="${index}">+</button></div><strong>${money(i.preco*i.quantidade)}</strong><button class="cart-remove" data-pdv-remove="${index}">×</button></div>`).join("") || `<p class="empty-note">Carrinho vazio.</p>`;
  $$('[data-pdv-minus]').forEach(b => b.onclick=()=>alterarQuantidadePdv(Number(b.dataset.pdvMinus),-1)); $$('[data-pdv-plus]').forEach(b => b.onclick=()=>alterarQuantidadePdv(Number(b.dataset.pdvPlus),1)); $$('[data-pdv-remove]').forEach(b => b.onclick=()=>{pdvCart.splice(Number(b.dataset.pdvRemove),1);atualizarCarrinhoPdv();});
  $("#pdvSubtotal").textContent = money(totalCarrinhoPdv()); $("#pdvFreightTotal").textContent = money(Number(pdvFrete?.valor || 0)); $("#pdvGrandTotal").textContent = money(totalVendaPdv()); $("#pdvPaymentTotal").textContent = money(totalVendaPdv()); calcularPagamentosPdv();
}

function calcularPagamentosPdv() {
  const totalPago = ["#payCash","#payPix","#payDebit","#payCredit"].reduce((s,id)=>s+valorPdv(id),0); const total=totalVendaPdv(); const diferenca=Math.round((totalPago-total)*100)/100; const temDinheiro=valorPdv("#payCash")>0;
  let cls="warn", texto=`Falta pagar: ${money(Math.max(-diferenca,0))}`;
  if (Math.abs(diferenca)<0.01){cls="ok";texto="Pagamento completo";} else if(diferenca>0&&temDinheiro){cls="ok";texto=`Troco: ${money(diferenca)}`;} else if(diferenca>0){cls="error";texto="Troco só pode ser gerado quando há pagamento em dinheiro.";}
  $("#pdvPaymentBalance").className=`payment-balance ${cls}`; $("#pdvPaymentBalance").textContent=texto; return {totalPago,diferenca,temDinheiro};
}

async function calcularFretePdv() {
  const bairro=$("#pdvDistrict").value.trim(), cidade=$("#pdvCity").value.trim(), estado=$("#pdvState").value.trim().toUpperCase()||"SP";
  if(!bairro||!cidade){$("#pdvFreightStatus").textContent="Informe cidade e bairro.";return;}
  const response=await fetch(`${API_BASE_URL}/public/frete-bairro?${new URLSearchParams({bairro,cidade,estado})}`); const data=await response.json().catch(()=>({}));
  if(!response.ok){pdvFrete=null;$("#pdvFreightStatus").textContent=response.status===404?"Este bairro ainda não é atendido.":data.message||"Não foi possível calcular o frete.";atualizarCarrinhoPdv();return;}
  pdvFrete={valor:Number(data.valor),prazo:data.prazo_estimado||""}; $("#pdvFreightStatus").textContent=`Frete ${money(pdvFrete.valor)}${pdvFrete.prazo?` · ${pdvFrete.prazo}`:""}`; atualizarCarrinhoPdv();
}

async function finalizarVendaPdv() {
  if(!pdvCaixa)return showToast("Abra o caixa antes de vender."); if(!pdvCart.length)return showToast("Adicione produtos ao carrinho.");
  const calculo=calcularPagamentosPdv(); if(calculo.diferenca < -0.009)return showToast("O pagamento está incompleto."); if(calculo.diferenca>0&&!calculo.temDinheiro)return showToast("Troco exige pagamento em dinheiro.");
  const pagamentos=[{forma_pagamento:"dinheiro",valor:valorPdv("#payCash")},{forma_pagamento:"pix",valor:valorPdv("#payPix")},{forma_pagamento:"debito",valor:valorPdv("#payDebit"),maquininha_id:Number($("#machineDebit").value)||null},{forma_pagamento:"credito",valor:valorPdv("#payCredit"),maquininha_id:Number($("#machineCredit").value)||null}].filter(p=>p.valor>0);
  if(!pagamentos.length)return showToast("Informe ao menos um pagamento."); if(pagamentos.some(p=>["debito","credito"].includes(p.forma_pagamento)&&!p.maquininha_id))return showToast("Selecione a maquininha para cartão.");
  const local=$("#pdvDeliveryType").value==="local"; if(local&&!pdvFrete)return showToast("Calcule o frete local antes de finalizar.");
  const entrega=local?{tipo_entrega:"entrega_local",destinatario_nome:$("#pdvRecipient").value.trim(),destinatario_telefone:$("#pdvPhone").value.trim(),cidade:$("#pdvCity").value.trim(),estado:$("#pdvState").value.trim(),bairro:$("#pdvDistrict").value.trim(),endereco:$("#pdvAddress").value.trim(),numero:$("#pdvNumber").value.trim(),complemento:$("#pdvComplement").value.trim(),prazo_estimado:pdvFrete?.prazo||null}:undefined;
  const payload={cliente_id:null,itens:pdvCart.map(i=>({produto_id:i.produto_id,variacao_id:i.variacao_id,quantidade:i.quantidade,preco_unitario:i.preco})),desconto:valorPdv("#pdvDiscount"),frete:Number(pdvFrete?.valor||0),canal_venda:"loja_fisica",origem_venda:"pdv",caixa_id:pdvCaixa.id,pagamentos,tem_entrega:local,observacoes:$("#pdvSaleNotes").value.trim()||null}; if(entrega)payload.entrega=entrega;
  const response=await fetchAdmin("/vendas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); const data=await response?.json().catch(()=>({})); if(!response?.ok)return showToast(data.message||"Não foi possível finalizar a venda.");
  ultimaVendaPdv=data;
  $("#pdvSaleResult").innerHTML=`<strong>Venda #${data.id} finalizada</strong><span>Total: ${money(Number(data.total))} · Pago: ${money(Number(data.total_pago))} · Troco: ${money(Number(data.troco))}</span><div class="sale-result-actions"><button class="btn btn-pink btn-sm" id="printLastReceipt" type="button">Imprimir comprovante</button><button class="btn btn-ghost btn-sm" id="startNewSale" type="button">Nova venda</button></div>`;
  $("#printLastReceipt").addEventListener("click",()=>abrirPreviewComprovante(ultimaVendaPdv));
  $("#startNewSale").addEventListener("click",iniciarNovaVendaPdv);
  pdvCart=[];pdvFrete=null;["#payCash","#payPix","#payDebit","#payCredit","#pdvDiscount","#pdvSaleNotes"].forEach(id=>{$(id).value="";}); atualizarCarrinhoPdv(); await Promise.allSettled([carregarCaixaAberto(),carregarProdutosPdv()]);
}

function formatarMoeda(valor) { return money(Number(valor || 0)); }
function escaparHtml(valor) { return String(valor ?? "").replace(/[&<>"']/g, caractere => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[caractere]); }

function montarHtmlComprovanteVenda(venda) {
  const itens = Array.isArray(venda?.itens) ? venda.itens : [];
  const pagamentos = Array.isArray(venda?.pagamentos) ? venda.pagamentos : [];
  const entrega = venda?.entrega || null;
  const dataVenda = venda?.created_at || venda?.data || new Date().toISOString();
  const rotulosPagamento = { dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" };
  const itensHtml = itens.length ? itens.map(item => {
    const nome = item.produto_nome || item.nome || "Produto";
    const quantidade = Number(item.quantidade || 0);
    const preco = Number(item.preco_unitario || item.preco || 0);
    const subtotal = Number(item.subtotal ?? quantidade * preco);
    return `<div class="receipt-item"><strong>${escaparHtml(nome)}</strong><small>${escaparHtml([item.tamanho, item.cor].filter(Boolean).join(" / ") || "Sem variação")}</small><div><span>${quantidade} x ${formatarMoeda(preco)}</span><b>${formatarMoeda(subtotal)}</b></div></div>`;
  }).join("") : `<p class="receipt-empty">Itens não disponíveis.</p>`;
  const pagamentosHtml = pagamentos.length ? pagamentos.map(p => `<div><span>${escaparHtml(rotulosPagamento[p.forma_pagamento] || p.forma_pagamento || "Pagamento")}</span><strong>${formatarMoeda(p.valor)}</strong></div>`).join("") : `<div><span>${escaparHtml(venda?.forma_pagamento || "Pagamento")}</span><strong>${formatarMoeda(venda?.total_pago)}</strong></div>`;
  const entregaHtml = entrega ? `<section class="receipt-delivery"><h4>ENTREGA</h4><p>${escaparHtml(entrega.destinatario_nome || "")}${entrega.destinatario_telefone ? ` · ${escaparHtml(entrega.destinatario_telefone)}` : ""}</p><p>${escaparHtml([entrega.bairro, entrega.cidade].filter(Boolean).join(" / "))}</p><p>${escaparHtml([entrega.endereco, entrega.numero].filter(Boolean).join(", "))}</p></section>` : "";
  return `<header class="receipt-header"><h2>Gisele Flávia Modas</h2><p>Boutique Feminina</p></header><div class="receipt-separator"></div><section class="receipt-meta"><p>${new Date(dataVenda).toLocaleString("pt-BR")}</p><p><strong>Venda #${escaparHtml(venda?.id || "—")}</strong>${venda?.caixa_id ? ` · Caixa #${escaparHtml(venda.caixa_id)}` : ""}</p>${venda?.atendente || venda?.usuario || venda?.usuario_nome ? `<p>Atendente: ${escaparHtml(venda.atendente || venda.usuario || venda.usuario_nome)}</p>` : ""}</section><div class="receipt-separator"></div><section>${itensHtml}</section><div class="receipt-separator"></div><section class="receipt-values"><div><span>Subtotal</span><strong>${formatarMoeda(venda?.subtotal)}</strong></div><div><span>Desconto</span><strong>-${formatarMoeda(venda?.desconto)}</strong></div><div><span>Frete</span><strong>${formatarMoeda(venda?.frete_valor ?? venda?.frete)}</strong></div><div class="receipt-total"><span>TOTAL</span><strong>${formatarMoeda(venda?.total)}</strong></div><div><span>Total pago</span><strong>${formatarMoeda(venda?.total_pago)}</strong></div><div><span>Troco</span><strong>${formatarMoeda(venda?.troco)}</strong></div>${Number(venda?.valor_faltante || 0) > 0 ? `<div><span>Valor faltante</span><strong>${formatarMoeda(venda.valor_faltante)}</strong></div>` : ""}</section><div class="receipt-separator"></div><section class="receipt-payments"><h4>PAGAMENTOS</h4>${pagamentosHtml}</section>${entregaHtml}<div class="receipt-separator"></div><footer class="receipt-footer"><strong>Obrigado pela preferência!</strong><p>@gisele_flavia_modas</p><p>Comprovante não fiscal</p></footer>`;
}

function abrirPreviewComprovante(venda) {
  if (!venda) return showToast("Nenhuma venda disponível para impressão.");
  ultimaVendaPdv = venda;
  const html = montarHtmlComprovanteVenda(venda);
  $("#receiptPreview").innerHTML = html; $("#receiptPrintArea").innerHTML = html;
  openModal("#receiptModal");
}

function imprimirComprovanteVenda(venda) {
  if (venda) { ultimaVendaPdv = venda; $("#receiptPrintArea").innerHTML = montarHtmlComprovanteVenda(venda); }
  if (!ultimaVendaPdv) return showToast("Nenhuma venda disponível para impressão.");
  document.body.classList.add("printing-receipt");
  try { window.print(); } finally { document.body.classList.remove("printing-receipt"); }
}

async function buscarVendaParaReimpressao(event) {
  event?.preventDefault();
  if (!usuarioLogado()) return abrirLoginAdmin(() => buscarVendaParaReimpressao());
  const id = Number($("#receiptSaleId").value);
  if (!Number.isInteger(id) || id <= 0) return $("#receiptSearchStatus").textContent = "Informe um ID de venda válido.";
  $("#receiptSearchStatus").textContent = "Buscando venda...";
  try {
    const response = await fetchAdmin(`/vendas/${id}`); const data = await response?.json().catch(() => ({}));
    if (!response?.ok) { $("#receiptSearchStatus").textContent = response?.status === 404 ? "Venda não encontrada." : data.message || "Não foi possível buscar a venda."; return; }
    $("#receiptSearchStatus").textContent = `Venda #${id} encontrada.`; abrirPreviewComprovante(data);
  } catch (error) { $("#receiptSearchStatus").textContent = "Backend indisponível. Tente novamente em instantes."; }
}

function iniciarNovaVendaPdv() {
  $("#pdvSaleResult").innerHTML = ""; $("#pdvStoreSearch").value = ""; $("#pdvSearchResults").innerHTML = ""; $("#pdvSearchStatus").textContent = ""; $("#pdvStoreSearch").focus();
}

async function iniciarEtiquetas() {
  if (!podeAcessarEtiquetas()) return showToast("Você não tem permissão para acessar Códigos e Etiquetas.");
  renderEtiquetasSelecionadas();
  await carregarProdutosEtiquetas();
}

async function carregarProdutosEtiquetas() {
  $("#labelsStatus").textContent = "Carregando produtos e variações...";
  try {
    const response = await fetch(`${API_BASE_URL}/public/produtos`);
    const data = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(data)) throw new Error("Resposta inválida");
    variacoesEtiquetas = montarVariacoesEtiquetas(data);
    $("#labelsStatus").textContent = `${variacoesEtiquetas.length} variação(ões) carregada(s).`;
    filtrarEtiquetas(); atualizarResumoEtiquetas();
  } catch (error) {
    variacoesEtiquetas = []; filtrarEtiquetas(); atualizarResumoEtiquetas();
    $("#labelsStatus").textContent = "Backend indisponível. Não foi possível carregar os produtos agora.";
  }
}

function montarVariacoesEtiquetas(produtos) {
  return produtos.flatMap(produto => (produto.variacoes || []).map(variacao => ({
    id: Number(variacao.id), produto_id: Number(produto.id), produto: produto.nome || "Produto",
    categoria: produto.categoria || "—", tamanho: variacao.tamanho || "—", cor: variacao.cor || "—",
    sku: variacao.sku || "", codigo_barras: variacao.codigo_barras || "", codigo_interno: variacao.codigo_interno || "",
    preco: Number(variacao.preco_promocional || variacao.preco_venda || produto.preco_promocional || produto.preco || 0),
    estoque: Number(variacao.quantidade_estoque || 0),
  })));
}

function codigoEtiqueta(item) { return item.codigo_barras || item.sku || item.codigo_interno || ""; }
function filtrarEtiquetas() {
  const termo = ($("#labelsSearch")?.value || "").trim().toLowerCase();
  const lista = variacoesEtiquetas.filter(item => `${item.produto} ${item.categoria} ${item.sku} ${item.codigo_barras} ${item.codigo_interno} ${item.cor} ${item.tamanho}`.toLowerCase().includes(termo));
  $("#labelsVariationsTable").innerHTML = `<thead><tr><th>Produto</th><th>Variação</th><th>Código</th><th>Preço</th><th>Estoque</th><th>Ação</th></tr></thead><tbody>${lista.map(item => `<tr><td data-label="Produto"><strong>${escaparHtml(item.produto)}</strong><small>${escaparHtml(item.categoria)}</small></td><td data-label="Variação"><strong>${escaparHtml(item.tamanho)} / ${escaparHtml(item.cor)}</strong></td><td data-label="Código"><code class="variation-code">${escaparHtml(codigoEtiqueta(item) || "Sem código")}</code><small>${item.sku && item.sku !== codigoEtiqueta(item) ? `SKU: ${escaparHtml(item.sku)}` : ""}</small></td><td data-label="Preço"><strong class="variation-price">${formatarMoeda(item.preco)}</strong></td><td data-label="Estoque"><span class="stock-pill ${item.estoque > 0 ? "available" : "empty"}">${item.estoque} un.</span></td><td data-label="Ação"><button class="btn btn-ghost btn-sm label-add-button" data-label-add="${item.id}" type="button">Adicionar etiqueta</button></td></tr>`).join("") || `<tr><td colspan="6">Nenhuma variação encontrada.</td></tr>`}</tbody>`;
  $$('[data-label-add]').forEach(button => button.addEventListener("click", () => adicionarEtiquetaParaImpressao(Number(button.dataset.labelAdd))));
}

async function gerarCodigosFaltantes() {
  if (!usuarioAdministrador() && !temPermissao("produtos.editar")) return showToast("Você não tem permissão para gerar códigos. Solicite à dona da loja.");
  const faltantes = variacoesEtiquetas.filter(item => !codigoEtiqueta(item)).length;
  if (!faltantes) return showToast("Todas as variações já possuem código.");
  if (!confirm(`Gerar códigos para ${faltantes} variação(ões)?`)) return;
  const response = await fetchAdmin("/produtos/gerar-codigos", { method: "POST", headers: { "Content-Type": "application/json" } });
  const data = await response?.json().catch(() => ({}));
  if (!response?.ok) return showToast(data.message || "Não foi possível gerar os códigos.");
  showToast(`${Number(data.total_preenchido || 0)} código(s) gerado(s).`); await carregarProdutosEtiquetas();
}

function adicionarEtiquetaParaImpressao(id) {
  const item = variacoesEtiquetas.find(variacao => variacao.id === id);
  if (!item) return;
  if (!codigoEtiqueta(item)) return showToast("Gere códigos antes de imprimir esta etiqueta.");
  const existente = etiquetasSelecionadas.find(etiqueta => etiqueta.id === id);
  if (existente) existente.quantidade += 1; else etiquetasSelecionadas.push({ ...item, quantidade: 1 });
  renderEtiquetasSelecionadas();
}

function removerEtiquetaImpressao(id) { etiquetasSelecionadas = etiquetasSelecionadas.filter(item => item.id !== id); renderEtiquetasSelecionadas(); }
function alterarQuantidadeEtiqueta(id, delta) { const item = etiquetasSelecionadas.find(etiqueta => etiqueta.id === id); if (!item) return; item.quantidade += delta; if (item.quantidade <= 0) removerEtiquetaImpressao(id); else renderEtiquetasSelecionadas(); }
function renderEtiquetasSelecionadas() {
  $("#labelsSelectedList").innerHTML = etiquetasSelecionadas.map(item => `<div class="selected-label"><div><strong>${escaparHtml(item.produto)}</strong><small>${escaparHtml(item.tamanho)} / ${escaparHtml(item.cor)} · ${escaparHtml(codigoEtiqueta(item))}<br>${formatarMoeda(item.preco)}</small></div><div class="qty-control"><button data-label-minus="${item.id}" type="button">−</button><span>${item.quantidade}</span><button data-label-plus="${item.id}" type="button">+</button></div><button class="cart-remove" data-label-remove="${item.id}" type="button">×</button></div>`).join("") || `<p class="empty-note">Nenhuma etiqueta selecionada.</p>`;
  $$('[data-label-minus]').forEach(b => b.onclick=()=>alterarQuantidadeEtiqueta(Number(b.dataset.labelMinus),-1)); $$('[data-label-plus]').forEach(b => b.onclick=()=>alterarQuantidadeEtiqueta(Number(b.dataset.labelPlus),1)); $$('[data-label-remove]').forEach(b => b.onclick=()=>removerEtiquetaImpressao(Number(b.dataset.labelRemove)));
  const quantidadeTotal = etiquetasSelecionadas.reduce((total, item) => total + item.quantidade, 0);
  if ($("#labelsSelectionHint")) $("#labelsSelectionHint").textContent = quantidadeTotal ? `${quantidadeTotal} etiqueta(s) pronta(s) para impressão.` : "Ajuste as quantidades antes de imprimir.";
  atualizarResumoEtiquetas();
}

function atualizarResumoEtiquetas() {
  const comCodigo = variacoesEtiquetas.filter(item => Boolean(codigoEtiqueta(item))).length;
  const selecionadas = etiquetasSelecionadas.reduce((total,item) => total + item.quantidade, 0);
  $("#labelsSummary").innerHTML = [["Total de variações",variacoesEtiquetas.length],["Com código",comCodigo],["Sem código",variacoesEtiquetas.length-comCodigo],["Selecionadas",selecionadas]].map(([rotulo,valor])=>`<div class="stat-card"><span>${rotulo}</span><strong>${valor}</strong></div>`).join("");
}

function montarHtmlEtiqueta(item) {
  const codigo = codigoEtiqueta(item);
  return `<article class="product-label"><header>Gisele Flávia Modas</header><strong class="label-product">${escaparHtml(item.produto)}</strong><span>${escaparHtml(item.tamanho)} · ${escaparHtml(item.cor)}</span><b class="label-price">${formatarMoeda(item.preco)}</b><div class="barcode-block"><svg class="barcode-svg" data-barcode="${escaparHtml(codigo)}" role="img" aria-label="Código de barras ${escaparHtml(codigo)}"></svg><div class="barcode-fallback" aria-hidden="true"></div><code class="label-code-text">${escaparHtml(codigo)}</code></div></article>`;
}

function htmlEtiquetasSelecionadas() { return etiquetasSelecionadas.flatMap(item => Array.from({length:item.quantidade},()=>montarHtmlEtiqueta(item))).join(""); }
function opcoesCodigoBarrasEtiquetas(container) {
  if (container.classList.contains("labels-size-small")) return { width: 1.15, height: 28 };
  if (container.classList.contains("labels-size-roll80")) return { width: 2, height: 52 };
  return { width: 1.5, height: 40 };
}
function renderizarCodigosBarrasEtiquetas(container) {
  if (!container) return;
  const opcoes = opcoesCodigoBarrasEtiquetas(container);
  $$(".barcode-svg[data-barcode]", container).forEach(svg => {
    const codigo = svg.dataset.barcode || "";
    const bloco = svg.closest(".barcode-block");
    bloco?.classList.remove("barcode-ready", "barcode-error");
    if (typeof window.JsBarcode !== "function") return;
    try {
      window.JsBarcode(svg, codigo, { format: "CODE128", displayValue: false, margin: 0, background: "#ffffff", lineColor: "#000000", width: opcoes.width, height: opcoes.height });
      bloco?.classList.add("barcode-ready");
    } catch (error) {
      bloco?.classList.add("barcode-error");
      const fallback = $(".barcode-fallback", bloco);
      if (fallback) fallback.textContent = "Código inválido para CODE128";
    }
  });
}
function prepararAreaEtiquetas() { const formato=$("#labelsPrintSize").value; const html=htmlEtiquetasSelecionadas(); [$("#labelsPreviewArea"),$("#labelsPrintArea")].forEach(area=>{area.className=`${area.id === "labelsPrintArea" ? "labels-print-area " : ""}labels-sheet labels-size-${formato}`;area.innerHTML=html;renderizarCodigosBarrasEtiquetas(area);}); }
function abrirPreviewEtiquetas() { if (!etiquetasSelecionadas.length) return showToast("Adicione ao menos uma etiqueta para visualizar."); prepararAreaEtiquetas(); renderizarCodigosBarrasEtiquetas($("#labelsPreviewArea")); openModal("#labelsPreviewModal"); }
function imprimirEtiquetas() { if (!etiquetasSelecionadas.length) return showToast("Adicione ao menos uma etiqueta para imprimir."); prepararAreaEtiquetas(); renderizarCodigosBarrasEtiquetas($("#labelsPrintArea")); document.body.classList.add("printing-labels"); try { window.print(); } finally { document.body.classList.remove("printing-labels"); } }
function fecharPreviewEtiquetas() { closeModal("#labelsPreviewModal"); $("#labelsPrintArea").innerHTML=""; }

function abrirModalMovimentacaoCaixa(tipo) { if(!pdvCaixa)return showToast("Não há caixa aberto."); $("#cashMoveForm").reset(); $("#cashMoveType").value=tipo; $("#cashMoveTitle").textContent=tipo==="reforco"?"Reforço de caixa":"Sangria de caixa"; openModal("#cashMoveModal"); }
async function salvarMovimentacaoCaixa(event) { event.preventDefault(); const valor=valorPdv("#cashMoveValue"); if(valor<=0)return $("#cashMoveError").textContent="Informe um valor positivo."; const response=await fetchAdmin(`/caixas/${pdvCaixa.id}/movimentacoes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tipo:$("#cashMoveType").value,valor,forma_pagamento:$("#cashMovePayment").value,descricao:$("#cashMoveDescription").value.trim()})});const data=await response?.json().catch(()=>({}));if(!response?.ok)return $("#cashMoveError").textContent=data.message||"Não foi possível registrar.";closeModal("#cashMoveModal");showToast("Movimentação registrada");await carregarCaixaAberto();}
async function fecharCaixaPdv(event) { event.preventDefault();if(!pdvCaixa)return showToast("Não há caixa aberto.");if(!confirm(`Confirma o fechamento do caixa #${pdvCaixa.id}?`))return;const response=await fetchAdmin(`/caixas/${pdvCaixa.id}/fechar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dinheiro:valorPdv("#closeCash"),pix:valorPdv("#closePix"),debito:valorPdv("#closeDebit"),credito:valorPdv("#closeCredit"),observacoes:$("#closeNotes").value.trim()||null})});const data=await response?.json().catch(()=>({}));if(!response?.ok)return showToast(data.message||"Não foi possível fechar o caixa.");$("#pdvCloseResult").innerHTML=`<div class="sale-success"><strong>Caixa fechado</strong><span>Sistema: ${money(Number(data.total_sistema))} · Informado: ${money(Number(data.total_informado))} · Divergência: ${money(Number(data.divergencia))}</span></div>`;pdvCaixa=null;await carregarCaixaAberto();}

async function carregarUsuariosAdmin() {
  if (!usuarioAdministrador()) return;
  const response = await fetchAdmin("/usuarios");
  const data = await response?.json().catch(() => []);
  if (!response?.ok) { $("#usersTable").innerHTML = `<tbody><tr><td>${data.message || "Não foi possível carregar os usuários."}</td></tr></tbody>`; return; }
  $("#usersTable").innerHTML = `<thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Acessos</th></tr></thead><tbody>${data.map(usuario => {
    const permissoes = (usuario.permissoes || []).map(item => item.permissao);
    const grupos = agruparPermissoesUsuario(permissoes);
    const total = ["dona", "super_admin"].includes(usuario.tipo);
    const resumo = total ? "Acesso total" : Object.keys(grupos).slice(0, 3).join(", ") || "Sem permissões";
    const detalhes = Object.entries(grupos).map(([grupo, itens]) => `<div class="permission-group"><strong>${grupo}</strong><div>${itens.map(item => `<span>${escaparHtml(rotuloPermissao(item))}</span>`).join("")}</div></div>`).join("");
    return `<tr class="${usuario.tipo === "super_admin" ? "super-admin-row" : ""}"><td data-label="Usuário"><strong>${escaparHtml(usuario.nome)}</strong><small>${escaparHtml(usuario.email)}</small></td><td data-label="Perfil"><span class="profile-badge ${usuario.tipo}">${usuario.tipo === "super_admin" ? "Super admin" : usuario.tipo === "dona" ? "Dona" : "Funcionária"}</span></td><td data-label="Status"><span class="user-status ${usuario.ativo ? "active" : "inactive"}">${usuario.ativo ? "Ativo" : "Inativo"}</span></td><td data-label="Acessos"><strong class="permission-summary">${resumo}</strong>${detalhes ? `<details class="permission-details"><summary>Ver permissões</summary><div class="permission-groups">${detalhes}</div></details>` : ""}</td></tr>`;
  }).join("")}</tbody>`;
}

function categoriaPermissao(permissao) {
  const prefixo = String(permissao).split(".")[0];
  return ({ admin:"Admin",configuracoes:"Admin",funcionarios:"Admin",pdv:"PDV",vendas:"PDV",caixa:"Caixa",produtos:"Produtos",etiquetas:"Produtos",estoque:"Estoque",fornecedores:"Fornecedores",relatorios:"Relatórios",maquininhas:"Maquininhas",mercado_pago:"Mercado Pago",fiscal:"Fiscal" })[prefixo] || "Admin";
}
function agruparPermissoesUsuario(permissoes) { return permissoes.reduce((grupos, permissao) => { const categoria=categoriaPermissao(permissao); (grupos[categoria] ||= []).push(permissao); return grupos; }, {}); }
function rotuloPermissao(permissao) { return String(permissao).split(".").map(parte => parte.replaceAll("_", " ")).join(" · "); }

async function carregarMaquininhas() {
  const response = await fetchAdmin("/maquininhas");
  if (!response) return;
  const data = await response.json().catch(() => []);
  if (!response.ok) return showToast(data.message || "Não foi possível carregar as maquininhas");
  maquininhas = data;
  renderMaquininhas();
}

function renderMaquininhas() {
  const busca = ($("#machineSearch")?.value || "").toLowerCase();
  const status = $("#machineStatus")?.value || "todos";
  const rows = maquininhas.filter(m => {
    const texto = `${m.nome} ${m.tipo} ${m.pdv_codigo || ""}`.toLowerCase();
    return texto.includes(busca) && (status === "todos" || (status === "ativas") === m.ativo);
  });
  $("#machineSummary").innerHTML = [
    ["Total cadastradas", maquininhas.length], ["Ativas", maquininhas.filter(m => m.ativo).length],
    ["Integradas Mercado Pago", maquininhas.filter(m => m.mercado_pago_integrada).length],
    ["Vinculadas a PDV", maquininhas.filter(m => m.pdv_codigo).length]
  ].map(([label,value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join("");
  $("#machineTable").innerHTML = `<thead><tr><th>Nome</th><th>Tipo</th><th>Provedor</th><th>PDV</th><th>Mercado Pago</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows.map(m => `<tr><td>${m.nome}</td><td>${m.tipo}</td><td>${m.provedor_pagamento}</td><td>${m.pdv_codigo || "—"}</td><td>${m.mercado_pago_integrada ? "Integrada" : "Preparação"}</td><td>${m.ativo ? "Ativa" : "Inativa"}</td><td><button class="link-btn machine-edit" data-id="${m.id}">Editar</button>${m.ativo ? `<button class="link-btn machine-disable" data-id="${m.id}">Desativar</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7">Nenhuma maquininha encontrada.</td></tr>`}</tbody>`;
  $$(".machine-edit").forEach(b => b.addEventListener("click", () => abrirMaquininha(maquininhas.find(m => m.id === Number(b.dataset.id)))));
  $$(".machine-disable").forEach(b => b.addEventListener("click", () => desativarMaquininha(Number(b.dataset.id))));
}

function abrirMaquininha(machine = null) {
  $("#machineForm").reset();
  $("#machineId").value = machine?.id || ""; $("#machineName").value = machine?.nome || "";
  $("#machineType").value = machine?.tipo || "loja"; $("#machineProvider").value = machine?.provedor_pagamento || "manual";
  $("#machinePdv").value = machine?.pdv_codigo || ""; $("#machinePos").value = machine?.mercado_pago_pos_id || "";
  $("#machineStore").value = machine?.mercado_pago_store_id || ""; $("#machineNotes").value = machine?.observacoes || "";
  $("#machineActive").checked = machine?.ativo !== false; $("#machineModalTitle").textContent = machine ? "Editar maquininha" : "Cadastrar maquininha";
  openModal("#machineModal");
}

async function salvarMaquininha(event) {
  event.preventDefault();
  comPin(async pin => {
    const id = $("#machineId").value;
    const body = { nome: $("#machineName").value, tipo: $("#machineType").value, provedor_pagamento: $("#machineProvider").value,
      pdv_codigo: $("#machinePdv").value || null, mercado_pago_pos_id: $("#machinePos").value || null,
      mercado_pago_store_id: $("#machineStore").value || null, observacoes: $("#machineNotes").value || null,
      ativo: $("#machineActive").checked, terminal_tipo: $("#machineType").value };
    const response = await fetchAdmin(`/maquininhas${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin }, body: JSON.stringify(body) });
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) return showToast(data.message || "Não foi possível salvar");
    closeModal("#machineModal"); showToast("Maquininha salva com sucesso"); carregarMaquininhas();
  });
}

function desativarMaquininha(id) {
  if (!confirm("Deseja desativar esta maquininha?")) return;
  comPin(async pin => {
    const response = await fetchAdmin(`/maquininhas/${id}`, { method: "DELETE", headers: { "X-Admin-Pin": pin } });
    const data = await response?.json().catch(() => ({}));
    if (!response?.ok) return showToast(data.message || "Não foi possível desativar");
    showToast("Maquininha desativada"); carregarMaquininhas();
  });
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

/* ----------------- CADASTRO DE PRODUTOS E ESTOQUE V2 ----------------- */
function htmlVariacaoProduto(v={}) { const codigo=v.codigo_barras||v.sku||v.codigo_interno||"";return `<div class="product-v2-item" data-variation-id="${v.id||""}"><div class="form-grid"><div class="form-row"><label>Tamanho</label><input class="pv-size" list="productSizes" maxlength="10" value="${escaparHtml(v.tamanho||"")}" required /><datalist id="productSizes"><option value="PP"><option value="P"><option value="M"><option value="G"><option value="GG"><option value="Único"></datalist></div><div class="form-row"><label>Cor</label><input class="pv-color" maxlength="60" value="${escaparHtml(v.cor||"")}" required /></div><div class="form-row"><label>Quantidade inicial</label><input class="pv-stock" type="number" min="0" step="1" value="${v.quantidade_estoque??0}" ${v.id?'disabled':''} /></div><div class="form-row"><label>Estoque mínimo</label><input class="pv-min" type="number" min="0" step="1" value="${v.estoque_minimo??0}" /></div></div><label class="form-check"><input class="pv-active" type="checkbox" ${v.ativo===false?'':'checked'} /> Variação ativa</label><details class="product-advanced"><summary>${codigo?`Código: ${escaparHtml(codigo)}`:'Código gerado automaticamente'}</summary><p>O código de barras será criado após salvar.</p><div class="form-grid"><div class="form-row"><label>SKU</label><input class="pv-sku" maxlength="80" value="${escaparHtml(v.sku||"")}" /></div><div class="form-row"><label>Código de barras</label><input class="pv-barcode" maxlength="80" value="${escaparHtml(v.codigo_barras||"")}" /></div><input class="pv-price" type="hidden" value="${v.preco_venda??""}" /><input class="pv-promo" type="hidden" value="${v.preco_promocional??""}" /></div></details><button class="link-btn pv-remove" type="button">${v.id?'Inativar/remover':'Remover linha'}</button></div>`; }
function htmlMidiaProduto(m={}) { return `<div class="product-v2-item" data-media-id="${m.id||""}"><div class="form-grid"><div class="form-row"><label>Caminho ou URL da imagem</label><input class="pm-url" value="${escaparHtml(m.url||"")}" required placeholder="assets/produtos/nome-da-foto.jpg" /></div><div class="form-row"><label>Texto alternativo opcional</label><input class="pm-alt" maxlength="180" value="${escaparHtml(m.alt_text||m.titulo||"")}" /></div></div><label class="form-check"><input class="pm-main" name="product-main-media" type="radio" ${m.principal?'checked':''} /> Imagem principal</label><button class="link-btn pm-remove" type="button">Remover imagem</button><div class="product-media-preview-wrap">${m.url?`<img class="product-media-preview" src="${escaparHtml(m.url)}" alt="Prévia" onerror="this.remove()" />`:''}<span>Imagem não encontrada</span></div></div>`; }
function htmlMedidaProduto(m={}){return `<div class="product-v2-item" data-measure-id="${m.id||''}"><div class="form-grid"><div class="form-row"><label>Tamanho</label><input class="measure-size" value="${escaparHtml(m.tamanho||'')}" /></div><div class="form-row"><label>Busto</label><input class="measure-bust" value="${escaparHtml(m.busto||'')}" placeholder="Ex.: 88 cm" /></div><div class="form-row"><label>Cintura</label><input class="measure-waist" value="${escaparHtml(m.cintura||'')}" /></div><div class="form-row"><label>Quadril</label><input class="measure-hip" value="${escaparHtml(m.quadril||'')}" /></div><div class="form-row"><label>Comprimento</label><input class="measure-length" value="${escaparHtml(m.comprimento||'')}" /></div><div class="form-row"><label>Observação</label><input class="measure-note" value="${escaparHtml(m.observacao||'')}" /></div></div><button class="link-btn measure-remove" type="button">Remover medida</button></div>`;}
function tamanhoArquivo(bytes){return bytes>=1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.ceil(bytes/1024)} KB`;}
function renderArquivosProduto(){const area=$("#productFilesPreview");area.innerHTML=productFilesSelected.map((item,index)=>`<div class="product-file-card ${item.principal?'principal':''}">${item.file.type.startsWith('image/')?`<img src="${item.preview}" alt="Prévia">`:`<video src="${item.preview}" controls playsinline preload="metadata"></video>`}<div><strong>${escaparHtml(item.file.name)}</strong><span>${item.file.type.startsWith('image/')?'Foto':'Vídeo'} · ${tamanhoArquivo(item.file.size)}</span></div>${item.file.type.startsWith('image/')?`<button class="btn btn-ghost btn-sm" data-file-main="${index}" type="button">${item.principal?'Foto principal':'Definir como principal'}</button>`:''}<button class="link-btn" data-file-remove="${index}" type="button">Remover</button></div>`).join('');$$('[data-file-remove]',area).forEach(b=>b.onclick=()=>{URL.revokeObjectURL(productFilesSelected[Number(b.dataset.fileRemove)].preview);productFilesSelected.splice(Number(b.dataset.fileRemove),1);if(!productFilesSelected.some(x=>x.principal)){const first=productFilesSelected.find(x=>x.file.type.startsWith('image/'));if(first)first.principal=true;}renderArquivosProduto();});$$('[data-file-main]',area).forEach(b=>b.onclick=()=>{productFilesSelected.forEach(x=>x.principal=false);productFilesSelected[Number(b.dataset.fileMain)].principal=true;renderArquivosProduto();});}
function selecionarArquivosProduto(event){const allowed=new Set(['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']);const novos=[...event.target.files];for(const file of novos){if(!allowed.has(file.type)){showToast('Esse tipo de arquivo não é aceito. Use JPG, PNG, WEBP, MP4, MOV ou WEBM.');continue;}if(file.type.startsWith('image/')&&file.size>10*1024*1024||file.type.startsWith('video/')&&file.size>80*1024*1024){showToast(`${file.name} excede o limite permitido.`);continue;}if(productFilesSelected.length>=12){showToast('Selecione no máximo 12 arquivos por produto.');break;}productFilesSelected.push({file,preview:URL.createObjectURL(file),principal:false});}if(!productFilesSelected.some(x=>x.principal)){const first=productFilesSelected.find(x=>x.file.type.startsWith('image/'));if(first)first.principal=true;}event.target.value='';renderArquivosProduto();}
function renderGaleriaAtualProduto(produtoId,midias=[]){const area=$("#productCurrentGallery");area.innerHTML=midias.length?`<h4>Fotos e vídeos atuais</h4><div class="current-gallery-grid">${midias.map(m=>`<article>${m.tipo==='imagem'?`<img src="${mediaUrl(m.url)}" alt="${escaparHtml(m.alt_text||'Foto')}">`:'<video src="'+mediaUrl(m.url)+'" controls playsinline preload="metadata"></video>'}<span>${m.tipo==='imagem'?'Foto':'Vídeo'}${m.principal?' · Principal':''}</span>${m.tipo==='imagem'&&!m.principal?`<button class="btn btn-ghost btn-sm" data-current-main="${m.id}" type="button">Definir como principal</button>`:''}<button class="link-btn" data-current-delete="${m.id}" type="button">Excluir</button></article>`).join('')}</div>`:'';$$('[data-current-main]',area).forEach(b=>b.onclick=async()=>{const r=await fetchAdmin(`/produtos/${produtoId}/midias/${b.dataset.currentMain}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({principal:true})});if(r?.ok)openProductModal(produtoId);else showToast('Não foi possível definir a foto principal.');});$$('[data-current-delete]',area).forEach(b=>b.onclick=async()=>{if(!confirm('Excluir esta foto ou vídeo?'))return;const r=await fetchAdmin(`/produtos/${produtoId}/midias/${b.dataset.currentDelete}`,{method:'DELETE'});if(r?.ok)openProductModal(produtoId);else showToast('Não foi possível excluir o arquivo.');});}
function bindMedidasProduto(){$$('.measure-remove',$("#productMeasuresEditor")).forEach(b=>b.onclick=()=>{const item=b.closest('.product-v2-item');if(item.dataset.measureId)item.dataset.remove='true';item.hidden=true;});}
function dadosMedidaEditor(item,index){return{tamanho:$('.measure-size',item).value.trim(),busto:$('.measure-bust',item).value.trim(),cintura:$('.measure-waist',item).value.trim(),quadril:$('.measure-hip',item).value.trim(),comprimento:$('.measure-length',item).value.trim(),observacao:$('.measure-note',item).value.trim(),ordem:index};}
function bindEditorProduto(){ $$('.pv-remove',$("#productVariationsEditor")).forEach(b=>b.onclick=()=>{const item=b.closest('.product-v2-item');if(item.dataset.variationId)item.dataset.remove='true';else item.remove();item.hidden=true;}); $$('.pm-remove',$("#productMediaEditor")).forEach(b=>b.onclick=()=>{const item=b.closest('.product-v2-item');if(item.dataset.mediaId)item.dataset.remove='true';else item.remove();item.hidden=true;});$$('.pm-url',$("#productMediaEditor")).forEach(input=>input.oninput=()=>{const wrap=input.closest('.product-v2-item').querySelector('.product-media-preview-wrap');wrap.innerHTML=input.value.trim()?`<img class="product-media-preview" src="${escaparHtml(input.value.trim())}" alt="Prévia" onerror="this.remove()"><span>Imagem não encontrada</span>`:'<span>Sem foto cadastrada</span>';});const radios=$$('.pm-main',$("#productMediaEditor"));if(radios.length&&!radios.some(r=>r.checked))radios[0].checked=true; }
async function openProductModal(id = null) { const form=$("#productForm");form.reset();productFilesSelected.forEach(x=>URL.revokeObjectURL(x.preview));productFilesSelected=[];renderArquivosProduto();$("#productFormError").textContent="";$("#productVariationsEditor").innerHTML="";$("#productMediaEditor").innerHTML="";$("#productMeasuresEditor").innerHTML="";$("#productCurrentGallery").innerHTML="";if(id){const response=await fetchAdmin(`/produtos/${id}`),raw=await response?.json().catch(()=>({}));if(!response?.ok)return showToast(raw.message||"Não foi possível abrir o produto.");const p=adaptarProdutoApi(raw);$("#modalTitle").textContent="Editar produto";$("#fId").value=p.id;$("#fName").value=p.name;$("#fCategory").value=p.category;$("#fPrice").value=p.price;$("#fPromoPrice").value=p.oldPrice??"";$("#fDescription").value=p.description||"";$("#fActive").checked=p.ativo;$("#productVariationsEditor").innerHTML=p.apiVariacoes.map(htmlVariacaoProduto).join("");$("#productMeasuresEditor").innerHTML=p.medidas.map(htmlMedidaProduto).join("");renderGaleriaAtualProduto(p.id,p.midias);}else{$("#modalTitle").textContent="Novo produto";$("#fId").value="";$("#productVariationsEditor").innerHTML=htmlVariacaoProduto({tamanho:"M",cor:"Único"});}bindEditorProduto();bindMedidasProduto();openModal("#productModal"); }
function dadosVariacaoEditor(item){return{tamanho:$('.pv-size',item).value.trim(),cor:$('.pv-color',item).value.trim(),sku:$('.pv-sku',item).value.trim()||null,codigo_barras:$('.pv-barcode',item).value.trim()||null,preco_venda:$('.pv-price',item).value||null,preco_promocional:$('.pv-promo',item).value||null,quantidade_inicial:$('.pv-stock',item).disabled?undefined:Number($('.pv-stock',item).value||0),estoque_minimo:Number($('.pv-min',item).value||0),ativo:$('.pv-active',item).checked};}
async function handleProductSubmit(e) { e.preventDefault();const status=$("#productFormError");status.textContent="Salvando...";const id=Number($("#fId").value)||null;const variationItems=$$('.product-v2-item',$("#productVariationsEditor"));const mediaItems=$$('.product-v2-item',$("#productMediaEditor"));const body={nome:$("#fName").value.trim(),categoria:$("#fCategory").value.trim(),descricao:$("#fDescription").value.trim(),preco:Number($("#fPrice").value),preco_promocional:$("#fPromoPrice").value||null,ativo:$("#fActive").checked,variacoes:id?[]:variationItems.filter(x=>!x.hidden).map(dadosVariacaoEditor)};try{let response=await fetchAdmin(id?`/produtos/${id}`:"/produtos",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),data=await response?.json().catch(()=>({}));if(!response?.ok)throw new Error(data.message||"Não foi possível salvar o produto.");const produtoId=id||data.id;if(id)for(const item of variationItems){const vid=Number(item.dataset.variationId);if(item.dataset.remove==='true'&&vid){const r=await fetchAdmin(`/produtos/${id}/variacoes/${vid}`,{method:"DELETE"});if(!r?.ok)throw new Error((await r.json().catch(()=>({}))).message||"Falha ao remover variação.");}else if(!item.hidden){const payload=dadosVariacaoEditor(item),r=await fetchAdmin(vid?`/produtos/${id}/variacoes/${vid}`:`/produtos/${id}/variacoes`,{method:vid?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!r?.ok)throw new Error((await r.json().catch(()=>({}))).message||"Falha ao salvar variação.");}}for(const item of mediaItems){const mid=Number(item.dataset.mediaId);if(item.dataset.remove==='true'&&mid){const r=await fetchAdmin(`/produtos/${produtoId}/midias/${mid}`,{method:"DELETE"});if(!r?.ok)throw new Error((await r.json().catch(()=>({}))).message||"Falha ao remover imagem.");}else if(!item.hidden){const payload={url:$('.pm-url',item).value.trim(),alt_text:$('.pm-alt',item).value.trim(),titulo:$('.pm-alt',item).value.trim(),principal:$('.pm-main',item).checked};const r=await fetchAdmin(mid?`/produtos/${produtoId}/midias/${mid}`:`/produtos/${produtoId}/midias`,{method:mid?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});if(!r?.ok)throw new Error((await r.json().catch(()=>({}))).message||"Falha ao salvar imagem.");}}closeModal("#productModal");showToast(id?"Produto atualizado.":"Produto cadastrado.");await carregarProdutosDaApi();await carregarEstoqueDaApi();if(typeof carregarProdutosEtiquetas==="function")carregarProdutosEtiquetas();}catch(error){status.textContent=error.message||"Backend indisponível.";} }
async function handleProductSubmitV3(event){event.preventDefault();const status=$("#productFormError"),id=Number($("#fId").value)||null,variacoes=$$('.product-v2-item',$("#productVariationsEditor")),links=$$('.product-v2-item',$("#productMediaEditor")),medidas=$$('.product-v2-item',$("#productMeasuresEditor"));status.textContent="Salvando produto...";const body={nome:$("#fName").value.trim(),categoria:$("#fCategory").value.trim(),descricao:$("#fDescription").value.trim(),preco:Number($("#fPrice").value),preco_promocional:$("#fPromoPrice").value||null,ativo:$("#fActive").checked,variacoes:id?[]:variacoes.filter(x=>!x.hidden).map(dadosVariacaoEditor)};try{const response=await fetchAdmin(id?`/produtos/${id}`:'/produtos',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response?.json().catch(()=>({}));if(!response?.ok)throw new Error(data.message||'Não foi possível salvar o produto.');const produtoId=id||data.id;if(id)for(const item of variacoes){const variacaoId=Number(item.dataset.variationId),remove=item.dataset.remove==='true';const r=await fetchAdmin(remove&&variacaoId?`/produtos/${produtoId}/variacoes/${variacaoId}`:variacaoId?`/produtos/${produtoId}/variacoes/${variacaoId}`:`/produtos/${produtoId}/variacoes`,{method:remove&&variacaoId?'DELETE':variacaoId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:remove?undefined:JSON.stringify(dadosVariacaoEditor(item))});if(!r?.ok)throw new Error((await r?.json().catch(()=>({}))).message||'Falha ao salvar uma variação.');}for(const item of links.filter(x=>!x.hidden)){const payload={url:$('.pm-url',item).value.trim(),alt_text:$('.pm-alt',item).value.trim(),principal:$('.pm-main',item).checked};const r=await fetchAdmin(`/produtos/${produtoId}/midias`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r?.ok)throw new Error((await r.json().catch(()=>({}))).message||'Falha ao salvar um link.');}
    for(let index=0;index<medidas.length;index+=1){const item=medidas[index],medidaId=Number(item.dataset.measureId);if(item.dataset.remove==='true'&&medidaId){await fetchAdmin(`/produtos/${produtoId}/medidas/${medidaId}`,{method:'DELETE'});continue;}if(item.hidden)continue;const payload=dadosMedidaEditor(item,index);if(!Object.values(payload).some(Boolean))continue;const r=await fetchAdmin(medidaId?`/produtos/${produtoId}/medidas/${medidaId}`:`/produtos/${produtoId}/medidas`,{method:medidaId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r?.ok)throw new Error((await r.json().catch(()=>({}))).message||'Falha ao salvar as medidas.');}
    if(productFilesSelected.length){status.textContent="Enviando fotos e vídeos...";const formData=new FormData();productFilesSelected.forEach(item=>formData.append('arquivos',item.file));formData.append('principal_indice',String(productFilesSelected.findIndex(item=>item.principal)));const upload=await fetchAdmin(`/produtos/${produtoId}/midias/upload`,{method:'POST',body:formData}),uploadData=await upload?.json().catch(()=>({}));if(!upload?.ok){status.textContent=`Produto salvo, mas algumas fotos/vídeos não foram enviados. ${uploadData.message||'Tente adicionar novamente.'}`;await carregarProdutosDaApi();await carregarEstoqueDaApi();return;}}
    closeModal('#productModal');showToast('Produto salvo com sucesso.');await carregarProdutosDaApi();await carregarEstoqueDaApi();if(typeof carregarProdutosEtiquetas==='function')carregarProdutosEtiquetas();}catch(error){status.textContent=error.message||'Backend indisponível.';}}
function abrirMovimentoEstoque(button){$("#stockMoveVariationId").value=button.dataset.stockMove;$("#stockMoveTitle").textContent=`Movimentar — ${button.dataset.stockLabel}`;$("#stockMoveForm").reset();$("#stockMoveError").textContent="";openModal("#stockMoveModal");}
async function salvarMovimentoEstoque(event){event.preventDefault();const status=$("#stockMoveError");status.textContent="Salvando...";const id=$("#stockMoveVariationId").value;try{const response=await fetchAdmin(`/estoque/${id}/movimentar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tipo:$("#stockMoveType").value,quantidade:Number($("#stockMoveQuantity").value),motivo:$("#stockMoveReason").value.trim(),observacoes:$("#stockMoveNotes").value.trim()})}),data=await response?.json().catch(()=>({}));if(!response?.ok)throw new Error(data.message||"Não foi possível atualizar o estoque.");closeModal("#stockMoveModal");showToast(data.message);await carregarEstoqueDaApi();}catch(error){status.textContent=error.message;}}
async function abrirDetalheEstoque(variacaoId){const row=estoqueApiRows?.find(r=>Number(r.variacao_id)===Number(variacaoId));if(!row)return;$("#stockDetailTitle").textContent=row.produto_nome;$("#stockDetailBody").innerHTML='<p class="shipping-status">Carregando detalhes...</p>';openModal("#stockDetailModal");try{const [produtoResponse,movResponse]=await Promise.all([fetchAdmin(`/produtos/${row.produto_id}`),fetchAdmin(`/movimentacoes?produto_id=${row.produto_id}`)]),produto=await produtoResponse?.json().catch(()=>({})),movimentos=movResponse?.ok?await movResponse.json():[];const imagem=(produto.midias||[]).find(m=>m.tipo==='imagem'&&m.principal)||(produto.midias||[]).find(m=>m.tipo==='imagem');const preco=row.preco_promocional??row.preco_venda??produto.preco??0;$("#stockDetailBody").innerHTML=`<div class="stock-detail-head"><div class="stock-detail-image">${imagem?`<img src="${escaparHtml(imagem.url)}" alt="${escaparHtml(imagem.alt_text||produto.nome)}"><span>Imagem não encontrada</span>`:'<span>Sem foto cadastrada</span>'}</div><div><span class="shop-cat">${escaparHtml(produto.categoria||row.categoria||'')}</span><h3>${escaparHtml(produto.nome||row.produto_nome)}</h3><p>${escaparHtml(produto.descricao||'Sem descrição cadastrada.')}</p></div></div><div class="stock-detail-grid">${[["Variação",[row.tamanho,row.cor].filter(Boolean).join(' / ')],["SKU",row.sku||'—'],["Código de barras",row.codigo_barras||row.sku||'—'],["Preço",formatarMoeda(preco)],["Estoque atual",`${row.quantidade} un.`],["Estoque mínimo",`${row.estoque_minimo||0} un.`],["Status",row.status]].map(([l,v])=>`<div><span>${l}</span><strong>${escaparHtml(v)}</strong></div>`).join('')}</div><h4>Últimas movimentações</h4><div class="stock-detail-moves">${(movimentos||[]).slice(0,5).map(m=>`<div><strong>${escaparHtml(m.tipo)}</strong><span>${m.quantidade} un. · ${escaparHtml(m.motivo||'')}</span><small>${new Date(m.created_at).toLocaleString('pt-BR')}</small></div>`).join('')||'<p class="empty-note">Nenhuma movimentação registrada.</p>'}</div><div class="site-order-actions"><button class="btn btn-pink" id="stockDetailMove" type="button">Entrada / Saída / Ajustar</button><button class="btn btn-ghost" id="stockDetailEdit" type="button">Editar produto e variação</button><button class="btn btn-ghost" id="stockDetailLabels" type="button">Ir para etiquetas</button><button class="btn btn-ghost" id="stockDetailPdv" type="button">Buscar no PDV</button></div>`;$("#stockDetailMove").onclick=()=>{closeModal("#stockDetailModal");abrirMovimentoEstoque({dataset:{stockMove:row.variacao_id,stockLabel:`${row.produto_nome} — ${row.tamanho}/${row.cor}`}});};$("#stockDetailEdit").onclick=()=>{closeModal("#stockDetailModal");openProductModal(Number(row.produto_id));};$("#stockDetailLabels").onclick=()=>{closeModal("#stockDetailModal");navigate('etiquetas');};$("#stockDetailPdv").onclick=()=>{closeModal("#stockDetailModal");navigate('pdv');setTimeout(()=>{$("#pdvStoreSearch").value=row.sku||row.codigo_barras||row.produto_nome;$("#pdvSearchForm").requestSubmit();},0);};}catch(error){$("#stockDetailBody").innerHTML=`<p class="login-error">${escaparHtml(error.message||'Não foi possível carregar os detalhes.')}</p>`;}}

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
  renderFretesBairro();
  renderMovements();
  renderSuppliers();
  renderHistory();
  atualizarAuthUi();
  carregarProdutosDaApi();
  if (usuarioAdministrador()) {
    carregarEstoqueDaApi();
    carregarMovimentacoesDaApi();
    carregarFornecedoresDaApi();
    carregarClientesDaApi();
    carregarFretesBairro();
  }

  // navegação (topbar, banner, links)
  $$("[data-nav]").forEach(b => {
    b.addEventListener("click", () => navigate(b.dataset.nav, "Todos"));
  });
  $$("[data-scroll-target]").forEach(button => button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.scrollTarget);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  // carrinho público
  $("#cartButton").addEventListener("click", abrirCheckoutPublico);
  $("#publicCheckoutBack").addEventListener("click", fecharCheckoutPublico);
  $("#publicEmptyCatalog").addEventListener("click", fecharCheckoutPublico);
  $$("input[name='publicDelivery']").forEach(option => option.addEventListener("change", () => {
    const local = option.value === "local" && option.checked;
    $("#localShippingWrap").classList.toggle("show", local);
    if (!local) { localShippingQuote = null; setShippingStatus(""); }
    updateCartTotals();
  }));
  ["#customerCity","#customerDistrict","#customerState"].forEach(id => $(id).addEventListener("input", resetLocalShippingQuote));
  $("#customerState").addEventListener("input", event => { event.target.value=event.target.value.toUpperCase(); });
  $("#btnCalculateShipping").addEventListener("click", calcularFreteBairro);
  $("#btnCheckout").addEventListener("click", checkout);
  $("#btnLogout").addEventListener("click", logoutAdmin);
  $("#btnAdminAccess").addEventListener("click", () => usuarioAdministrador() ? navigate("gestao") : abrirLoginAdmin(() => navigate("gestao")));

  // login administrativo
  $("#loginForm").addEventListener("submit", handleLoginSubmit);
  $("#loginClose").addEventListener("click", cancelarLoginAdmin);
  $("#loginCancel").addEventListener("click", cancelarLoginAdmin);
  $("#loginModal").addEventListener("click", (e) => {
    if (e.target.id === "loginModal") cancelarLoginAdmin();
  });
  $("#pinForm").addEventListener("submit", validarPin);
  $("#pinClose").addEventListener("click", () => closeModal("#pinModal"));
  $("#pinCancel").addEventListener("click", () => closeModal("#pinModal"));
  $("#btnAddMachine").addEventListener("click", () => abrirMaquininha());
  $("#machineForm").addEventListener("submit", salvarMaquininha);
  $("#machineClose").addEventListener("click", () => closeModal("#machineModal"));
  $("#machineCancel").addEventListener("click", () => closeModal("#machineModal"));
  $("#machineSearch").addEventListener("input", renderMaquininhas);
  $("#machineStatus").addEventListener("change", renderMaquininhas);
  $("#mpConfigForm").addEventListener("submit", salvarConfigMercadoPago);

  // pedidos do site
  $("#siteOrdersRefresh").addEventListener("click", carregarPedidosSite);
  $("#siteOrdersFilter").addEventListener("click", carregarPedidosSite);
  $("#siteOrdersSearch").addEventListener("keydown", event => { if (event.key === "Enter") carregarPedidosSite(); });
  $("#siteOrderClose").addEventListener("click", () => closeModal("#siteOrderModal"));
  $("#siteOrderModal").addEventListener("click", event => { if (event.target.id === "siteOrderModal") closeModal("#siteOrderModal"); });

  // preparação fiscal
  $$("[data-fiscal-tab]").forEach(button => button.addEventListener("click", () => { $$("[data-fiscal-tab]").forEach(b=>b.classList.toggle("active",b===button)); $$(".fiscal-tab-panel").forEach(p=>p.classList.remove("active")); $(`#fiscalTab${button.dataset.fiscalTab[0].toUpperCase()+button.dataset.fiscalTab.slice(1)}`).classList.add("active"); }));
  $("#fiscalAmbiente").addEventListener("change", atualizarBadgeAmbienteFiscal);
  $("#fiscalConfigForm").addEventListener("submit", salvarConfigFiscal);
  $("#fiscalProductsRefresh").addEventListener("click", carregarProdutosFiscais);
  $("#fiscalProductsSearch").addEventListener("input", renderProdutosFiscais);
  $("#fiscalDocsRefresh").addEventListener("click", carregarDocumentosFiscais);
  $("#fiscalPrepareForm").addEventListener("submit", prepararNotaFiscalForm);
  $("#fiscalProductForm").addEventListener("submit", salvarFiscalProduto);
  $("#fiscalProductClose").addEventListener("click",()=>closeModal("#fiscalProductModal"));
  $("#fiscalProductCancel").addEventListener("click",()=>closeModal("#fiscalProductModal"));
  $("#fiscalDocumentClose").addEventListener("click",()=>closeModal("#fiscalDocumentModal"));

  // CRUD de produto
  $("#btnAddProduct").addEventListener("click", () => openProductModal());
  $("#btnQuickVariation").addEventListener("click", () => { const id=Number(prompt("Informe o ID do produto que receberá a nova variação:")); if(id) openProductModal(id).then(()=>{$("#productVariationsEditor").insertAdjacentHTML("beforeend",htmlVariacaoProduto());bindEditorProduto();}); });
  $("#addProductVariation").addEventListener("click", () => { $("#productVariationsEditor").insertAdjacentHTML("beforeend", htmlVariacaoProduto()); bindEditorProduto(); });
  $("#addProductMedia").addEventListener("click", () => { $("#productMediaEditor").insertAdjacentHTML("beforeend", htmlMidiaProduto()); bindEditorProduto(); });
  $("#productForm").addEventListener("submit", handleProductSubmitV3);
  $("#chooseProductFiles").addEventListener("click", () => $("#productFiles").click());
  $("#productFiles").addEventListener("change", selecionarArquivosProduto);
  $("#addProductMeasure").addEventListener("click", () => { $("#productMeasuresEditor").insertAdjacentHTML("beforeend",htmlMedidaProduto());bindMedidasProduto(); });
  $("#modalClose").addEventListener("click", () => closeModal("#productModal"));
  $("#modalCancel").addEventListener("click", () => closeModal("#productModal"));
  $("#productModal").addEventListener("click", (e) => {
    if (e.target.id === "productModal") closeModal("#productModal");
  });
  $("#stockMoveForm").addEventListener("submit", salvarMovimentoEstoque);
  $("#stockMoveClose").addEventListener("click", () => closeModal("#stockMoveModal"));
  $("#stockMoveCancel").addEventListener("click", () => closeModal("#stockMoveModal"));
  $("#stockDetailClose").addEventListener("click", () => closeModal("#stockDetailModal"));
  $("#stockDetailBody").addEventListener("error", event => { if (event.target.matches("img")) event.target.remove(); }, true);
  $("#stockV2Search").addEventListener("input", renderStockTable);
  $("#stockV2Category").addEventListener("change", renderStockTable);
  $("#stockV2Status").addEventListener("change", renderStockTable);

  // relatórios
  $("#btnAddFreight").addEventListener("click", () => {
    if (!usuarioLogado()) {
      abrirLoginAdmin(() => openFreightModal());
      return;
    }
    openFreightModal();
  });
  $("#freightForm").addEventListener("submit", salvarFreteBairro);
  $("#freightClose").addEventListener("click", closeFreightModal);
  $("#freightCancel").addEventListener("click", closeFreightModal);
  $("#freightModal").addEventListener("click", (e) => {
    if (e.target.id === "freightModal") closeFreightModal();
  });
  $("#freightSearch").addEventListener("input", () => {
    freightDeactivateConfirmId = null;
    renderFretesBairro();
  });
  $("#freightStatusFilter").addEventListener("change", (e) => {
    freightStatusFilter = e.target.value;
    freightDeactivateConfirmId = null;
    renderFretesBairro();
  });
  $("#freightState").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

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

  // PDV Loja Física
  $("#pdvTerminal").addEventListener("change", selecionarTerminalPdv);
  $("#pdvSearchForm").addEventListener("submit", buscarProdutoPdv);
  $("#pdvStoreSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); buscarProdutoPdv(event); }
  });
  $("#pdvOpenCashForm").addEventListener("submit", abrirCaixaPdv);
  $("#pdvDiscount").addEventListener("input", atualizarCarrinhoPdv);
  ["#payCash", "#payPix", "#payDebit", "#payCredit"].forEach(id => $(id).addEventListener("input", calcularPagamentosPdv));
  $("#pdvDeliveryType").addEventListener("change", () => { const local=$("#pdvDeliveryType").value==="local"; $("#pdvDeliveryFields").classList.toggle("show",local); if(!local){pdvFrete=null;atualizarCarrinhoPdv();} });
  $("#pdvCalculateFreight").addEventListener("click", calcularFretePdv);
  $("#pdvFinalize").addEventListener("click", finalizarVendaPdv);
  $$('[data-cash-move]').forEach(button => button.addEventListener("click", () => abrirModalMovimentacaoCaixa(button.dataset.cashMove)));
  $("#cashMoveForm").addEventListener("submit", salvarMovimentacaoCaixa);
  $("#cashMoveClose").addEventListener("click", () => closeModal("#cashMoveModal"));
  $("#cashMoveCancel").addEventListener("click", () => closeModal("#cashMoveModal"));
  $("#pdvCloseCashForm").addEventListener("submit", fecharCaixaPdv);
  $("#receiptSearchForm").addEventListener("submit", buscarVendaParaReimpressao);
  $("#receiptPrint").addEventListener("click", () => imprimirComprovanteVenda(ultimaVendaPdv));
  $("#receiptClose").addEventListener("click", () => closeModal("#receiptModal"));
  $("#receiptCancel").addEventListener("click", () => closeModal("#receiptModal"));
  $("#receiptModal").addEventListener("click", event => { if (event.target.id === "receiptModal") closeModal("#receiptModal"); });
  $("#labelsSearch").addEventListener("input", filtrarEtiquetas);
  $("#generateMissingCodes").addEventListener("click", gerarCodigosFaltantes);
  $("#labelsPreviewButton").addEventListener("click", abrirPreviewEtiquetas);
  $("#labelsPrintButton").addEventListener("click", imprimirEtiquetas);
  $("#labelsPreviewPrint").addEventListener("click", imprimirEtiquetas);
  $("#labelsPreviewClose").addEventListener("click", fecharPreviewEtiquetas);
  $("#labelsPreviewCancel").addEventListener("click", fecharPreviewEtiquetas);
  $("#labelsPreviewModal").addEventListener("click", event => { if(event.target.id==="labelsPreviewModal") fecharPreviewEtiquetas(); });
  $("#labelsPrintSize").addEventListener("change", () => { if ($("#labelsPreviewModal").classList.contains("open")) prepararAreaEtiquetas(); });

  // marca "Início" como ativo
  const homeNav = $('.nav-link[data-nav="home"]');
  if (homeNav) homeNav.classList.add("active");
}

document.addEventListener("DOMContentLoaded", init);
