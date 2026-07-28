const express = require("express");
const produtosController = require("../controllers/produtos.controller");
const permissoes = require("../middlewares/permissoes.middleware");
const { middlewareUploadProdutos } = require("../middlewares/upload-produtos.middleware");

const router = express.Router();

const visualizar = permissoes(["produtos.editar", "estoque.ver"]);
const editar = permissoes(["produtos.editar"]);
router.post("/gerar-codigos", editar, produtosController.gerarCodigosVariacoes);
router.get("/codigo/:codigo", visualizar, produtosController.buscarProdutoPorCodigo);
router.get("/", visualizar, produtosController.listarProdutos);
router.post("/", editar, produtosController.criarProduto);
router.get("/:id", visualizar, produtosController.obterProduto);
router.put("/:id", editar, produtosController.atualizarProduto);
router.post("/:id/variacoes", editar, produtosController.criarVariacao);
router.put("/:id/variacoes/:variacao_id", editar, produtosController.atualizarVariacao);
router.delete("/:id/variacoes/:variacao_id", editar, produtosController.excluirVariacao);
router.post("/:id/midias/upload", editar, middlewareUploadProdutos, produtosController.uploadMidias);
router.post("/:id/midias", editar, produtosController.criarMidia);
router.put("/:id/midias/:midia_id", editar, produtosController.atualizarMidia);
router.delete("/:id/midias/:midia_id", editar, produtosController.excluirMidia);
router.get("/:id/medidas", editar, produtosController.listarMedidas);
router.post("/:id/medidas", editar, produtosController.criarMedida);
router.put("/:id/medidas/:medida_id", editar, produtosController.atualizarMedida);
router.delete("/:id/medidas/:medida_id", editar, produtosController.excluirMedida);

module.exports = router;
