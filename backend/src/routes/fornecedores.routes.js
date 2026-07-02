const express = require("express");
const fornecedoresController = require("../controllers/fornecedores.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();

router.get("/", permissaoMiddleware("fornecedores.ver"), fornecedoresController.listarFornecedores);

module.exports = router;
