package com.evently.evently.repository;

import com.evently.evently.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByAttendeeEmail(String attendeeEmail);
    List<Ticket> findByEventId(Long eventId);
    List<Ticket> findByEventIdIn(List<Long> eventIds);
    long countByEventId(Long eventId);
    @Query("select coalesce(sum(t.quantity), 0) from Ticket t where t.eventId = :eventId")
    long sumQuantityByEventId(@Param("eventId") Long eventId);
    @Modifying
    @Query("update Ticket t set t.attendeeEmail = :newEmail where lower(t.attendeeEmail) = lower(:oldEmail)")
    int updateAttendeeEmail(@Param("oldEmail") String oldEmail, @Param("newEmail") String newEmail);
    @Query("select coalesce(sum(t.quantity), 0) from Ticket t where t.eventId = :eventId and lower(t.ticketType) = lower(:ticketType)")
    long sumQuantityByEventIdAndTicketType(@Param("eventId") Long eventId, @Param("ticketType") String ticketType);

    Optional<Ticket> findFirstByAttendeeEmailIgnoreCaseAndEventNameIgnoreCaseOrderByIdAsc(
            String attendeeEmail,
            String eventName
    );

}
