package com.evently.evently.controller;

import com.evently.evently.model.Activity;
import com.evently.evently.repository.ActivityRepository;
import com.evently.evently.repository.EventRepository;
import com.evently.evently.repository.UserRepository;
import com.evently.evently.repository.AdminSettingRepository;
import com.evently.evently.model.AdminSetting;
import com.evently.evently.model.Event;
import com.evently.evently.model.User;
import com.evently.evently.model.Ticket;
import com.evently.evently.repository.TicketRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.math.BigDecimal;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")

public class AdminController {

    private final ActivityRepository activityRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final AdminSettingRepository settingRepository;
    private final TicketRepository ticketRepository;

    public AdminController(ActivityRepository activityRepository,
                           EventRepository eventRepository,
                           UserRepository userRepository,
                           AdminSettingRepository settingRepository,
                           TicketRepository ticketRepository) {
        this.activityRepository = activityRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.settingRepository = settingRepository;
        this.ticketRepository = ticketRepository;
    }

    @GetMapping("/statistics")
    public Map<String, Object> statistics() {
        List<Event> events = eventRepository.findAll();
        List<Ticket> tickets = ticketRepository.findAll();
        Set<String> attendees = tickets.stream()
                .map(Ticket::getAttendeeEmail)
                .filter(email -> email != null && !email.isBlank())
                .map(email -> email.trim().toLowerCase(java.util.Locale.ROOT))
                .collect(Collectors.toSet());
        long ticketsSold = tickets.stream().mapToLong(this::ticketQuantity).sum();
        BigDecimal bookingValue = tickets.stream()
                .filter(this::isDemoBooking)
                .map(ticket -> ticket.getPrice() == null ? BigDecimal.ZERO
                        : ticket.getPrice().multiply(BigDecimal.valueOf(ticketQuantity(ticket))))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("totalUsers", userRepository.count());
        result.put("totalEvents", events.size());
        result.put("approvedEvents", events.stream().filter(e -> "APPROVED".equalsIgnoreCase(e.getStatus())).count());
        result.put("pendingEvents", events.stream().filter(e -> "PENDING".equalsIgnoreCase(e.getStatus())).count());
        result.put("totalBookings", tickets.size());
        result.put("ticketsSold", ticketsSold);
        result.put("uniqueAttendees", attendees.size());
        result.put("bookingValue", bookingValue);
        return result;
    }

    @GetMapping(value = "/reports/users", produces = "text/csv")
    public ResponseEntity<String> usersReport() {
        List<Ticket> tickets = ticketRepository.findAll();
        List<Event> events = eventRepository.findAll();
        StringBuilder csv = new StringBuilder("id,name,email,role,status,events_organized,bookings,tickets_booked\n");
        for (User user : userRepository.findAll()) {
            long organizedEvents = events.stream()
                    .filter(event -> user.getEmail() != null && event.getOrganizerEmail() != null
                            && user.getEmail().equalsIgnoreCase(event.getOrganizerEmail()))
                    .count();
            List<Ticket> userTickets = tickets.stream()
                    .filter(ticket -> ticket.getAttendeeEmail() != null && user.getEmail() != null
                            && user.getEmail().equalsIgnoreCase(ticket.getAttendeeEmail()))
                    .toList();
            long ticketsBooked = userTickets.stream().mapToLong(this::ticketQuantity).sum();
            csv.append(user.getId()).append(',').append(csv(user.getName())).append(',')
                    .append(csv(user.getEmail())).append(',').append(csv(user.getRole())).append(',')
                    .append(csv(user.getStatus())).append(',').append(organizedEvents).append(',')
                    .append(userTickets.size()).append(',').append(ticketsBooked).append('\n');
        }
        return csvResponse("evently-users.csv", csv.toString());
    }

