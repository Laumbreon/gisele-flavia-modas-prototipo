const express = require("express");
const fretesBairroController = require("../controllers/fretes-bairro.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();
const publicRouter = express.Router();

router.get("/", permissaoMiddleware("configuracoes.editar"), fretesBairroController.listarFretesBairro);
router.post("/", permissaoMiddleware("configuracoes.editar"), fretesBairroController.criarFreteBairro);
router.put("/:id", permissaoMiddleware("configuracoes.editar"), fretesBairroController.atualizarFreteBairro);
router.delete("/:id", permissaoMiddleware("configuracoes.editar"), fretesBairroController.desativarFreteBairro);

publicRouter.get("/", fretesBairroController.calcularFreteBairro);

module.exports = {
  router,
  publicRouter,
};
