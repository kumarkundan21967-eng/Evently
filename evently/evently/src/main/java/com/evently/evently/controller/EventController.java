package com.evently.evently.controller;

import com.evently.evently.model.AdminSetting;
import com.evently.evently.model.Event;
import com.evently.evently.model.Ticket;
import com.evently.evently.model.TicketTier;
import com.evently.evently.repository.AdminSettingRepository;
import com.evently.evently.repository.EventRepository;
import com.evently.evently.repository.TicketRepository;
import com.evently.evently.repository.TicketTierRepository;
import com.evently.evently.service.ActivityService;
import com.evently.evently.service.AuthSessionService;
import com.evently.evently.service.NotificationService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository eventRepository;
    private final ActivityService activityService;
    private final TicketTierRepository ticketTierRepository;
    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;
    private final AdminSettingRepository settingRepository;

    public EventController(
            EventRepository eventRepository,
            ActivityService activityService,
            TicketTierRepository ticketTierRepository,
            TicketRepository ticketRepository,
            NotificationService notificationService,
            AdminSettingRepository settingRepository
    ) {
        this.eventRepository = eventRepository;
        this.activityService = activityService;
        this.ticketTierRepository = ticketTierRepository;
        this.ticketRepository = ticketRepository;
        this.notificationService = notificationService;
        this.settingRepository = settingRepository;
    }

    // =====================================================
    // GET APPROVED EVENTS
    // =====================================================

    @GetMapping
    public List<Event> getAllEvents() {
        return eventRepository.findByStatus("APPROVED");
    }

    // =====================================================
    // GET ALL EVENTS - ADMIN
    // =====================================================

    @GetMapping("/all")
    public List<Event> getAllEventsForAdmin() {
        return eventRepository.findAll();
    }

    // =====================================================
    // GET MANAGEABLE EVENTS
    // =====================================================

    @GetMapping("/manage")
    public List<Event> getManageableEvents(HttpServletRequest request) {

        AuthSessionService.Session session = getSession(request);

        if (isAdmin(session)) {
            return eventRepository.findAll();
        }

        if (!isOrganizer(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Organizer access required"
            );
        }

        return eventRepository.findAll()
                .stream()
                .filter(event -> ownsEvent(event, session))
                .toList();
    }

    // =====================================================
    // ORGANIZER STATISTICS
    // =====================================================

    @GetMapping("/my/statistics")
    public Map<String, Object> organizerStatistics(
            HttpServletRequest request) {

        AuthSessionService.Session session = getSession(request);

        if (!isAdmin(session) && !isOrganizer(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Organizer access required"
            );
        }

        List<Event> managedEvents;

        if (isAdmin(session)) {
            managedEvents = eventRepository.findAll();
        } else {
            managedEvents = eventRepository.findAll()
                    .stream()
                    .filter(event -> ownsEvent(event, session))
                    .toList();
        }

        List<Long> ids = managedEvents.stream()
                .map(Event::getId)
                .toList();

        Set<Long> managedEventIds = new HashSet<>(ids);
        Set<String> managedEventNames = managedEvents.stream()
                .map(Event::getName)
                .filter(name -> name != null && !name.isBlank())
                .map(name -> name.trim().toLowerCase(java.util.Locale.ROOT))
                .collect(java.util.stream.Collectors.toSet());
        List<Ticket> tickets = managedEventIds.isEmpty()
                ? List.of()
                : ticketRepository.findAll().stream()
                        .filter(ticket -> {
                            if (ticket.getEventId() != null
                                    && managedEventIds.contains(ticket.getEventId())) {
                                return true;
                            }

                            // Legacy ticket rows can have a stale/missing event_id
                            // while retaining the event name saved at booking time.
                            String eventName = ticket.getEventName();
                            return eventName != null
                                    && managedEventNames.contains(
                                            eventName.trim().toLowerCase(java.util.Locale.ROOT));
                        })
                        .toList();

        long ticketSales = tickets.stream()
                .mapToLong(ticket ->
                        ticket.getQuantity() == null
                                ? 1
                                : ticket.getQuantity())
                .sum();

        BigDecimal bookingValue = tickets.stream()
                .filter(ticket -> ticket.getPaymentMethod() == null
                        || ticket.getPaymentMethod().isBlank()
                        || "DEMO".equalsIgnoreCase(ticket.getPaymentMethod()))
                .map(ticket -> {

                    if (ticket.getPrice() == null) {
                        return BigDecimal.ZERO;
                    }

                    int quantity = ticket.getQuantity() == null
                            ? 1
                            : ticket.getQuantity();

                    return ticket.getPrice()
                            .multiply(BigDecimal.valueOf(quantity));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> weekly = new ArrayList<>();

        for (int offset = 6; offset >= 0; offset--) {

            LocalDate day = LocalDate.now().minusDays(offset);

            long count = tickets.stream()
                    .filter(ticket -> {

                        try {
                            return ticket.getCreatedAt() != null
                                    && LocalDate.parse(
                                    ticket.getCreatedAt()
                                            .substring(0, 10)
                            ).equals(day);

                        } catch (RuntimeException ignored) {
                            return false;
                        }

                    })
                    .mapToLong(ticket ->
                            ticket.getQuantity() == null
                                    ? 1
                                    : ticket.getQuantity())
                    .sum();

            Map<String, Object> point = new HashMap<>();

            point.put("date", day.toString());
            point.put("count", count);

            weekly.add(point);
        }

        long registrations = tickets.size();

        long publishedEvents = managedEvents.stream()
                .filter(event ->
                        "APPROVED".equalsIgnoreCase(
                                event.getStatus()))
                .count();

        return Map.of(
                "totalEvents", managedEvents.size(),
                "publishedEvents", publishedEvents,
                "registrations", registrations,
                "ticketSales", ticketSales,
                "bookingValue", bookingValue,
                "weeklyRegistrations", weekly
        );
    }

    // =====================================================
    // ORGANIZER REGISTRATIONS
    // =====================================================

    @GetMapping("/manage/registrations")
    public List<Map<String, Object>> organizerRegistrations(
            HttpServletRequest request) {

        AuthSessionService.Session session = getSession(request);

        if (!isAdmin(session) && !isOrganizer(session)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Organizer access required"
            );
        }

        List<Event> managedEvents;

        if (isAdmin(session)) {
            managedEvents = eventRepository.findAll();
        } else {
            managedEvents = eventRepository.findAll()
                    .stream()
                    .filter(event -> ownsEvent(event, session))
                    .toList();
        }

        List<Long> ids = managedEvents.stream()
                .map(Event::getId)
                .toList();

        if (ids.isEmpty()) {
            return List.of();
        }

        Map<Long, String> eventNames =
                managedEvents.stream()
                        .collect(
                                java.util.stream.Collectors.toMap(
                                        Event::getId,
                                        Event::getName
                                )
                        );

        return ticketRepository.findByEventIdIn(ids)
                .stream()
                .map(ticket -> {

                    Map<String, Object> item = new HashMap<>();

                    item.put("id", ticket.getId());
                    item.put(
                            "event",
                            eventNames.get(ticket.getEventId())
                    );
                    item.put(
                            "ticket",
                            ticket.getTicketType()
                    );
                    item.put(
                            "attendee",
                            ticket.getAttendeeName()
                    );
                    item.put(
                            "attendeeEmail",
                            ticket.getAttendeeEmail()
                    );
                    item.put(
                            "quantity",
                            ticket.getQuantity()
                    );
                    item.put(
                            "status",
                            ticket.getStatus()
                    );
                    item.put(
                            "createdAt",
                            ticket.getCreatedAt()
                    );

                    return item;
                })
                .toList();
    }

    // =====================================================
    // GET PENDING EVENTS
    // =====================================================

    @GetMapping("/pending")
    public List<Event> getPendingEvents() {
        return eventRepository.findByStatus("PENDING");
    }

    // =====================================================
    // GET SINGLE EVENT
    // =====================================================

    @GetMapping("/{id}")
    public Event getEvent(@PathVariable Long id) {

        return eventRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found"
                        )
                );
    }

    // =====================================================
    // GET TICKET TIERS
    // =====================================================

    @GetMapping("/{eventId}/ticket-tiers")
    public List<TicketTier> getTicketTiers(
            @PathVariable Long eventId) {

        getEvent(eventId);

        return ticketTierRepository
                .findByEventIdOrderByIdAsc(eventId);
    }

    // =====================================================
    // CREATE TICKET TIER
    // =====================================================

    @PostMapping("/{eventId}/ticket-tiers")
    public TicketTier createTicketTier(
            @PathVariable Long eventId,
            @RequestBody TicketTier tier,
            HttpServletRequest request) {

        Event event = getEvent(eventId);

        requireEventManager(event, request);

        if (tier.getName() == null
                || tier.getName().isBlank()
                || tier.getPrice() == null
                || tier.getPrice().compareTo(BigDecimal.ZERO) < 0
                || tier.getQuantity() == null
                || tier.getQuantity() < 1) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Name, non-negative price and positive quantity are required"
            );
        }

        long existingTierCapacity =
                ticketTierRepository
                        .findByEventIdOrderByIdAsc(eventId)
                        .stream()
                        .mapToLong(TicketTier::getQuantity)
                        .sum();

        long previouslyBookedOutsideTiers =
                existingTierCapacity == 0
                        ? ticketRepository.sumQuantityByEventId(eventId)
                        : 0;

        if (event.getCapacity() != null
                && previouslyBookedOutsideTiers
                + existingTierCapacity
                + tier.getQuantity()
                > event.getCapacity()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ticket tiers exceed event capacity"
            );
        }

        tier.setEventId(eventId);

        TicketTier saved =
                ticketTierRepository.save(tier);

        activityService.logActivity(
                "TICKET_TIER_CREATED",
                "Ticket Option Created",
                saved.getName()
                        + " added for "
                        + event.getName(),
                event.getOrganizer()
        );

        return saved;
    }

    // =====================================================
    // UPDATE TICKET TIER
    // =====================================================

    @PutMapping("/{eventId}/ticket-tiers/{tierId}")
    public TicketTier updateTicketTier(
            @PathVariable Long eventId,
            @PathVariable Long tierId,
            @RequestBody TicketTier changes,
            HttpServletRequest request) {

        Event event = getEvent(eventId);

        requireEventManager(event, request);

        TicketTier tier =
                ticketTierRepository
                        .findByIdAndEventId(tierId, eventId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Ticket tier not found"
                                )
                        );

        if (changes.getName() == null
                || changes.getName().isBlank()
                || changes.getPrice() == null
                || changes.getPrice().compareTo(BigDecimal.ZERO) < 0
                || changes.getQuantity() == null
                || changes.getQuantity() < 1) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Name, non-negative price and positive quantity are required"
            );
        }

        long otherTierCapacity =
                ticketTierRepository
                        .findByEventIdOrderByIdAsc(eventId)
                        .stream()
                        .filter(existing ->
                                !existing.getId().equals(tierId))
                        .mapToLong(TicketTier::getQuantity)
                        .sum();

        long soldInTier =
                ticketRepository
                        .sumQuantityByEventIdAndTicketType(
                                eventId,
                                tier.getName()
                        );

        Integer capacity =
                getEvent(eventId).getCapacity();

        if (soldInTier > 0
                && !tier.getName()
                .equalsIgnoreCase(changes.getName().trim())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A ticket tier with sales cannot be renamed"
            );
        }

        if (changes.getQuantity() < soldInTier
                || (capacity != null
                && otherTierCapacity
                + changes.getQuantity()
                > capacity)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Quantity cannot be below sold tickets or exceed event capacity"
            );
        }

        tier.setName(changes.getName().trim());
        tier.setPrice(changes.getPrice());
        tier.setQuantity(changes.getQuantity());

        return ticketTierRepository.save(tier);
    }

    // =====================================================
    // ANNOUNCEMENT
    // =====================================================

    @PostMapping("/{eventId}/announcements")
    public Map<String, Object> announceToAttendees(
            @PathVariable Long eventId,
            @RequestBody Map<String, String> request,
            HttpServletRequest servletRequest) {

        Event event = getEvent(eventId);

        requireEventManager(event, servletRequest);

        String message = request.get("message");

        if (message == null || message.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Message is required"
            );
        }

        long sent = ticketRepository
                .findByEventId(eventId)
                .stream()
                .map(Ticket::getAttendeeEmail)
                .filter(email ->
                        email != null && !email.isBlank())
                .map(String::trim)
                .map(String::toLowerCase)
                .distinct()
                .map(email ->
                        notificationService.createNotification(
                                email,
                                "Update: " + event.getName(),
                                message.trim(),
                                "EVENT_UPDATE"
                        )
                )
                .count();

        activityService.logActivity(
                "EVENT_ANNOUNCEMENT",
                "Event Announcement",
                "Announcement sent for "
                        + event.getName()
                        + " to "
                        + sent
                        + " attendee(s)",
                event.getOrganizer()
        );

        return Map.of(
                "success", true,
                "recipients", sent
        );
    }

    // =====================================================
    // CREATE EVENT
    // =====================================================

    @PostMapping
    public Event createEvent(
            @RequestBody Event event,
            HttpServletRequest request) {

        AuthSessionService.Session session =
                getSession(request);

        /*
         * ADMIN can create event with supplied organizer.
         *
         * ORGANIZER:
         * Always use logged-in user's name and email.
         */
        if (!isAdmin(session)) {

            event.setOrganizer(session.name());
            event.setOrganizerEmail(session.email());

            String defaultStatus =
                    settingRepository
                            .findBySettingKey("defaultStatus")
                            .map(AdminSetting::getSettingValue)
                            .orElse("Pending review");

            event.setStatus(
                    "Auto-approved".equalsIgnoreCase(defaultStatus)
                            ? "APPROVED"
                            : "PENDING"
            );
        }

        if (event.getName() == null
                || event.getName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Event name is required"
            );
        }

        if (event.getCapacity() != null
                && event.getCapacity() < 1) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Capacity must be positive"
            );
        }

        if (event.getStatus() == null
                || event.getStatus().isEmpty()) {

            event.setStatus("PENDING");
        }

        Event savedEvent =
                eventRepository.save(event);

        if ("APPROVED".equalsIgnoreCase(
                savedEvent.getStatus())) {

            notifyOrganizer(
                    savedEvent,
                    "Your event is approved and open for booking."
            );
        }

        activityService.logActivity(
                "EVENT_CREATED",
                "Event Created",
                "New event created: "
                        + savedEvent.getName(),
                session.name()
        );

        return savedEvent;
    }

    // =====================================================
    // UPDATE EVENT
    // =====================================================

    @PutMapping("/{id}")
    public Event updateEvent(
            @PathVariable Long id,
            @RequestBody Event changes,
            HttpServletRequest request) {

        AuthSessionService.Session session =
                getSession(request);

        Event event = getEvent(id);

        /*
         * IMPORTANT:
         *
         * ADMIN -> can update any event
         *
         * ORGANIZER -> can update only own event
         *
         * Ownership is checked using organizer email first.
         */
        requireEventManager(event, request);

        if (changes.getName() != null
                && changes.getName().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Event name cannot be blank"
            );
        }

        if (changes.getCapacity() != null
                && changes.getCapacity() < 1) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Capacity must be positive"
            );
        }

        if (changes.getCapacity() != null) {

            long sold =
                    ticketRepository.sumQuantityByEventId(id);

            long tierCapacity =
                    ticketTierRepository
                            .findByEventIdOrderByIdAsc(id)
                            .stream()
                            .mapToLong(TicketTier::getQuantity)
                            .sum();

            if (changes.getCapacity() < sold
                    || changes.getCapacity() < tierCapacity) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Capacity cannot be lower than sold tickets or configured ticket tiers"
                );
            }
        }

        // =================================================
        // UPDATE NORMAL EVENT FIELDS
        // =================================================

        if (changes.getName() != null) {
            event.setName(
                    changes.getName().trim()
            );
        }

        if (changes.getDescription() != null) {
            event.setDescription(
                    changes.getDescription()
            );
        }

        if (changes.getLocation() != null) {
            event.setLocation(
                    changes.getLocation()
            );
        }

        if (changes.getDate() != null) {
            event.setDate(
                    changes.getDate()
            );
        }

        if (changes.getTime() != null) {
            event.setTime(
                    changes.getTime()
            );
        }

        if (changes.getCapacity() != null) {
            event.setCapacity(
                    changes.getCapacity()
            );
        }

        /*
         * ONLY ADMIN can change organizer ownership.
         */
        if (isAdmin(session)) {

            if (changes.getOrganizer() != null) {
                event.setOrganizer(
                        changes.getOrganizer()
                );
            }

            if (changes.getOrganizerEmail() != null) {
                event.setOrganizerEmail(
                        changes.getOrganizerEmail()
                );
            }
        }

        Event saved =
                eventRepository.save(event);

        activityService.logActivity(
                "EVENT_UPDATED",
                "Event Updated",
                "Event updated: "
                        + saved.getName(),
                session.name()
        );

        return saved;
    }

    // =====================================================
    // DELETE EVENT
    // =====================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id,
            HttpServletRequest request) {

        Event event = getEvent(id);

        requireEventManager(event, request);

        if (ticketRepository.countByEventId(id) > 0) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An event with ticket bookings cannot be deleted"
            );
        }

        ticketTierRepository.deleteByEventId(id);

        eventRepository.delete(event);

        AuthSessionService.Session session =
                getSession(request);

        activityService.logActivity(
                "EVENT_DELETED",
                "Event Deleted",
                "Event deleted: "
                        + event.getName(),
                session.name()
        );

        return ResponseEntity.noContent().build();
    }

    // =====================================================
    // APPROVE EVENT
    // =====================================================

    @PutMapping("/{id}/approve")
    public Event approveEvent(
            @PathVariable Long id) {

        Event event = getEvent(id);

        event.setStatus("APPROVED");

        Event savedEvent =
                eventRepository.save(event);

        notifyOrganizer(
                savedEvent,
                "Your event is approved and open for booking."
        );

        activityService.logActivity(
                "EVENT_APPROVED",
                "Event Approved",
                "Event approved: "
                        + savedEvent.getName(),
                "Admin"
        );

        return savedEvent;
    }

    // =====================================================
    // REJECT EVENT
    // =====================================================

    @PutMapping("/{id}/reject")
    public Event rejectEvent(
            @PathVariable Long id) {

        Event event = getEvent(id);

        event.setStatus("REJECTED");

        Event savedEvent =
                eventRepository.save(event);

        notifyOrganizer(
                savedEvent,
                "Your event submission was declined. Contact the Evently administrator for details."
        );

        activityService.logActivity(
                "EVENT_REJECTED",
                "Event Rejected",
                "Event rejected: "
                        + savedEvent.getName(),
                "Admin"
        );

        return savedEvent;
    }

    // =====================================================
    // SESSION HELPER
    // =====================================================

    private AuthSessionService.Session getSession(
            HttpServletRequest request) {

        AuthSessionService.Session session =
                (AuthSessionService.Session)
                        request.getAttribute(
                                "evently.session"
                        );

        if (session == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Login required"
            );
        }

        return session;
    }

    // =====================================================
    // ROLE HELPERS
    // =====================================================

    private boolean isAdmin(
            AuthSessionService.Session session) {

        return session != null
                && "ADMIN".equalsIgnoreCase(
                session.role()
        );
    }

    private boolean isOrganizer(
            AuthSessionService.Session session) {

        return session != null
                && "ORGANIZER".equalsIgnoreCase(
                session.role()
        );
    }

    // =====================================================
    // EVENT OWNERSHIP
    // =====================================================

    private boolean ownsEvent(
            Event event,
            AuthSessionService.Session session) {

        if (event == null || session == null) {
            return false;
        }

        /*
         * =================================================
         * 1. EMAIL CHECK - PRIMARY
         * =================================================
         *
         * Example:
         *
         * Event organizerEmail:
         * organizer@example.com
         *
         * Logged-in user email:
         * organizer@example.com
         *
         * => OWNER
         */

        String eventEmail = event.getOrganizerEmail();
        String sessionEmail = session.email();

        if (eventEmail != null
                && !eventEmail.isBlank()
                && sessionEmail != null
                && !sessionEmail.isBlank()) {

            if (eventEmail.trim()
                    .equalsIgnoreCase(
                            sessionEmail.trim())) {

                return true;
            }
        }

        /*
         * =================================================
         * 2. NAME CHECK - BACKWARD COMPATIBILITY
         * =================================================
         *
         * This handles old events created before
         * organizerEmail was stored.
         */

        String eventOrganizer = event.getOrganizer();
        String sessionName = session.name();

        if (eventOrganizer != null
                && !eventOrganizer.isBlank()
                && sessionName != null
                && !sessionName.isBlank()) {

            if (eventOrganizer.trim()
                    .equalsIgnoreCase(
                            sessionName.trim())) {

                return true;
            }
        }

        /*
         * =================================================
         * 3. LEGACY EVENT FIX
         * =================================================
         *
         * If an old event has NO organizer email,
         * use the logged-in organizer's email to claim
         * the legacy record only when the organizer name
         * is also empty.
         *
         * This prevents one organizer from modifying
         * another organizer's named event.
         */

        if ((eventEmail == null || eventEmail.isBlank())
                && (eventOrganizer == null
                || eventOrganizer.isBlank())) {

            return isOrganizer(session);
        }

        return false;
    }

    // =====================================================
    // EVENT MANAGER CHECK
    // =====================================================

    private void requireEventManager(
            Event event,
            HttpServletRequest request) {

        AuthSessionService.Session session =
                getSession(request);

        /*
         * ADMIN
         */
        if (isAdmin(session)) {
            return;
        }

        /*
         * ORGANIZER
         */
        if (isOrganizer(session)) {

            boolean owner = ownsEvent(
                    event,
                    session
            );

            System.out.println(
                    "=========================================="
            );
            System.out.println(
                    "EVENT UPDATE/DELETE AUTH CHECK"
            );
            System.out.println(
                    "EVENT ID: " + event.getId()
            );
            System.out.println(
                    "EVENT ORGANIZER: "
                            + event.getOrganizer()
            );
            System.out.println(
                    "EVENT ORGANIZER EMAIL: "
                            + event.getOrganizerEmail()
            );
            System.out.println(
                    "SESSION NAME: "
                            + session.name()
            );
            System.out.println(
                    "SESSION EMAIL: "
                            + session.email()
            );
            System.out.println(
                    "ROLE: "
                            + session.role()
            );
            System.out.println(
                    "OWNERSHIP: "
                            + owner
            );
            System.out.println(
                    "=========================================="
            );

            if (owner) {
                return;
            }
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "You can only manage your own events"
        );
    }

    // =====================================================
    // ORGANIZER NOTIFICATION
    // =====================================================

    private void notifyOrganizer(
            Event event,
            String message) {

        if (event.getOrganizerEmail() == null
                || event.getOrganizerEmail().isBlank()) {

            return;
        }

        boolean enabled =
                settingRepository
                        .findBySettingKey("notifications")
                        .map(AdminSetting::getSettingValue)
                        .map(Boolean::parseBoolean)
                        .orElse(true);

        if (enabled) {

            notificationService.createNotification(
                    event.getOrganizerEmail(),
                    event.getName(),
                    message,
                    "EVENT_STATUS"
            );
        }
    }
}