    @GetMapping(value = "/reports/events", produces = "text/csv")
    public ResponseEntity<String> eventsReport() {
        List<Ticket> tickets = ticketRepository.findAll();
        StringBuilder csv = new StringBuilder("id,name,organizer,date,time,location,capacity,status,bookings,tickets_sold,booking_value\n");
        for (Event event : eventRepository.findAll()) {
            List<Ticket> eventTickets = tickets.stream().filter(ticket ->
                    (ticket.getEventId() != null && ticket.getEventId().equals(event.getId()))
                            || (ticket.getEventName() != null && event.getName() != null
                            && ticket.getEventName().equalsIgnoreCase(event.getName()))).toList();
            long ticketsSold = eventTickets.stream().mapToLong(this::ticketQuantity).sum();
            BigDecimal bookingValue = eventTickets.stream().filter(this::isDemoBooking)
                    .map(ticket -> ticket.getPrice() == null ? BigDecimal.ZERO
                            : ticket.getPrice().multiply(BigDecimal.valueOf(ticketQuantity(ticket))))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            csv.append(event.getId()).append(',').append(csv(event.getName())).append(',')
                    .append(csv(event.getOrganizer())).append(',').append(csv(event.getDate())).append(',')
                    .append(csv(event.getTime())).append(',').append(csv(event.getLocation())).append(',')
                    .append(event.getCapacity() == null ? "" : event.getCapacity()).append(',')
                    .append(csv(event.getStatus())).append(',').append(eventTickets.size()).append(',')
                    .append(ticketsSold).append(',').append(bookingValue).append('\n');
        }
        return csvResponse("evently-events.csv", csv.toString());
    }

    private String csv(String value) {
        String escaped = value == null ? "" : value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }

    private long ticketQuantity(Ticket ticket) {
        return ticket.getQuantity() == null ? 1 : ticket.getQuantity();
    }

    private boolean isDemoBooking(Ticket ticket) {
        String method = ticket.getPaymentMethod();
        return method == null || method.isBlank() || "DEMO".equalsIgnoreCase(method);
    }

    private ResponseEntity<String> csvResponse(String filename, String body) {
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(body);
    }

    // ========================================================
    // SAVE ADMIN SETTINGS
    // ========================================================

    @GetMapping("/settings")
    public Map<String, Object> getSettings() {
        Map<String, String> values = new java.util.HashMap<>();
        settingRepository.findAll().forEach(item -> values.put(item.getSettingKey(), item.getSettingValue()));
        return Map.of(
                "platformName", values.getOrDefault("platformName", "Evently"),
                "defaultStatus", values.getOrDefault("defaultStatus", "Pending review"),
                "notifications", Boolean.parseBoolean(values.getOrDefault("notifications", "true"))
        );
    }

    @PutMapping("/settings")
    public Map<String, Object> saveSettings(
            @RequestBody Map<String, Object> settings
    ) {

        // Get settings values
        String platformName =
                String.valueOf(settings.getOrDefault(
                        "platformName", "Evently"
                ));

        String defaultStatus =
                String.valueOf(settings.getOrDefault(
                        "defaultStatus", "Pending review"
                ));

        String notifications = String.valueOf(settings.getOrDefault("notifications", false));
        if (platformName.isBlank() || !java.util.Set.of("Pending review", "Auto-approved").contains(defaultStatus)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Platform name or default event status is invalid");
        }
        saveSetting("platformName", platformName);
        saveSetting("defaultStatus", defaultStatus);
        saveSetting("notifications", notifications);

        // ====================================================
        // SAVE ACTIVITY
        // ====================================================

        Activity activity = new Activity(
                "SETTINGS_CHANGED",
                "Settings Changed",
                "Platform: " + platformName
                        + ", Default status: " + defaultStatus
                        + ", Email notifications: " + notifications,
                "Admin",
                java.time.LocalDateTime.now().toString()
        );

        activityRepository.save(activity);

        // ====================================================
        // RESPONSE
        // ====================================================

        Map<String, Object> response = new HashMap<>();

        response.put(
                "message",
                "Settings saved successfully."
        );

        response.put("success", true);

        return response;
    }

    private void saveSetting(String key, String value) {
        AdminSetting setting = settingRepository.findBySettingKey(key).orElseGet(AdminSetting::new);
        setting.setSettingKey(key);
        setting.setSettingValue(value);
        settingRepository.save(setting);
    }
}
