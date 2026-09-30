package com.evently.evently.repository;

import com.evently.evently.model.TicketTier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TicketTierRepository extends JpaRepository<TicketTier, Long> {
    List<TicketTier> findByEventIdOrderByIdAsc(Long eventId);
    Optional<TicketTier> findByIdAndEventId(Long id, Long eventId);
    List<TicketTier> findByEventIdAndNameIgnoreCase(Long eventId, String name);
    void deleteByEventId(Long eventId);
}
