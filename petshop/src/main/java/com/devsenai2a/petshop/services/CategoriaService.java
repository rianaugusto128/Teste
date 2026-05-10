package com.devsenai2a.petshop.services;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.devsenai2a.petshop.entities.Categoria;
import com.devsenai2a.petshop.repositories.CategoriaRepository;

@Service
public class CategoriaService {
    
    @Autowired
    private CategoriaRepository repository;
    
    public List<Categoria> listar() {
        return repository.findAll();
    }

    public List<Categoria> buscarPorNome(String nome) {
        if (nome == null || nome.trim().isEmpty()) {
            return listar();
        }
        return repository.findByNomeContainingIgnoreCase(nome.trim());
    }
    
    public Categoria buscarPorId(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Categoria não encontrada com id: " + id));
    }
    
    public Categoria criar(Categoria categoria) {
        if (categoria.getAtivo() == null) {
            categoria.setAtivo(true);
        }
        if (categoria.getIcon() == null || categoria.getIcon().trim().isEmpty()) {
            categoria.setIcon("fa-paw");
        }
        return repository.save(categoria);
    }
    
    public Categoria atualizar(Long id, Categoria categoria) {
        Categoria existing = buscarPorId(id);
        existing.setNome(categoria.getNome());
        existing.setDescricao(categoria.getDescricao());
        existing.setAtivo(categoria.getAtivo() != null ? categoria.getAtivo() : true);
        existing.setIcon((categoria.getIcon() == null || categoria.getIcon().trim().isEmpty()) ? "fa-paw" : categoria.getIcon());
        return repository.save(existing);
    }
    
    public void deletar(Long id) {
        Categoria categoria = buscarPorId(id);
        repository.delete(categoria);
        System.out.println("Categoria " + id + " deletada com sucesso!");
    }
}
