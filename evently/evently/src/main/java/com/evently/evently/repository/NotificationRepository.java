package com.evently.evently.repository;

import com.evently.evently.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByAttendeeEmailOrderByCreatedAtDesc(
            String attendeeEmail
    );

    @Modifying
    @Query("update Notification n set n.attendeeEmail = :newEmail where lower(n.attendeeEmail) = lower(:oldEmail)")
    int updateAttendeeEmail(@Param("oldEmail") String oldEmail, @Param("newEmail") String newEmail);
}
