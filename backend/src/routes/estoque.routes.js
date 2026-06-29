const express = require("express");
const estoqueController = require("../controllers/estoque.controller");

const router = express.Router();

router.get("/", estoqueController.listarEstoque);

module.exports = router;
