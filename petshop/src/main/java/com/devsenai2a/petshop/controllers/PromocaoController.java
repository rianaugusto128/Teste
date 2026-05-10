package com.devsenai2a.petshop.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.devsenai2a.petshop.entities.Promocao;
import com.devsenai2a.petshop.services.PromocaoService;

@RestController
@RequestMapping("/api/promocoes")
@CrossOrigin(origins = "*")
public class PromocaoController {

    @Autowired
    private PromocaoService service;

    @GetMapping
    public List<Promocao> listar() {
        return service.listarTodas();
    }

    @GetMapping("/ativas")
    public List<Promocao> listarAtivas() {
        return service.listarAtivasAgora();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Promocao> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Promocao promocao) {
        try {
            return ResponseEntity.ok(service.criar(promocao));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody Promocao promocao) {
        try {
            return ResponseEntity.ok(service.atualizar(id, promocao));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.ok().build();
    }
}
