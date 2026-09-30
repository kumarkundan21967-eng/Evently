package com.evently.evently.service;

import com.evently.evently.model.Notification;
import com.evently.evently.repository.NotificationRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(
            NotificationRepository notificationRepository
    ) {
        this.notificationRepository = notificationRepository;
    }


    // =====================================================
    // CREATE NOTIFICATION
    // =====================================================

    public Notification createNotification(
            String attendeeEmail,
            String title,
            String message,
            String type
    ) {

        Notification notification = new Notification();

        notification.setAttendeeEmail(attendeeEmail);
        notification.setTitle(title);
        notification.setMessage(message);

        if (type == null || type.isBlank()) {
            notification.setType("GENERAL");
        } else {
            notification.setType(type);
        }

        notification.setCreatedAt(
                LocalDateTime.now().toString()
        );

        notification.setRead(false);

        return notificationRepository.save(notification);
    }
}