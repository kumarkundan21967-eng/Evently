package com.evently.evently.controller;

import com.evently.evently.model.Ticket;
import com.evently.evently.model.Event;
import com.evently.evently.repository.TicketRepository;
import com.evently.evently.repository.EventRepository;
import com.evently.evently.model.TicketTier;
import com.evently.evently.repository.TicketTierRepository;
import com.evently.evently.service.ActivityService;
import com.evently.evently.service.NotificationService;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import com.evently.evently.service.AuthSessionService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private static final Logger logger =
            LoggerFactory.getLogger(TicketController.class);

    private final TicketRepository ticketRepository;
    private final ActivityService activityService;
    private final EventRepository eventRepository;
    private final NotificationService notificationService;
    private final TicketTierRepository ticketTierRepository;


    public TicketController(
            TicketRepository ticketRepository,
            ActivityService activityService,
            EventRepository eventRepository,
            NotificationService notificationService,
            TicketTierRepository ticketTierRepository
    ) {
        this.ticketRepository = ticketRepository;
        this.activityService = activityService;
        this.eventRepository = eventRepository;
        this.notificationService = notificationService;
        this.ticketTierRepository = ticketTierRepository;
    }


    // =====================================================
    // GET ALL TICKETS
    // =====================================================

    @GetMapping
    public List<Ticket> getAllTickets() {

        return ticketRepository.findAll();
    }


    // =====================================================
    // GET MY TICKETS
    // =====================================================

    @GetMapping("/my")
    public List<Ticket> getMyTickets(
            @RequestParam String email,
            HttpServletRequest request
    ) {

        AuthSessionService.Session session =
                (AuthSessionService.Session)
                        request.getAttribute("evently.session");

        if (session == null ||
                !session.email().equalsIgnoreCase(email)) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only view your own tickets"
            );
        }

        List<Ticket> tickets =
                ticketRepository.findByAttendeeEmail(email);

        Set<Long> eventIds = tickets.stream()
                .map(Ticket::getEventId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        Map<Long, Event> eventsById = eventRepository
                .findAllById(eventIds)
                .stream()
                .collect(Collectors.toMap(Event::getId, Function.identity()));

        // Older ticket rows may only contain event_id. Hydrate their event
        // details from the current event record before returning the response.
        tickets.forEach(ticket -> {
            Event event = eventsById.get(ticket.getEventId());
            if (event != null) {
                setEventDetails(ticket, event);
            }
        });

        return tickets;
    }


    // =====================================================
    // GET TICKET BY ID
    // =====================================================

    @GetMapping("/{id}")
    public Ticket getTicket(
            @PathVariable Long id,
            HttpServletRequest request
    ) {

        Ticket ticket =
                ticketRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Ticket not found"
                                )
                        );

        AuthSessionService.Session session =
                (AuthSessionService.Session)
                        request.getAttribute("evently.session");

        if (session == null ||
                (!"ADMIN".equalsIgnoreCase(session.role())
                        && !session.email().equalsIgnoreCase(
                                ticket.getAttendeeEmail()
                        ))) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only view your own ticket"
            );
        }

        return attachEventDetails(ticket);
    }


    // =====================================================
    // CREATE / PURCHASE TICKET
    // =====================================================

    @PostMapping
    @Transactional
    public Ticket createTicket(
            @RequestBody Ticket ticket,
            HttpServletRequest request
    ) {

        // =================================================
        // CHECK LOGIN SESSION
        // =================================================

        AuthSessionService.Session session =
                (AuthSessionService.Session)
                        request.getAttribute("evently.session");

        if (session == null ||
                !session.email().equalsIgnoreCase(
                        ticket.getAttendeeEmail() == null
                                ? ""
                                : ticket.getAttendeeEmail().trim()
                )) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ticket must be booked for the signed-in attendee"
            );
        }


        // =================================================
        // SET ATTENDEE FROM SESSION
        // =================================================

        ticket.setAttendeeEmail(session.email());
        ticket.setAttendeeName(session.name());


        // =================================================
        // CHECK EVENT ID
        // =================================================

        if (ticket.getEventId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A valid event is required for ticket booking"
            );
        }


        // =================================================
        // DEFAULT QUANTITY
        // =================================================

        if (ticket.getQuantity() == null) {

            ticket.setQuantity(1);
        }


        if (ticket.getQuantity() < 1) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Quantity must be positive"
            );
        }


        // =================================================
        // EVENT VALIDATION
        // =================================================

        var event =
                eventRepository
                        .findByIdForUpdate(ticket.getEventId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Event not found"
                                )
                        );


        // =================================================
        // CHECK EVENT APPROVAL
        // =================================================

        if (!"APPROVED".equalsIgnoreCase(
                event.getStatus()
        )) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Event is not open for booking"
            );
        }


        // =================================================
        // ATTACH EVENT DETAILS
        // =================================================

        ticket.setEventName(
                event.getName()
        );

        ticket.setEventLocation(
                event.getLocation()
        );

        ticket.setEventDate(
                event.getDate()
        );

        ticket.setEventTime(
                event.getTime()
        );


       // =================================================
