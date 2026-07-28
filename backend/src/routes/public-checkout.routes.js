const express = require("express");
const controller = require("../controllers/public-checkout.controller");
const router = express.Router();
router.post("/", controller.checkoutPublico);
module.exports = router;
