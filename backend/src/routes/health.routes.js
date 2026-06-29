const express = require("express");
const { query } = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await query("SELECT 1");

    res.json({
      backend: "ok",
      database: "ok",
    });
  } catch (error) {
    res.status(503).json({
      backend: "ok",
      database: "error",
      message: "Não foi possível conectar ao PostgreSQL",
    });
  }
});

module.exports = router;
