package com.evently.evently.service;

import com.evently.evently.model.Ticket;
import com.evently.evently.repository.TicketRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;

    public TicketService(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    // Save purchased ticket
    public Ticket purchaseTicket(Ticket ticket) {
        return ticketRepository.save(ticket);
    }

    // Get all tickets
    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    // Get tickets by attendee email
    public List<Ticket> getTicketsByEmail(String email) {
        return ticketRepository.findByAttendeeEmail(email);
    }

    // Get ticket by ID
    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id).orElse(null);
    }

    // Delete ticket
    public void deleteTicket(Long id) {
        ticketRepository.deleteById(id);
    }
}