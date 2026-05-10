package com.devsenai2a.petshop.repositories;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.devsenai2a.petshop.entities.Produto;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    
    // Buscar produtos ativos
    List<Produto> findByAtivoTrue();
    
    // Buscar produtos por categoria
    List<Produto> findByCategoriaId(Long categoriaId);
    
    // Buscar produtos por nome (contém)
    List<Produto> findByNomeContainingIgnoreCase(String nome);
    
    // Buscar produtos com estoque > 0
    List<Produto> findByQtdEstoqueGreaterThan(Integer qtd);
}