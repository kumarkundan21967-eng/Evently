# Evently backend setup

## Database configuration

For Railway, add a MySQL service to the same project and reference its variables from the Evently service. The application accepts Railway's standard MySQL variables directly:

- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLDATABASE`
- `MYSQLUSER`
- `MYSQLPASSWORD`

You can instead provide `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`; those take precedence. `DB_URL` can override the full JDBC URL and must start with `jdbc:mysql:`. Do not use Railway's `mysql://` URL as `DB_URL` without converting it to a JDBC URL.

The repository's Railway Docker build is configured at the repository root. Keep the Railway service root directory at `/` so the Dockerfile can copy the nested Maven project and its frontend assets. The runtime listens on Railway's `PORT`.

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

Log in through `login.html`. The browser keeps the short-lived bearer token in the active tab and sends it with API requests. Restarting the backend invalidates active sessions. Run the frontend with Live Server on localhost; this selects the local backend at `http://localhost:8080`. Deployed pages use `https://evently-production-b57e.up.railway.app` as the API.

Ticket booking currently creates a `BOOKED` demo reservation. A real payment gateway has not been configured, so the browser cannot mark a booking as paid.

Forgotten passwords are reset by an administrator from **Admin → Users** using the optional new-password field. Self-service email reset is not enabled because no mail provider is configured.
