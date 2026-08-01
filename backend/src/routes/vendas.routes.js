const express = require("express");
const vendasController = require("../controllers/vendas.controller");
const permissoesMiddleware = require("../middlewares/permissoes.middleware");

const router = express.Router();

router.get("/", permissoesMiddleware(["relatorios.ver", "vendas.criar"]), vendasController.listarVendas);
router.get("/:id", permissoesMiddleware(["relatorios.ver", "vendas.criar"]), vendasController.detalharVenda);
router.post("/", permissoesMiddleware(["vendas.criar"]), vendasController.criarVenda);

module.exports = router;
