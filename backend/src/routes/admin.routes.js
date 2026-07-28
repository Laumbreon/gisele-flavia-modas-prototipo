const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const adminController = require("../controllers/admin.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();
router.post(
  "/validar-pin",
  authMiddleware,
  permissoes(["admin.sensivel", "fiscal.gerenciar", "configuracoes.editar"]),
  adminController.validarPin
);

module.exports = router;
