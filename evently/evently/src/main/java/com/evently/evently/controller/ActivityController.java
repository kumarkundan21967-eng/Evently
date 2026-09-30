package com.evently.evently.controller;

import com.evently.evently.model.Activity;
import com.evently.evently.model.Event;
import com.evently.evently.repository.ActivityRepository;
import com.evently.evently.repository.EventRepository;
import com.evently.evently.repository.TicketRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/admin/activity")

public class ActivityController {

    private final ActivityRepository activityRepository;
    private final TicketRepository ticketRepository;
    private final EventRepository eventRepository;

    private static final Pattern TICKET_ACTIVITY =
            Pattern.compile("^Ticket (\\d+) purchased for event .*$", Pattern.CASE_INSENSITIVE);

    public ActivityController(
            ActivityRepository activityRepository,
            TicketRepository ticketRepository,
            EventRepository eventRepository
    ) {
        this.activityRepository = activityRepository;
        this.ticketRepository = ticketRepository;
        this.eventRepository = eventRepository;
    }

    // GET ALL ACTIVITIES
    @GetMapping
    public List<Activity> getAllActivities() {
        List<Activity> activities = activityRepository.findAll();
        activities.stream()
                .filter(activity -> "TICKET_PURCHASED".equalsIgnoreCase(activity.getActivityType()))
                .forEach(this::restoreTicketEventName);
        return activities;
    }

    private void restoreTicketEventName(Activity activity) {
        String description = activity.getDescription();
        if (description == null) {
            return;
        }

        Matcher matcher = TICKET_ACTIVITY.matcher(description);
        if (!matcher.matches()) {
            return;
        }

        ticketRepository.findById(Long.valueOf(matcher.group(1)))
                .ifPresent(ticket -> {
                    String eventName = ticket.getEventName();
                    if ((eventName == null || eventName.isBlank()) && ticket.getEventId() != null) {
                        eventName = eventRepository.findById(ticket.getEventId())
                                .map(Event::getName)
                                .orElse(null);
                    }
                    if (eventName != null && !eventName.isBlank()) {
                        activity.setDescription("Ticket " + ticket.getId()
                                + " purchased for event " + eventName);
                    }
                });
    }

    // ADD ACTIVITY
    @PostMapping
    public Activity createActivity(@RequestBody Activity activity) {
        return activityRepository.save(activity);
    }

    // DELETE ACTIVITY
    @DeleteMapping("/{id}")
    public String deleteActivity(@PathVariable Long id) {

        if (!activityRepository.existsById(id)) {
            return "Activity not found";
        }

        activityRepository.deleteById(id);

        return "Activity deleted successfully";
    }
}
