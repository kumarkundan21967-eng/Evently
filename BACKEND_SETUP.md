# Evently backend setup

## Database configuration

Set these environment variables before starting Spring Boot:

- `DB_URL` (optional; defaults to `jdbc:mysql://localhost:3306/evently`)
- `DB_USERNAME` (optional; defaults to `root`)
- `DB_PASSWORD` (required; use your local MySQL password)

The password is no longer stored in `application.properties`.

## First administrator

Set `EVENTLY_BOOTSTRAP_ADMIN_SECRET` to a long, one-time secret before starting the backend. Create the first admin once with:

```http
POST http://localhost:8080/api/auth/bootstrap-admin
X-Bootstrap-Secret: <the one-time secret>
Content-Type: application/json

{"name":"Administrator","email":"admin@example.com","password":"use-a-unique-password"}
```

The endpoint works only while the database has no admin account. Remove `EVENTLY_BOOTSTRAP_ADMIN_SECRET` after the first admin is created. Public registration only permits attendee and organizer roles.

## Browser session

Log in through `login.html`. The browser keeps the short-lived bearer token in the active tab and sends it with API requests. Restarting the backend invalidates active sessions. Run the frontend with Live Server at `http://localhost:5500` or `http://127.0.0.1:5500`.

Ticket booking currently creates a `BOOKED` demo reservation. A real payment gateway has not been configured, so the browser cannot mark a booking as paid.

Forgotten passwords are reset by an administrator from **Admin → Users** using the optional new-password field. Self-service email reset is not enabled because no mail provider is configured.
