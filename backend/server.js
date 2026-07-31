const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const fs = require("fs");

const express = require("express");
const cors = require("cors");
const authMiddleware = require("./src/middlewares/auth.middleware");

const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");
const healthRoutes = require("./src/routes/health.routes");
const publicProdutosRoutes = require("./src/routes/public-produtos.routes");
const publicCheckoutRoutes = require("./src/routes/public-checkout.routes");
const produtosRoutes = require("./src/routes/produtos.routes");
const clientesRoutes = require("./src/routes/clientes.routes");
const vendasRoutes = require("./src/routes/vendas.routes");
const estoqueRoutes = require("./src/routes/estoque.routes");
const movimentacoesRoutes = require("./src/routes/movimentacoes.routes");
const fornecedoresRoutes = require("./src/routes/fornecedores.routes");
const fretesBairroRoutes = require("./src/routes/fretes-bairro.routes");
const caixasRoutes = require("./src/routes/caixas.routes");
const maquininhasRoutes = require("./src/routes/maquininhas.routes");
const usuariosRoutes = require("./src/routes/usuarios.routes");
const pedidosSiteRoutes = require("./src/routes/pedidos-site.routes");
const fiscalRoutes = require("./src/routes/fiscal.routes");
const mercadoPagoRoutes = require("./src/routes/mercado-pago.routes");
const clientesAuthRoutes = require("./src/routes/clientes-auth.routes");
const { authClienteOpcional } = require("./src/middlewares/auth-cliente.middleware");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { fallthrough: false, index: false }));

app.use("/api/auth", authRoutes);
app.use("/api/clientes-auth", clientesAuthRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/public/produtos", publicProdutosRoutes);
app.use("/api/public/checkout", authClienteOpcional, publicCheckoutRoutes);
app.use("/api/public/frete-bairro", fretesBairroRoutes.publicRouter);
app.use("/api/produtos", authMiddleware, produtosRoutes);
app.use("/api/clientes", authMiddleware, clientesRoutes);
app.use("/api/vendas", authMiddleware, vendasRoutes);
app.use("/api/estoque", authMiddleware, estoqueRoutes);
app.use("/api/movimentacoes", authMiddleware, movimentacoesRoutes);
app.use("/api/fornecedores", authMiddleware, fornecedoresRoutes);
app.use("/api/fretes-bairro", authMiddleware, fretesBairroRoutes.router);
app.use("/api/caixas", authMiddleware, caixasRoutes);
app.use("/api/maquininhas", authMiddleware, maquininhasRoutes);
app.use("/api/usuarios", authMiddleware, usuariosRoutes);
app.use("/api/pedidos-site", authMiddleware, pedidosSiteRoutes);
app.use("/api/fiscal", authMiddleware, fiscalRoutes);
// O webhook do Mercado Pago é público; as demais rotas aplicam autenticação no próprio router.
app.use("/api/mercado-pago", mercadoPagoRoutes);

// Entrega o frontend e seus arquivos de estilo e comportamento.
// As rotas /api e /uploads acima continuam tendo prioridade.
const frontendDirectory = path.resolve(__dirname, "../frontend");
const frontendIndex = path.join(frontendDirectory, "index.html");
if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDirectory, { index: false }));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.method !== "GET") return next();
    return res.sendFile(frontendIndex);
  });
}

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor" });
});

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
  console.log("PostgreSQL config:", {
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_PORT: process.env.DB_PORT || "5432",
    DB_NAME: process.env.DB_NAME || "gisele_flavia_modas",
  });
});


