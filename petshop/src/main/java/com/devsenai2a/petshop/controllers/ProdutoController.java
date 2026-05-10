package com.devsenai2a.petshop.controllers;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.devsenai2a.petshop.entities.Produto;
import com.devsenai2a.petshop.services.ProdutoService;

@RestController
@RequestMapping("/api/produtos")
@CrossOrigin(origins = "*")
public class ProdutoController {

    @Autowired
    private ProdutoService service;

    @GetMapping
    public List<Produto> listar() {
        System.out.println("=== GET /api/produtos foi chamado ===");
        return service.listarTodos();
    }

    @GetMapping("/buscar")
    public List<Produto> buscarPorNome(@RequestParam(required = false) String nome) {
        System.out.println("=== GET /api/produtos/buscar?nome=" + nome + " foi chamado ===");
        return service.buscarPorNome(nome);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Produto> buscar(@PathVariable Long id) {
        System.out.println("=== GET /api/produtos/" + id + " foi chamado ===");
        Produto produto = service.buscarPorId(id);
        return ResponseEntity.ok(produto);
    }

    @PostMapping
    public ResponseEntity<Produto> criar(@RequestBody Produto produto) {
        System.out.println("=== POST /api/produtos foi chamado ===");
        Produto novo = service.criar(produto);
        return ResponseEntity.ok(novo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Produto> atualizar(@PathVariable Long id, @RequestBody Produto produto) {
        System.out.println("=== PUT /api/produtos/" + id + " foi chamado ===");
        Produto atualizado = service.atualizar(id, produto);
        return ResponseEntity.ok(atualizado);
    }


    @PatchMapping("/{id}/estoque")
    public ResponseEntity<Produto> atualizarEstoque(@PathVariable Long id, @RequestBody EstoqueRequest request) {
        Produto atualizado = service.atualizarEstoque(id, request.getQtdEstoque());
        return ResponseEntity.ok(atualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        System.out.println("=== DELETE /api/produtos/" + id + " foi chamado ===");
        service.deletar(id);
        return ResponseEntity.ok().build();
    }

    public static class EstoqueRequest {
        private Integer qtdEstoque;

        public Integer getQtdEstoque() {
            return qtdEstoque;
        }

        public void setQtdEstoque(Integer qtdEstoque) {
            this.qtdEstoque = qtdEstoque;
        }
    }
}
