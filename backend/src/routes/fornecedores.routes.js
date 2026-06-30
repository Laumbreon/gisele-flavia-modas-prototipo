const express = require("express");
const fornecedoresController = require("../controllers/fornecedores.controller");

const router = express.Router();

router.get("/", fornecedoresController.listarFornecedores);

module.exports = router;
