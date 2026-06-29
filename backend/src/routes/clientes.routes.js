const express = require("express");
const clientesController = require("../controllers/clientes.controller");

const router = express.Router();

router.get("/", clientesController.listarClientes);
router.post("/", clientesController.criarCliente);

module.exports = router;
