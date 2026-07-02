const express = require("express");
const vendasController = require("../controllers/vendas.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();

router.get("/", permissaoMiddleware("relatorios.ver"), vendasController.listarVendas);
router.post("/", permissaoMiddleware("vendas.criar"), vendasController.criarVenda);

module.exports = router;
