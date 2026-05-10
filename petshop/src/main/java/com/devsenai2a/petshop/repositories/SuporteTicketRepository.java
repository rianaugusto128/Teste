
package com.devsenai2a.petshop.repositories;

import com.devsenai2a.petshop.entities.SuporteTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SuporteTicketRepository extends JpaRepository<SuporteTicket, Long> {
    List<SuporteTicket> findAllByOrderByCriadoEmDesc();
    List<SuporteTicket> findByStatusOrderByCriadoEmDesc(String status);
    long countByStatus(String status);
}
