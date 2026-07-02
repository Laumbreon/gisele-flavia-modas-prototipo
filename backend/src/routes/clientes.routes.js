const express = require("express");
const clientesController = require("../controllers/clientes.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();

router.get("/", permissaoMiddleware("relatorios.ver"), clientesController.listarClientes);
router.post("/", permissaoMiddleware("vendas.criar"), clientesController.criarCliente);

module.exports = router;
