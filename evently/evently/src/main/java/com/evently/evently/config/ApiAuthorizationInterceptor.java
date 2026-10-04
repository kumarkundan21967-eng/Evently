package com.evently.evently.config;

import com.evently.evently.service.AuthSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class ApiAuthorizationInterceptor implements HandlerInterceptor {

    private final AuthSessionService sessions;

    public ApiAuthorizationInterceptor(AuthSessionService sessions) {
        this.sessions = sessions;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) throws Exception {

        String path = request.getRequestURI();
        String method = request.getMethod();

        // Public requests
        if ("OPTIONS".equals(method)
                || "/".equals(path)
                || path.equals("/api/auth/register")
                || path.equals("/api/auth/login")
                || path.equals("/api/auth/bootstrap-admin")) {
            return true;
        }

        // Public event GET requests
        if (path.equals("/api/events") && "GET".equals(method)) {
            return true;
        }

        if (path.matches("/api/events/\\d+") && "GET".equals(method)) {
            return true;
        }

        if (path.matches("/api/events/\\d+/ticket-tiers") && "GET".equals(method)) {
            return true;
        }

        // Logout
        if (path.equals("/api/auth/logout")) {

            String auth = request.getHeader("Authorization");

            String logoutToken =
                    auth != null && auth.startsWith("Bearer ")
                            ? auth.substring(7)
                            : null;

            AuthSessionService.Session active =
                    sessions.find(logoutToken);

            if (active == null) {
                return deny(response, 401, "Login required");
            }

            return true;
        }

        // Get Authorization token
        String authorization =
                request.getHeader("Authorization");

        String token =
                authorization != null && authorization.startsWith("Bearer ")
                        ? authorization.substring(7)
                        : null;

        AuthSessionService.Session session =
                sessions.find(token);

        // No valid session
        if (session == null) {
            return deny(response, 401, "Login required");
        }

        boolean allowed;

        // Current user
        if (path.equals("/api/users/me")) {

            allowed = true;

        // Admin / Users
        } else if (
                path.startsWith("/api/admin/")
                        || path.equals("/api/users")
                        || path.startsWith("/api/users/")
        ) {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role());

        // All events
        } else if (path.equals("/api/events/all")) {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role());

        // Event management
        } else if (
                path.equals("/api/events/manage")
                        || path.startsWith("/api/events/manage/")
        ) {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role())
                            || "ORGANIZER".equalsIgnoreCase(session.role());

        // Organizer statistics
        } else if (path.equals("/api/events/my/statistics")) {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role())
                            || "ORGANIZER".equalsIgnoreCase(session.role());

        // Pending / approve / reject
        } else if (
                path.equals("/api/events/pending")
                        || path.matches("/api/events/\\d+/(approve|reject)")
        ) {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role());

        // Ticket tiers / announcements
        } else if (
                path.matches("/api/events/\\d+/ticket-tiers(/\\d+)?")
                        || path.matches("/api/events/\\d+/announcements")
        ) {

            allowed =
                    "ORGANIZER".equalsIgnoreCase(session.role())
                            || "ADMIN".equalsIgnoreCase(session.role());

        // Create event
        } else if (
                path.equals("/api/events")
                        && "POST".equals(method)
        ) {

            allowed =
                    "ORGANIZER".equalsIgnoreCase(session.role())
                            || "ADMIN".equalsIgnoreCase(session.role());

        // Update / Delete event
        } else if (
                path.matches("/api/events/\\d+")
                        && ("PUT".equals(method)
                        || "DELETE".equals(method))
        ) {

            allowed =
                    "ORGANIZER".equalsIgnoreCase(session.role())
                            || "ADMIN".equalsIgnoreCase(session.role());

        // Notifications
        } else if (path.startsWith("/api/notifications")) {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role())
                            || path.equals("/api/notifications/my")
                            || path.matches("/api/notifications/\\d+/read");

        // Admin ticket GET
        } else if (
                path.equals("/api/tickets")
                        && "GET".equals(method)
        ) {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role());

        // Attendee ticket POST
        } else if (
                path.equals("/api/tickets")
                        && "POST".equals(method)
        ) {

            allowed =
                    "ATTENDEE".equalsIgnoreCase(session.role());

        // Ticket details
        } else if (path.startsWith("/api/tickets/")) {

            allowed =
                    "ATTENDEE".equalsIgnoreCase(session.role())
                            || "ADMIN".equalsIgnoreCase(session.role());

        // Everything else
        } else {

            allowed =
                    "ADMIN".equalsIgnoreCase(session.role());
        }

        // Final authorization check
        if (!allowed) {

            return deny(
                    response,
                    403,
                    "You do not have permission to access this resource"
            );
        }

        request.setAttribute(
                "evently.session",
                session
        );

        return true;
    }

    private boolean deny(
            HttpServletResponse response,
            int status,
            String message
    ) throws Exception {

        response.setStatus(status);
        response.setContentType("application/json");

        response.getWriter().write(
                "{\"error\":\"" + message + "\"}"
        );

        return false;
    }
}
