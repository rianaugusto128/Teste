package com.devsenai2a.petshop.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devsenai2a.petshop.entities.Promocao;

@Repository
public interface PromocaoRepository extends JpaRepository<Promocao, Long> {

    List<Promocao> findByAtivoTrue();

    @Query("SELECT DISTINCT p FROM Promocao p LEFT JOIN FETCH p.produtos WHERE p.ativo = true AND p.dataFim >= :agora ORDER BY p.dataFim ASC")
    List<Promocao> buscarPromocoesAtivas(@Param("agora") LocalDateTime agora);
}
