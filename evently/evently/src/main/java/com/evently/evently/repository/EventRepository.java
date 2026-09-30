package com.evently.evently.repository;

import com.evently.evently.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByStatus(String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Event e where e.id = :id")
    Optional<Event> findByIdForUpdate(@Param("id") Long id);
    long countByStatusIgnoreCase(String status);
    @Modifying
    @Query("update Event e set e.organizerEmail = :newEmail where lower(e.organizerEmail) = lower(:oldEmail)")
    int updateOrganizerEmail(@Param("oldEmail") String oldEmail, @Param("newEmail") String newEmail);

}
