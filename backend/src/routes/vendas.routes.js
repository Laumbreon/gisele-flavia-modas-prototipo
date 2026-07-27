const express = require("express");
const vendasController = require("../controllers/vendas.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");
const permissoesMiddleware = require("../middlewares/permissoes.middleware");

const router = express.Router();

router.get("/", permissaoMiddleware("relatorios.ver"), vendasController.listarVendas);
router.get("/:id", permissoesMiddleware(["relatorios.ver", "vendas.criar"]), vendasController.detalharVenda);
router.post("/", permissaoMiddleware("vendas.criar"), vendasController.criarVenda);

module.exports = router;
