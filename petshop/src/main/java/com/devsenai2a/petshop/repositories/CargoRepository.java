package com.devsenai2a.petshop.repositories;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.devsenai2a.petshop.entities.Cargo;

@Repository
public interface CargoRepository extends JpaRepository<Cargo, Long> {
    Optional<Cargo> findByNomeIgnoreCase(String nome);
    boolean existsByNomeIgnoreCase(String nome);
}
