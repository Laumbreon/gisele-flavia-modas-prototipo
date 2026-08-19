const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const adminController = require("../controllers/admin.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();
router.get(
  "/correios/status",
  authMiddleware,
  permissoes(["configuracoes.editar"]),
  adminController.statusCorreios
);
router.post(
  "/validar-pin",
  authMiddleware,
  permissoes(["admin.sensivel", "fiscal.gerenciar", "mercado_pago.configurar", "configuracoes.editar"]),
  adminController.validarPin
);

module.exports = router;
