package com.devsenai2a.petshop.controllers;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.devsenai2a.petshop.entities.Categoria;
import com.devsenai2a.petshop.services.CategoriaService;

@RestController
@RequestMapping("/api/categorias")
@CrossOrigin(origins = "*")
public class CategoriaController {

    @Autowired
    private CategoriaService service;

    @GetMapping
    public List<Categoria> listar() {
        System.out.println("=== GET /api/categorias foi chamado ===");
        return service.listar();
    }

    @GetMapping("/buscar")
    public List<Categoria> buscarPorNome(@RequestParam(required = false) String nome) {
        System.out.println("=== GET /api/categorias/buscar?nome=" + nome + " foi chamado ===");
        return service.buscarPorNome(nome);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Categoria> buscar(@PathVariable Long id) {
        System.out.println("=== GET /api/categorias/" + id + " foi chamado ===");
        Categoria categoria = service.buscarPorId(id);
        return ResponseEntity.ok(categoria);
    }

    @PostMapping
    public ResponseEntity<Categoria> criar(@RequestBody Categoria categoria) {
        System.out.println("=== POST /api/categorias foi chamado ===");
        Categoria nova = service.criar(categoria);
        return ResponseEntity.ok(nova);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Categoria> atualizar(@PathVariable Long id, @RequestBody Categoria categoria) {
        System.out.println("=== PUT /api/categorias/" + id + " foi chamado ===");
        Categoria atualizada = service.atualizar(id, categoria);
        return ResponseEntity.ok(atualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        System.out.println("=== DELETE /api/categorias/" + id + " foi chamado ===");
        service.deletar(id);
        return ResponseEntity.ok().build();
    }
}
