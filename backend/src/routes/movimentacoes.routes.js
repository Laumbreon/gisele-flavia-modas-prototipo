const express = require("express");
const movimentacoesController = require("../controllers/movimentacoes.controller");

const router = express.Router();

router.get("/", movimentacoesController.listarMovimentacoes);

module.exports = router;
