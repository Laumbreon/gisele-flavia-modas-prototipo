const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();
router.post("/validar-pin", authMiddleware, (req, res, next) => {
  if (!["dona", "super_admin"].includes(req.usuario?.tipo)) {
    return res.status(403).json({ message: "Acesso administrativo não autorizado." });
  }
  next();
}, adminController.validarPin);

module.exports = router;
