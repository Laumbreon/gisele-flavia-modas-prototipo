const express = require("express");
const produtosController = require("../controllers/produtos.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();

router.post("/gerar-codigos", permissaoMiddleware("produtos.editar"), produtosController.gerarCodigosVariacoes);
router.get("/codigo/:codigo", permissaoMiddleware("produtos.editar"), produtosController.buscarProdutoPorCodigo);
router.get("/", permissaoMiddleware("produtos.editar"), produtosController.listarProdutos);
router.get("/:id", permissaoMiddleware("produtos.editar"), produtosController.obterProduto);

module.exports = router;
