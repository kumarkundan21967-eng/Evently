package com.evently.evently.controller;

import com.evently.evently.model.Notification;
import com.evently.evently.repository.NotificationRepository;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import com.evently.evently.service.AuthSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")

public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(
            NotificationRepository notificationRepository
    ) {
        this.notificationRepository = notificationRepository;
    }


    // =====================================================
    // GET ALL NOTIFICATIONS
    // =====================================================

    @GetMapping
    public List<Notification> getAllNotifications() {

        return notificationRepository.findAll();
    }


    // =====================================================
    // GET MY NOTIFICATIONS
    // =====================================================

    @GetMapping("/my")
    public List<Notification> getMyNotifications(
            @RequestParam String email,
            HttpServletRequest request
    ) {

        AuthSessionService.Session session = (AuthSessionService.Session) request.getAttribute("evently.session");
        if (session == null || !session.email().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only view your own notifications");
        }

        return notificationRepository
                .findByAttendeeEmailOrderByCreatedAtDesc(email);
    }


    // =====================================================
    // CREATE NOTIFICATION
    // =====================================================

    @PostMapping
    public Notification createNotification(
            @RequestBody Notification notification
    ) {

        if (notification.getType() == null ||
                notification.getType().isBlank()) {

            notification.setType("GENERAL");
        }

        if (notification.getRead() == null) {

            notification.setRead(false);
        }

        if (notification.getCreatedAt() == null ||
                notification.getCreatedAt().isBlank()) {

            notification.setCreatedAt(
                    java.time.LocalDateTime
                            .now()
                            .toString()
            );
        }

        return notificationRepository.save(notification);
    }


    // =====================================================
    // MARK NOTIFICATION AS READ
    // =====================================================

    @PutMapping("/{id}/read")
    public Notification markAsRead(
            @PathVariable Long id,
            HttpServletRequest request
    ) {

        Notification notification =
                notificationRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Notification not found with id: "
                                                + id
                                )
                        );

        AuthSessionService.Session session = (AuthSessionService.Session) request.getAttribute("evently.session");
        if (session == null || !session.email().equalsIgnoreCase(notification.getAttendeeEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update your own notifications");
        }

        notification.setRead(true);

        return notificationRepository.save(notification);
    }
}
