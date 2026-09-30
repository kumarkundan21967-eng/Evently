package com.evently.evently.service;

import com.evently.evently.model.User;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthSessionService {
    public record Session(Long userId, String name, String email, String role, Instant expiresAt) {}
    private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

    public String create(User user) {
        String token = UUID.randomUUID() + UUID.randomUUID().toString().replace("-", "");
        sessions.put(token, new Session(user.getId(), user.getName(), user.getEmail(), user.getRole(), Instant.now().plusSeconds(43_200)));
        return token;
    }

    public Session find(String token) {
        if (token == null) return null;
        Session session = sessions.get(token);
        if (session != null && session.expiresAt().isBefore(Instant.now())) {
            sessions.remove(token);
            return null;
        }
        return session;
    }

    public void revoke(String token) { if (token != null) sessions.remove(token); }

    public void refresh(String token, User user) {
        Session previous = find(token);
        if (previous != null) sessions.put(token, new Session(user.getId(), user.getName(), user.getEmail(), user.getRole(), previous.expiresAt()));
    }
}
