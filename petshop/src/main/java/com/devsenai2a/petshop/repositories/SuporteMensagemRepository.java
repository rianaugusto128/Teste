
package com.devsenai2a.petshop.repositories;

import com.devsenai2a.petshop.entities.SuporteMensagem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SuporteMensagemRepository extends JpaRepository<SuporteMensagem, Long> {
    List<SuporteMensagem> findByTicketIdOrderByCriadoEmAsc(Long ticketId);
}
