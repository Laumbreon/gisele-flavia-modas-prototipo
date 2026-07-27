const express = require("express");
const controller = require("../controllers/usuarios.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();
router.get("/", permissoes(["funcionarios.gerenciar"]), controller.listarUsuarios);
module.exports = router;