// TICKET TIER VALIDATION
// =================================================

var allTiers =
        ticketTierRepository
                .findByEventIdOrderByIdAsc(
                        event.getId()
                );

if (!allTiers.isEmpty()) {

    String requestedTicketType =
            ticket.getTicketType() == null
                    ? ""
                    : ticket.getTicketType().trim();

    BigDecimal requestedPrice =
            ticket.getPrice();

    // Find ticket by BOTH name and price
    TicketTier tier =
            allTiers.stream()
                    .filter(t ->
                            t.getName() != null
                                    &&
                            t.getName()
                                    .trim()
                                    .equalsIgnoreCase(
                                            requestedTicketType
                                    )
                    )
                    .filter(t -> t.getPrice() != null
                            && requestedPrice != null
                            && t.getPrice().compareTo(requestedPrice) == 0)
                    .findFirst()
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.BAD_REQUEST,
                                    "Selected ticket type and price are not available for this event"
                            )
                    );


    // =================================================
    // CHECK SOLD TICKETS
    // =================================================

    long soldInTier =
            ticketRepository
                    .sumQuantityByEventIdAndTicketType(
                            event.getId(),
                            tier.getName()
                    );


    if (soldInTier + ticket.getQuantity()
            > tier.getQuantity()) {

        throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Not enough tickets available in this tier"
        );
    }


    // =================================================
    // USE ACTUAL TIER DETAILS
    // =================================================

    ticket.setTicketType(
            tier.getName()
    );

    ticket.setPrice(
            tier.getPrice()
    );
}


        // =================================================
        // EVENT CAPACITY CHECK
        // =================================================

        if (event.getCapacity() != null &&
                ticketRepository.sumQuantityByEventId(
                        event.getId()
                ) + ticket.getQuantity()
                        > event.getCapacity()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Not enough tickets available"
            );
        }


        // =================================================
        // DEFAULT STATUS
        // =================================================

        // Client cannot claim payment verification.
        // BOOKED is the demo reservation state.

        ticket.setStatus("BOOKED");


        // =================================================
        // PAYMENT METHOD
        // =================================================

        // Demo payment method.
        // Real payment gateway connect hone tak DEMO use hoga.

        if (ticket.getPaymentMethod() == null ||
                ticket.getPaymentMethod().isBlank()) {

            ticket.setPaymentMethod("DEMO");
        }


        // =================================================
        // DEFAULT CREATED TIME
        // =================================================

        if (ticket.getCreatedAt() == null ||
                ticket.getCreatedAt().isBlank()) {

            ticket.setCreatedAt(
                    LocalDateTime.now().toString()
            );
        }


        // =================================================
        // SAVE TICKET TO DATABASE
        // =================================================

        Ticket savedTicket =
                ticketRepository.save(ticket);


        // =================================================
        // FIND USERNAME
        // =================================================

        String username =
                savedTicket.getAttendeeName();


        if (username == null ||
                username.isBlank()) {

            username =
                    savedTicket.getAttendeeEmail();
        }


        if (username == null ||
                username.isBlank()) {

            username = "Guest";
        }


        // =================================================
        // ACTIVITY LOG
        // =================================================

        try {

            activityService.logActivity(
                    "TICKET_PURCHASED",
                    "Ticket Purchased",
                    "Ticket " +
                            savedTicket.getId() +
                            " purchased for event " +
                            savedTicket.getEventName(),
                    username
            );

        } catch (RuntimeException exception) {

            logger.warn(
                    "Ticket {} saved, but activity logging failed",
                    savedTicket.getId(),
                    exception
            );
        }


        // =================================================
        // CREATE ATTENDEE NOTIFICATION
        // =================================================

        String attendeeEmail =
                savedTicket.getAttendeeEmail();


        if (attendeeEmail != null &&
                !attendeeEmail.isBlank()) {

            try {

                notificationService.createNotification(
                        attendeeEmail,
                        "Ticket Purchased",
                        "Your ticket has been booked successfully. Ticket ID: "
                                + savedTicket.getId(),
                        "TICKET_PURCHASED"
                );

            } catch (RuntimeException exception) {

                logger.warn(
                        "Ticket {} saved, but notification creation failed",
                        savedTicket.getId(),
                        exception
                );
            }
        }


        // =================================================
        // RETURN SAVED TICKET
        // WITH EVENT DETAILS
        // =================================================

        return attachEventDetails(
                savedTicket
        );
    }


    // =====================================================
    // ATTACH EVENT DETAILS
    // =====================================================

    private Ticket attachEventDetails(
            Ticket ticket
    ) {

        if (ticket.getEventId() == null) {

            return ticket;
        }


        eventRepository
                .findById(ticket.getEventId())
                .ifPresent(event -> {
                    setEventDetails(ticket, event);
                });


        return ticket;
    }


    private void setEventDetails(Ticket ticket, Event event) {
        ticket.setEventName(event.getName());
        ticket.setEventLocation(event.getLocation());
        ticket.setEventDate(event.getDate());
        ticket.setEventTime(event.getTime());
    }
}
