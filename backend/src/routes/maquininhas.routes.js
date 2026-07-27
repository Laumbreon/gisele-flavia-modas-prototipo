const express = require("express");
const controller = require("../controllers/maquininhas.controller");
const permissoes = require("../middlewares/permissoes.middleware");
const adminPin = require("../middlewares/admin-pin.middleware");

const router = express.Router();
router.get("/", permissoes(["relatorios.ver", "maquininhas.ver"]), controller.listarMaquininhas);
router.get("/:id", permissoes(["relatorios.ver", "maquininhas.ver"]), controller.buscarMaquininha);
router.post("/", permissoes(["configuracoes.editar", "maquininhas.gerenciar"]), adminPin, controller.criarMaquininha);
router.put("/:id", permissoes(["configuracoes.editar", "maquininhas.gerenciar"]), adminPin, controller.atualizarMaquininha);
router.delete("/:id", permissoes(["configuracoes.editar", "maquininhas.gerenciar"]), adminPin, controller.desativarMaquininha);
module.exports = router;
