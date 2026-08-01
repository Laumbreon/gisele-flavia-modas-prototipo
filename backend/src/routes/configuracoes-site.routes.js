const express = require("express");
const controller = require("../controllers/configuracoes-site.controller");
const permissoes = require("../middlewares/permissoes.middleware");
const { middlewareUploadCarrossel } = require("../middlewares/upload-carrossel.middleware");
const { middlewareUploadInformativo } = require("../middlewares/upload-informativo.middleware");

const router = express.Router();
router.get("/", permissoes(["configuracoes.editar"]), controller.listarConfiguracoes);
router.put("/", permissoes(["configuracoes.editar"]), controller.salvarConfiguracoes);
router.post("/carrossel/upload", permissoes(["configuracoes.editar"]), middlewareUploadCarrossel, controller.uploadCarrossel);
router.delete("/carrossel/:indice", permissoes(["configuracoes.editar"]), controller.excluirImagemCarrossel);
router.post("/informativo/upload", permissoes(["configuracoes.editar"]), middlewareUploadInformativo, controller.uploadImagemInformativa);
router.post("/campanha/upload", permissoes(["configuracoes.editar"]), middlewareUploadInformativo, controller.uploadImagemCampanha);

const publicRouter = express.Router();
publicRouter.get("/", controller.listarConfiguracoes);

module.exports = { router, publicRouter };
