require("dotenv").config();

const express = require("express");
const cors = require("cors");

const healthRoutes = require("./src/routes/health.routes");
const produtosRoutes = require("./src/routes/produtos.routes");
const clientesRoutes = require("./src/routes/clientes.routes");
const vendasRoutes = require("./src/routes/vendas.routes");
const estoqueRoutes = require("./src/routes/estoque.routes");
const movimentacoesRoutes = require("./src/routes/movimentacoes.routes");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/produtos", produtosRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/vendas", vendasRoutes);
app.use("/api/estoque", estoqueRoutes);
app.use("/api/movimentacoes", movimentacoesRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor" });
});

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});

