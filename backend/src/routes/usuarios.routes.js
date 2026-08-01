const express = require("express");
const controller = require("../controllers/usuarios.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();
router.get("/", permissoes(["funcionarios.gerenciar"]), controller.listarUsuarios);
router.post("/administradores", permissoes(["funcionarios.gerenciar"]), controller.criarAdministrador);
router.delete("/administradores/:id", permissoes(["funcionarios.gerenciar"]), controller.excluirAdministrador);
module.exports = router;
