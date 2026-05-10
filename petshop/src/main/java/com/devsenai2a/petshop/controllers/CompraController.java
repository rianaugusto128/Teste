package com.devsenai2a.petshop.controllers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.devsenai2a.petshop.entities.Produto;
import com.devsenai2a.petshop.repositories.ProdutoRepository;
import com.devsenai2a.petshop.services.DiscordVendaService;
import com.devsenai2a.petshop.services.VendaStoreService;

@RestController
@RequestMapping("/api/compras")
@CrossOrigin(origins = "*")
public class CompraController {

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private DiscordVendaService discordVendaService;

    @Autowired
    private VendaStoreService vendaStoreService;

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(vendaStoreService.listar());
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        return ResponseEntity.ok(vendaStoreService.stats());
    }

    @PatchMapping("/{pedidoId}/status")
    public ResponseEntity<?> atualizarStatus(@PathVariable String pedidoId, @RequestBody StatusEntregaRequest request) {
        try {
            if (request == null || isBlank(request.statusEntrega)) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Informe o status de entrega."));
            }
            return ResponseEntity.ok(vendaStoreService.atualizarStatus(pedidoId, request.statusEntrega, request.observacoesInternas, request.codigoRastreio));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(new ErrorResponse(ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().body(new ErrorResponse("Erro ao atualizar pedido."));
        }
    }

    @PostMapping("/finalizar")
    public ResponseEntity<?> finalizar(@RequestBody CompraRequest request) {
        try {
            if (request == null || request.produtos == null || request.produtos.isEmpty()) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Carrinho vazio."));
            }
            if (isBlank(request.cliente) || isBlank(request.email) || isBlank(request.telefone) || isBlank(request.endereco)) {
                return ResponseEntity.badRequest().body(new ErrorResponse("Informe cliente, email, telefone e endereco."));
            }

            List<Map<String, Object>> produtosPayload = new ArrayList<>();
            BigDecimal total = BigDecimal.ZERO;

            for (ItemCompra item : request.produtos) {
                if (item.id == null || item.quantidade == null || item.quantidade <= 0) {
                    return ResponseEntity.badRequest().body(new ErrorResponse("Produto invalido no carrinho."));
                }
                Produto produto = produtoRepository.findById(item.id)
                        .orElseThrow(() -> new IllegalArgumentException("Produto nao encontrado: " + item.id));

                int estoqueAtual = produto.getQtdEstoque() != null ? produto.getQtdEstoque() : 0;
                if (estoqueAtual < item.quantidade) {
                    return ResponseEntity.badRequest().body(new ErrorResponse("Estoque insuficiente para: " + produto.getNome()));
                }
            }

            for (ItemCompra item : request.produtos) {
                Produto produto = produtoRepository.findById(item.id).orElseThrow();
                int estoqueAtual = produto.getQtdEstoque() != null ? produto.getQtdEstoque() : 0;
                produto.setQtdEstoque(estoqueAtual - item.quantidade);
                produtoRepository.save(produto);

                BigDecimal preco = item.precoFinal != null ? item.precoFinal : produto.getPrecoDesconto();
                if (preco == null) preco = produto.getPreco();
                BigDecimal subtotal = preco.multiply(BigDecimal.valueOf(item.quantidade));
                total = total.add(subtotal);

                Map<String, Object> p = new HashMap<>();
                p.put("id", produto.getId());
                p.put("nome", produto.getNome());
                p.put("quantidade", item.quantidade);
                p.put("precoFinal", preco);
                p.put("subtotal", subtotal);
                p.put("estoqueRestante", produto.getQtdEstoque());
                produtosPayload.add(p);
            }

            String pedidoId = "WEB-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now());

            Map<String, Object> payload = new HashMap<>();
            payload.put("pedidoId", pedidoId);
            payload.put("cliente", request.cliente);
            payload.put("email", request.email);
            payload.put("telefone", request.telefone);
            payload.put("endereco", request.endereco);
            payload.put("pagamento", request.pagamento);
            payload.put("observacoes", request.observacoes);
            payload.put("produtos", produtosPayload);
            payload.put("total", total);
            payload.put("statusEntrega", "RECEBIDO");
            payload.put("criadoEm", LocalDateTime.now().toString());

            Map<String, Object> venda = vendaStoreService.salvar(payload);
            discordVendaService.enviarVenda(payload);

            Map<String, Object> resposta = new HashMap<>();
            resposta.put("success", true);
            resposta.put("pedidoId", pedidoId);
            resposta.put("total", total);
            resposta.put("produtos", produtosPayload);
            resposta.put("venda", venda);
            return ResponseEntity.ok(resposta);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.internalServerError().body(new ErrorResponse("Erro ao finalizar compra."));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    public static class CompraRequest {
        public String cliente;
        public String email;
        public String telefone;
        public String endereco;
        public String pagamento;
        public String observacoes;
        public List<ItemCompra> produtos;
    }

    public static class ItemCompra {
        public Long id;
        public String nome;
        public Integer quantidade;
        public BigDecimal precoFinal;
    }

    public static class StatusEntregaRequest {
        public String statusEntrega;
        public String observacoesInternas;
        public String codigoRastreio;
    }

    public static class ErrorResponse {
        private String mensagem;
        public ErrorResponse(String mensagem) { this.mensagem = mensagem; }
        public String getMensagem() { return mensagem; }
        public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    }
}
