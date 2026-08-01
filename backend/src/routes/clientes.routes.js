const express = require("express");
const clientesController = require("../controllers/clientes.controller");
const permissoesMiddleware = require("../middlewares/permissoes.middleware");

const router = express.Router();

router.get("/", permissoesMiddleware(["relatorios.ver"]), clientesController.listarClientes);
router.post("/", permissoesMiddleware(["vendas.criar"]), clientesController.criarCliente);

module.exports = router;
