package com.evently.evently.controller;

import com.evently.evently.model.User;
import com.evently.evently.repository.UserRepository;
import com.evently.evently.service.ActivityService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.evently.evently.service.AuthSessionService;

import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/auth")

public class AuthController {
    private static final Set<String> ROLES = Set.of("ATTENDEE", "ORGANIZER", "ADMIN");
    private final UserRepository users;
    private final ActivityService activities;
    private final AuthSessionService sessions;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    @Value("${evently.bootstrap-admin-secret:}")
    private String bootstrapAdminSecret;

    public AuthController(UserRepository users, ActivityService activities, AuthSessionService sessions) {
        this.users = users;
        this.activities = activities;
        this.sessions = sessions;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public User register(@RequestBody Map<String, String> request) {
        String name = clean(request.get("name"));
        String email = clean(request.get("email")).toLowerCase();
        String password = request.get("password");
        String role = clean(request.get("role")).toUpperCase();
        if (name.isBlank() || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || password == null
                || password.length() < 8 || !ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name, valid email, role and password (8+ characters) are required");
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = new User(name, email, role, "ACTIVE");
        user.setPasswordHash(encoder.encode(password));
        User saved = users.save(user);
        activities.logActivity("USER_REGISTERED", "Account Created", "New account created: " + saved.getName(), saved.getName());
        return saved;
    }

    @PostMapping("/bootstrap-admin")
    @ResponseStatus(HttpStatus.CREATED)
    public User bootstrapAdmin(@RequestHeader(value = "X-Bootstrap-Secret", required = false) String secret,
                               @RequestBody Map<String, String> request) {
        if (bootstrapAdminSecret == null || bootstrapAdminSecret.isBlank() || secret == null
                || !java.security.MessageDigest.isEqual(bootstrapAdminSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                secret.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found");
        }
        if (users.countByRoleIgnoreCase("ADMIN") > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An administrator account already exists");
        }
        String name = clean(request.get("name"));
        String email = clean(request.get("email")).toLowerCase();
        String password = request.get("password");
        if (name.isBlank() || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name, email and password (8+ characters) are required");
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User admin = new User(name, email, "ADMIN", "ACTIVE");
        admin.setPasswordHash(encoder.encode(password));
        return users.save(admin);
    }

    @PostMapping("/login")
    public User login(@RequestBody Map<String, String> request) {
        String email = clean(request.get("email")).toLowerCase();
        String password = request.get("password");
        User user = users.findByEmailIgnoreCase(email).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (password == null || user.getPasswordHash() == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        if ("INACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is inactive");
        }
        activities.logActivity("LOGIN", "User Login", "User logged in", user.getName());
        user.setAccessToken(sessions.create(user));
        return user;
    }

    @PostMapping("/logout")
    public Map<String, Boolean> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) sessions.revoke(authorization.substring(7));
        return Map.of("success", true);
    }

    private String clean(String value) { return value == null ? "" : value.trim(); }
}
