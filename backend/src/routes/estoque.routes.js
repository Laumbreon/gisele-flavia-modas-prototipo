const express = require("express");
const estoqueController = require("../controllers/estoque.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();

router.get("/", permissaoMiddleware("estoque.ver"), estoqueController.listarEstoque);

module.exports = router;
