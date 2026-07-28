const express = require("express");
const controller = require("../controllers/pedidos-site.controller");
const permissoesMiddleware = require("../middlewares/permissoes.middleware");

const router = express.Router();
const podeVisualizar = permissoesMiddleware(["relatorios.ver", "vendas.criar"]);
const podeOperar = permissoesMiddleware(["vendas.criar", "configuracoes.editar"]);

router.get("/", podeVisualizar, controller.listarPedidosSite);
router.get("/:id", podeVisualizar, controller.detalharPedidoSite);
router.post("/:id/confirmar-pagamento", podeOperar, controller.confirmarPagamento);
router.post("/:id/cancelar", podeOperar, controller.cancelarPedido);
router.post("/:id/status-entrega", podeOperar, controller.atualizarStatusEntrega);

module.exports = router;
