const express = require("express");
const vendasController = require("../controllers/vendas.controller");

const router = express.Router();

router.get("/", vendasController.listarVendas);

module.exports = router;
