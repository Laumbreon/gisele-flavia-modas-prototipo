const express = require("express");
const controller = require("../controllers/configuracoes-site.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();
router.get("/", permissoes(["configuracoes.editar"]), controller.listarConfiguracoes);
router.put("/", permissoes(["configuracoes.editar"]), controller.salvarConfiguracoes);

const publicRouter = express.Router();
publicRouter.get("/", controller.listarConfiguracoes);

module.exports = { router, publicRouter };
