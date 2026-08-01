const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/admin-access", authMiddleware, (_req, res) => res.status(204).end());
router.get("/me", authMiddleware, authController.me);

module.exports = router;
