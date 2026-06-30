const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const authMiddleware = require("./src/middlewares/auth.middleware");

const authRoutes = require("./src/routes/auth.routes");
const healthRoutes = require("./src/routes/health.routes");
const publicProdutosRoutes = require("./src/routes/public-produtos.routes");
const produtosRoutes = require("./src/routes/produtos.routes");
const clientesRoutes = require("./src/routes/clientes.routes");
const vendasRoutes = require("./src/routes/vendas.routes");
const estoqueRoutes = require("./src/routes/estoque.routes");
const movimentacoesRoutes = require("./src/routes/movimentacoes.routes");
const fornecedoresRoutes = require("./src/routes/fornecedores.routes");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/public/produtos", publicProdutosRoutes);
app.use("/api/produtos", produtosRoutes);
app.use("/api/clientes", authMiddleware, clientesRoutes);
app.use("/api/vendas", authMiddleware, vendasRoutes);
app.use("/api/estoque", authMiddleware, estoqueRoutes);
app.use("/api/movimentacoes", authMiddleware, movimentacoesRoutes);
app.use("/api/fornecedores", authMiddleware, fornecedoresRoutes);

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


