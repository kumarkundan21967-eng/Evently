package com.evently.evently.controller;

import com.evently.evently.model.User;
import com.evently.evently.repository.UserRepository;
import com.evently.evently.service.ActivityService;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.transaction.annotation.Transactional;
import com.evently.evently.repository.TicketRepository;
import com.evently.evently.repository.NotificationRepository;
import com.evently.evently.repository.EventRepository;
import com.evently.evently.service.AuthSessionService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@RestController
@RequestMapping("/api/users")

public class UserController {

    private final UserRepository userRepository;
    private final ActivityService activityService;
    private final TicketRepository ticketRepository;
    private final NotificationRepository notificationRepository;
    private final EventRepository eventRepository;
    private final AuthSessionService sessions;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public UserController(
            UserRepository userRepository,
            ActivityService activityService,
            TicketRepository ticketRepository,
            NotificationRepository notificationRepository,
            EventRepository eventRepository,
            AuthSessionService sessions
    ) {
        this.userRepository = userRepository;
        this.activityService = activityService;
        this.ticketRepository = ticketRepository;
        this.notificationRepository = notificationRepository;
        this.eventRepository = eventRepository;
        this.sessions = sessions;
    }

    // =====================================================
    // GET ALL USERS
    // =====================================================

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/me")
    public User getMyProfile(HttpServletRequest request) {
        AuthSessionService.Session session = currentSession(request);
        return userRepository.findById(session.userId()).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
    }

    @PutMapping("/me")
    @Transactional
    public User updateMyProfile(@RequestBody Map<String, String> changes, HttpServletRequest request) {
        AuthSessionService.Session session = currentSession(request);
        User user = userRepository.findById(session.userId()).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        String name = changes.get("name");
        String email = changes.get("email");
        if (name == null || name.isBlank() || email == null || !email.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "A valid name and email are required");
        }
        String normalizedEmail = email.trim().toLowerCase();
        userRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(duplicate -> {
            if (!duplicate.getId().equals(user.getId())) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT, "Email is already registered");
            }
        });
        String oldEmail = user.getEmail();
        user.setName(name.trim());
        user.setEmail(normalizedEmail);
        User saved = userRepository.save(user);
        if (!oldEmail.equalsIgnoreCase(normalizedEmail)) {
            ticketRepository.updateAttendeeEmail(oldEmail, normalizedEmail);
            notificationRepository.updateAttendeeEmail(oldEmail, normalizedEmail);
            eventRepository.updateOrganizerEmail(oldEmail, normalizedEmail);
        }
        String authorization = request.getHeader("Authorization");
        sessions.refresh(authorization == null ? null : authorization.substring("Bearer ".length()), saved);
        activityService.logActivity("PROFILE_UPDATED", "Profile Updated", "Profile updated", saved.getName());
        return saved;
    }

    private AuthSessionService.Session currentSession(HttpServletRequest request) {
        AuthSessionService.Session session = (AuthSessionService.Session) request.getAttribute("evently.session");
        if (session == null) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.UNAUTHORIZED, "Login required");
        return session;
    }


    // =====================================================
    // ADD USER
    // =====================================================

    @PostMapping
    public User createUser(@RequestBody Map<String, String> request) {

        String name = request.get("name");
        String email = request.get("email");
        String password = request.get("password");
        String role = request.get("role");

        if (name == null || name.isBlank() || email == null || email.isBlank()
                || password == null || password.length() < 8) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Name, email and password (8+ characters) are required");
        }
        email = email.trim().toLowerCase();
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Email is already registered");
        }
        role = role == null || role.isBlank() ? "ATTENDEE" : role.trim().toUpperCase();
        if (!java.util.Set.of("ADMIN", "ORGANIZER", "ATTENDEE").contains(role)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Role is invalid");
        }
        User user = new User(name.trim(), email, role, "ACTIVE");
        user.setPasswordHash(passwordEncoder.encode(password));
        User savedUser = userRepository.save(user);

        // Activity Log
        activityService.logActivity(
                "USER_CREATED",
                "User Created",
                "New user created: " +
                        savedUser.getName(),
                "Admin"
        );

        return savedUser;
    }


    // =====================================================
    // UPDATE USER
    // =====================================================

    @PutMapping("/{id}")
    public User updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, String> changes
    ) {

        User existingUser = userRepository.findById(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));

        String name = changes.get("name");
        String email = changes.get("email");
        String role = changes.get("role");
        String status = changes.get("status");
        String password = changes.get("password");
        if ((name != null && name.isBlank()) || (email != null && !email.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Name and email are invalid");
        }
        existingUser.setName(name == null ? existingUser.getName() : name.trim());

        existingUser.setEmail(
                email == null ? existingUser.getEmail() : email.trim().toLowerCase()
        );

        userRepository.findByEmailIgnoreCase(existingUser.getEmail()).ifPresent(duplicate -> {
            if (!duplicate.getId().equals(id)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.CONFLICT, "Email is already registered");
            }
        });

        if (role != null) existingUser.setRole(role.trim().toUpperCase());

        if (status != null) existingUser.setStatus(status.trim().toUpperCase());
        if (password != null && !password.isBlank()) {
            if (password.length() < 8) throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
            existingUser.setPasswordHash(passwordEncoder.encode(password));
        }

        User updatedUser =
                userRepository.save(existingUser);

        // Activity Log
        activityService.logActivity(
                "USER_UPDATED",
                "User Updated",
                "User updated: " +
                        updatedUser.getName(),
                "Admin"
        );

        return updatedUser;
    }


    @PutMapping("/{id}/role")
    public User updateUserRole(@PathVariable Long id, @RequestBody User changes) {
        User user = userRepository.findById(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        if (changes.getRole() == null || changes.getRole().isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Role is required");
        }
        user.setRole(changes.getRole().trim().toUpperCase());
        User saved = userRepository.save(user);
        activityService.logActivity("USER_ROLE_UPDATED", "User Role Updated",
                "Role updated for " + saved.getName(), "Admin");
        return saved;
    }

    // =====================================================
    // DELETE USER
    // =====================================================

    @DeleteMapping("/{id}")
    public String deleteUser(
            @PathVariable Long id
    ) {

        User user = userRepository.findById(id).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));

        String deletedUserName =
                user.getName();

        userRepository.deleteById(id);

        // Activity Log
        activityService.logActivity(
                "USER_DELETED",
                "User Deleted",
                "User deleted: " +
                        deletedUserName,
                "Admin"
        );

        return "User deleted successfully";
    }
}
