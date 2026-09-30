// =====================================================
// ATTENDEE SESSION
// =====================================================

const attendeeUser = JSON.parse(
    sessionStorage.getItem("eventlySession") ||
    localStorage.getItem("eventlyUser") ||
    "{}"
);


// =====================================================
// BACKEND API
// =====================================================

const API_BASE = "http://localhost:8080";

// Organizer overview uses the same statistics endpoint and values as the
// dedicated Statistics page. dashboard.js is loaded on this page, while
// organizer-pages.js is loaded on the Statistics page.
if (document.getElementById("organizerTotalEvents")) {
    fetch(`${API_BASE}/api/events/my/statistics`)
        .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then((stats) => {
            const currency = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            });
            const values = {
                organizerTotalEvents: stats.totalEvents ?? 0,
                publishedEventsCount: stats.totalEvents ?? 0,
                organizerRegistrationsTotal: stats.registrations ?? 0,
                registrationTotal: stats.registrations ?? 0,
                organizerTicketSalesTotal: stats.ticketSales ?? 0,
                ticketSalesTotal: stats.ticketSales ?? 0,
                organizerBookingValue: currency.format(Number(stats.bookingValue) || 0)
            };
            Object.entries(values).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });

            const points = stats.weeklyRegistrations || [];
            const max = Math.max(1, ...points.map((point) => Number(point.count) || 0));
            document.querySelectorAll(".organizer-statistics .bars i").forEach((bar, index) => {
                const point = points[index];
                bar.style.height = point
                    ? `${Math.max(4, (Number(point.count) / max) * 100)}%`
                    : "4%";
                bar.title = point ? `${point.date}: ${point.count}` : "No data";
            });
        })
        .catch((error) => console.error("Unable to load organizer dashboard statistics:", error));
}


// =====================================================
// AUTH HEADERS
// =====================================================

function getAuthHeaders() {

    const sessionUser = JSON.parse(
        sessionStorage.getItem("eventlySession") || "null"
    );

    const token =
        sessionUser?.accessToken ||
        attendeeUser?.accessToken ||
        "";

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] = "Bearer " + token;
    }

    return headers;
}


// =====================================================
// USER NAME
// =====================================================

document.querySelectorAll("[data-user-name]").forEach((element) => {

    element.textContent =
        attendeeUser.name || "Attendee";

});


// =====================================================
// LOGOUT
// =====================================================

document.querySelectorAll("[data-logout]").forEach((link) => {

    link.addEventListener("click", () => {

        sessionStorage.removeItem("eventlySession");

    });

});


// =====================================================
// LOCAL DATA
// =====================================================

// =====================================================
// EVENT NAME / ID FROM URL
// =====================================================

const urlParams = new URLSearchParams(location.search);

const eventName =
    urlParams.get("event") || "";

const eventIdFromUrl =
    urlParams.get("eventId") ||
    urlParams.get("id") ||
    null;


// =====================================================
// ATTENDEE DASHBOARD
// VIEW DETAILS BUTTONS
// =====================================================

document.addEventListener("click", async (event) => {
            const button = event.target.closest?.(".event-details-button");
            if (!button) return;

            event.preventDefault();

            const clickedEventId = button.dataset.eventId;
            const clickedEventName =
                button.dataset.event ||
                button.closest(".attendee-event-card")
                    ?.querySelector("h3")
                    ?.textContent
                    ?.trim() ||
                "";

            console.log(
                "View details clicked:",
                clickedEventName
            );


            if (!clickedEventName) {

                alert(
                    "Event name is missing."
                );

                return;
            }


            try {

                console.log(
                    "Loading events from backend..."
                );


                const response =
                    await fetch(
                        `${API_BASE}/api/events`,
                        {
                            headers: getAuthHeaders()
                        }
                    );


                console.log(
                    "Events API status:",
                    response.status
                );


                if (!response.ok) {

                    throw new Error(
                        `Unable to load events: HTTP ${response.status}`
                    );

                }


                const backendEvents =
                    await response.json();


                console.log(
                    "Backend events:",
                    backendEvents
                );


                    const selectedEvent =
                    backendEvents.find((event) => {
                        if (clickedEventId) return String(event.id) === clickedEventId;
                        return String(
                            event.name || ""
                        )
                            .trim()
                            .toLowerCase() ===
                            String(
                                clickedEventName
                            )
                                .trim()
                                .toLowerCase();

                    });


                if (!selectedEvent) {

                    console.error(
                        "Event not found in backend:",
                        clickedEventName
                    );

                    alert(
                        "Event not found in backend.\n\n" +
                        "Event: " +
                        clickedEventName
                    );

                    return;
                }


                if (!selectedEvent.id) {

                    console.error(
                        "Backend event has no ID:",
                        selectedEvent
                    );

                    alert(
                        "Event ID is missing from backend."
                    );

                    return;
                }


                console.log(
                    "Selected event:",
                    selectedEvent
                );


                console.log(
                    "Selected event ID:",
                    selectedEvent.id
                );


                localStorage.setItem(
                    "eventlyEvents",
                    JSON.stringify(backendEvents)
                );


                const bookingUrl =
                    "event-booking.html" +
                    "?eventId=" +
                    encodeURIComponent(selectedEvent.id) +
                    "&event=" +
                    encodeURIComponent(selectedEvent.name);


                console.log(
                    "Opening booking page:",
                    bookingUrl
                );


                window.location.href =
                    bookingUrl;

            } catch (error) {

                console.error(
                    "View event details error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to open event details."
                );

            }

        });


// =====================================================
// BROWSE EVENTS
// =====================================================

const featuredEventsContainer = document.getElementById("attendeeFeaturedEvents");
const allAttendeeEventsContainer = document.getElementById("allAttendeeEvents");

if (featuredEventsContainer || allAttendeeEventsContainer) {
    const containers = [featuredEventsContainer, allAttendeeEventsContainer].filter(Boolean);
    containers.forEach((container) => { container.textContent = "Loading approved events..."; });

    fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders() })
        .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then((events) => {
            const approvedEvents = (Array.isArray(events) ? events : []).filter(
                (item) => String(item.status || "").toUpperCase() === "APPROVED"
            );
            localStorage.setItem("eventlyEvents", JSON.stringify(approvedEvents));
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const thisWeekCount = approvedEvents.filter((item) => {
                if (!item.date) return false;
                const eventDate = new Date(`${item.date}T00:00:00`);
                const daysFromToday = (eventDate - today) / 86400000;
                return daysFromToday >= 0 && daysFromToday < 7;
            }).length;
            const newThisWeek = document.getElementById("attendeeNewThisWeek");
            const browseThisWeek = document.getElementById("attendeeBrowseThisWeek");
            if (newThisWeek) newThisWeek.textContent = thisWeekCount;
            if (browseThisWeek) browseThisWeek.textContent = `${thisWeekCount} this week`;

            const renderCards = (container, items) => {
                if (!container) return;
                container.replaceChildren();
                if (!items.length) {
                    container.textContent = "No approved events are available right now.";
                    return;
                }
                items.forEach((item) => {
                    const card = document.createElement("article");
                    card.className = "attendee-event-card";

                    const dateCard = document.createElement("div");
                    dateCard.className = "event-card-date";
                    const parsedDate = item.date ? new Date(`${item.date}T00:00:00`) : null;
                    dateCard.append(parsedDate && !Number.isNaN(parsedDate.valueOf())
                        ? parsedDate.toLocaleString("en", { month: "short" }).toUpperCase()
                        : "DATE");
                    const day = document.createElement("strong");
                    day.textContent = parsedDate && !Number.isNaN(parsedDate.valueOf())
                        ? String(parsedDate.getDate()).padStart(2, "0")
                        : "—";
                    dateCard.append(day);

                    const details = document.createElement("div");
                    const title = document.createElement("h3");
                    title.textContent = item.name || "Event";
                    const meta = document.createElement("small");
                    meta.textContent = [item.location, item.time].filter(Boolean).join(" · ") || "Details coming soon";
                    details.append(title, meta);
                    if (item.description) {
                        const description = document.createElement("p");
                        description.textContent = item.description;
                        details.append(description);
                    }

                    const link = document.createElement("a");
                    link.className = "admin-action event-details-button";
                    link.href = `event-booking.html?eventId=${encodeURIComponent(item.id)}&event=${encodeURIComponent(item.name || "Event")}`;
                    link.dataset.eventId = String(item.id);
                    link.dataset.event = item.name || "";
                    link.textContent = "View details";
                    card.append(dateCard, details, link);
                    container.append(card);
                });
            };

            renderCards(featuredEventsContainer, approvedEvents.slice(0, 2));
            renderCards(allAttendeeEventsContainer, approvedEvents);
        })
        .catch((error) => {
            console.error("Unable to load attendee events:", error);
            const weeklyTotal = document.getElementById("attendeeNewThisWeek");
            const weeklyBadge = document.getElementById("attendeeBrowseThisWeek");
            if (weeklyTotal) weeklyTotal.textContent = "—";
            if (weeklyBadge) weeklyBadge.textContent = "Unavailable";
            containers.forEach((container) => {
                container.textContent = "Could not load events. Check that the backend is running.";
            });
        });
}

if (document.getElementById("allEventsList")) {

    const list =
        document.getElementById("allEventsList");

    list.textContent =
        "Loading events...";


    fetch(
        `${API_BASE}/api/events`,
        {
            headers: getAuthHeaders()
        }
    )

        .then((response) => {

            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }

            return response.json();

        })

        .then((rows) => {

            const approvedEvents =
                rows.filter(
                    (event) =>
                        String(
                            event.status
                        ).toUpperCase() ===
                        "APPROVED"
                );


            localStorage.setItem(
                "eventlyEvents",
                JSON.stringify(
                    approvedEvents
                )
            );


            list.replaceChildren();


            if (!approvedEvents.length) {

                list.textContent =
                    "No approved events are available right now.";

                return;

            }


            approvedEvents.forEach(
                (item, index) => {

                    const article =
                        document.createElement(
                            "article"
                        );

                    article.className =
                        "event-row";


                    const date =
                        document.createElement(
                            "div"
                        );

                    date.className =
                        "event-date";


                    const number =
                        document.createElement(
                            "strong"
                        );

                    number.textContent =
                        String(index + 1).padStart(
                            2,
                            "0"
                        );


                    date.appendChild(
                        number
                    );


                    const details =
                        document.createElement(
                            "div"
                        );


                    const title =
                        document.createElement(
                            "h3"
                        );

                    title.textContent =
                        item.name ||
                        "Event";


                    const meta =
                        document.createElement(
                            "small"
                        );

                    meta.textContent =
                        `${item.location || "Event venue"} · ${item.date || "Date to be announced"}`;


                    details.append(
                        title,
                        meta
                    );


                    const link =
                        document.createElement(
                            "a"
                        );

                    link.className =
                        "premium-button";


                    link.href =
                        `event-booking.html?eventId=${encodeURIComponent(item.id)}&event=${encodeURIComponent(item.name)}`;


                    link.textContent =
                        "View details";


                    article.append(
                        date,
                        details,
                        link
                    );


                    list.appendChild(
                        article
                    );

                }
            );

        })

        .catch((error) => {

            console.error(
                "Unable to load approved events:",
                error
            );


            list.textContent =
                "Could not load events. Please try again later.";

        });

}


// =====================================================
// ATTENDEE DASHBOARD TICKETS AND BOOKING METRICS
// =====================================================

const attendeeTicketList = document.getElementById("ticketList");
if (attendeeTicketList) {
    attendeeTicketList.innerHTML = "<li>Loading your registrations...</li>";
    const attendeeEmail = String(attendeeUser.email || attendeeUser.emailId || "").trim();
    if (!attendeeEmail) {
        attendeeTicketList.innerHTML = "<li>Please log in again to view your registrations.</li>";
    } else {
        fetch(`${API_BASE}/api/tickets/my?email=${encodeURIComponent(attendeeEmail)}`, {
            headers: getAuthHeaders()
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((tickets) => {
                const rows = Array.isArray(tickets) ? tickets : [];
                let localRegistrations = [];
                let localEvents = [];
                try {
                    localRegistrations = JSON.parse(
                        localStorage.getItem("eventlyRegistrations") || "[]"
                    );
                    localEvents = JSON.parse(
                        localStorage.getItem("eventlyEvents") || "[]"
                    );
                } catch (storageError) {
                    console.warn("Unable to read local event names:", storageError);
                }
                const quantity = rows.reduce((sum, ticket) => sum + (Number(ticket.quantity) || 1), 0);
                const uniqueEvents = new Set(rows.map((ticket) => ticket.eventId).filter((id) => id != null));
                const bookedCount = document.getElementById("attendeeTicketsBooked");
                const eventCount = document.getElementById("attendeeEventsBooked");
                if (bookedCount) bookedCount.textContent = quantity;
                if (eventCount) eventCount.textContent = uniqueEvents.size;

                attendeeTicketList.replaceChildren();
                if (!rows.length) {
                    attendeeTicketList.innerHTML = "<li>No ticket bookings yet.</li>";
                    return;
                }
                rows.forEach((ticket) => {
                    const row = document.createElement("li");
                    const detail = document.createElement("span");
                    const title = document.createElement("strong");
                    const localRegistration = localRegistrations.find((registration) =>
                        (ticket.id != null && String(registration.ticketId) === String(ticket.id)) ||
                        (ticket.eventId != null && String(registration.eventId) === String(ticket.eventId))
                    );
                    const localEvent = localEvents.find((event) =>
                        ticket.eventId != null && String(event.id) === String(ticket.eventId)
                    );
                    title.textContent = ticket.eventName ||
                        localRegistration?.event ||
                        localEvent?.name ||
                        `Event #${ticket.eventId || "—"}`;
                    const small = document.createElement("small");
                    small.textContent = [ticket.eventDate, ticket.eventLocation, `${Number(ticket.quantity) || 1} ticket(s)`]
                        .filter(Boolean).join(" · ");
                    detail.append(title, small);
                    const badge = document.createElement("span");
                    badge.className = "badge";
                    badge.textContent = ticket.status || "BOOKED";
                    row.append(detail, badge);
                    attendeeTicketList.append(row);
                });
            })
            .catch((error) => {
                console.error("Unable to load attendee bookings:", error);
                const bookedCount = document.getElementById("attendeeTicketsBooked");
                const eventCount = document.getElementById("attendeeEventsBooked");
                if (bookedCount) bookedCount.textContent = "—";
                if (eventCount) eventCount.textContent = "—";
                attendeeTicketList.innerHTML = "<li>Could not load registrations from the backend.</li>";
            });
    }
}

// TICKET HISTORY - BACKEND
// =====================================================

if (
    document.getElementById("ticketHistory")
) {

    const ticketHistory =
        document.getElementById(
            "ticketHistory"
        );


    let loggedInUser = {};


    try {

        const sessionUser =
            JSON.parse(
                sessionStorage.getItem(
                    "eventlySession"
                ) || "null"
            );


        const storedUser =
            JSON.parse(
                localStorage.getItem(
                    "eventlyUser"
                ) || "null"
            );


        loggedInUser =
            sessionUser ||
            storedUser ||
            attendeeUser ||
            {};

    } catch (error) {

        console.error(
            "Unable to read attendee session:",
            error
        );


        loggedInUser =
            attendeeUser || {};

    }


    const attendeeEmail =
        String(
            loggedInUser.email ||
            loggedInUser.emailId ||
            loggedInUser.emailAddress ||
            ""
        ).trim();


    console.log(
        "My Tickets - logged-in email:",
        attendeeEmail
    );


    ticketHistory.innerHTML = `
        <p class="empty">
            Loading your tickets...
        </p>
    `;


    if (!attendeeEmail) {

        ticketHistory.innerHTML = `
            <p class="empty">
                Please log in again to view your tickets.
            </p>
        `;

    } else {

        const ticketsUrl =
            `${API_BASE}/api/tickets/my?email=${encodeURIComponent(attendeeEmail)}`;


        console.log(
            "My Tickets API URL:",
            ticketsUrl
        );


        fetch(
            ticketsUrl,
            {
                headers: getAuthHeaders()
            }
        )

            .then((response) => {

                console.log(
                    "My Tickets API status:",
                    response.status
                );


                if (!response.ok) {

                    throw new Error(
                        "Failed to load tickets: " +
                        response.status
                    );

                }


                return response.json();

            })

            .then((tickets) => {

                console.log(
                    "Tickets loaded from backend:",
                    tickets
                );


                if (
                    !Array.isArray(tickets) ||
                    tickets.length === 0
                ) {

                    ticketHistory.innerHTML = `
                        <p class="empty">
                            No ticket purchases yet.
                        </p>
                    `;

                    return;

                }


                ticketHistory.innerHTML =
                    tickets
                        .map((ticket) => {

                            const eventTitle =
                                ticket.eventName ||
                                (
                                    ticket.eventId
                                        ? "Event #" +
                                          ticket.eventId
                                        : "Event"
                                );


                            const ticketType =
                                ticket.ticketType ||
                                "General Admission";


                            const quantity =
                                ticket.quantity || 1;


                            const price =
                                ticket.price !== null &&
                                ticket.price !== undefined
                                    ? ticket.price
                                    : 0;


                            const status =
                                ticket.status ||
                                "BOOKED";


                            const paymentMethod =
                                ticket.paymentMethod ||
                                "DEMO";


                            return `
                                <div class="history-row">

                                    <span>

                                        <b>
                                            ${eventTitle}
                                        </b>

                                        <small>
                                            ${ticketType}
                                            · Quantity:
                                            ${quantity}
                                            · ₹${price}
                                            · Payment:
                                            ${paymentMethod}
                                        </small>

                                    </span>

                                    <span class="soft-badge">
                                        ${status}
                                    </span>

                                </div>
                            `;

                        })
                        .join("");

            })

            .catch((error) => {

                console.error(
                    "My Tickets API error:",
                    error
                );


                ticketHistory.innerHTML = `
                    <p class="empty">
                        Unable to load tickets.
                        Please make sure the Java backend is running.
                    </p>
                `;

            });

    }

}


// =====================================================
// REGISTRATION HISTORY - BACKEND
// =====================================================

if (
    document.getElementById(
        "registrationHistoryPage"
    ) || document.getElementById(
        "registrationHistory"
    )
) {

    const registrationHistory =
        document.getElementById(
            "registrationHistoryPage"
        ) || document.getElementById("registrationHistory");


    registrationHistory.innerHTML = `
        <p class="empty">
            Loading registration history...
        </p>
    `;


    const attendeeEmail =
        String(
            attendeeUser.email ||
            attendeeUser.emailId ||
            ""
        ).trim();


    if (!attendeeEmail) {

        registrationHistory.innerHTML = `
            <p class="empty">
                Please log in again to view your registration history.
            </p>
        `;

    } else {

        fetch(
            `${API_BASE}/api/tickets/my?email=${encodeURIComponent(attendeeEmail)}`,
            {
                headers: getAuthHeaders()
            }
        )

            .then((response) => {

                if (!response.ok) {

                    throw new Error(
                        "Registration history API failed: " +
                        response.status
                    );

                }

                return response.json();

            })

            .then((tickets) => {

                console.log(
                    "Registration history from backend:",
                    tickets
                );


                if (
                    !Array.isArray(tickets) ||
                    tickets.length === 0
                ) {

                    registrationHistory.innerHTML = `
                        <p class="empty">
                            No registration history yet.
                        </p>
                    `;

                    return;

                }


                registrationHistory.innerHTML =
                    tickets
                        .map((ticket) => {

                            const eventName =
                                ticket.eventName ||
                                (
                                    ticket.eventId
                                        ? "Event #" +
                                          ticket.eventId
                                        : "Event"
                                );


                            const quantity =
                                ticket.quantity || 1;


                            const status =
                                ticket.status ||
                                "BOOKED";


                            const ticketType =
                                ticket.ticketType ||
                                "General Admission";


                            const paymentMethod =
                                ticket.paymentMethod ||
                                "DEMO";


                            return `
                                <div class="history-row">

                                    <span>

                                        <b>
                                            ${eventName}
                                        </b>

                                        <small>
                                            ${ticketType}
                                            ·
                                            ${quantity}
                                            ticket${quantity === 1 ? "" : "s"}
                                            ·
                                            ₹${ticket.price || 0}
                                            · Payment:
                                            ${paymentMethod}
                                        </small>

                                    </span>

                                    <span class="soft-badge">
                                        ${status}
                                    </span>

                                </div>
                            `;

                        })
                        .join("");

            })

            .catch((error) => {

                console.error(
                    "Registration History API error:",
                    error
                );


                registrationHistory.innerHTML = `
                    <p class="empty">
                        Unable to load registration history.
                        Please make sure the Java backend is running.
                    </p>
                `;

            });

    }

}


// =====================================================
// NOTIFICATIONS
// =====================================================

const attendeeNotificationList = document.getElementById("attendeeUpdates") || document.getElementById("notificationList");
if (attendeeNotificationList) {
    attendeeNotificationList.innerHTML = "<li>Loading your notifications...</li>";
    const attendeeEmail = String(attendeeUser.email || attendeeUser.emailId || "").trim();
    if (!attendeeEmail) {
        attendeeNotificationList.innerHTML = "<li>Please log in again to view notifications.</li>";
    } else {
        fetch(`${API_BASE}/api/notifications/my?email=${encodeURIComponent(attendeeEmail)}`, {
            headers: getAuthHeaders()
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((notifications) => {
                const rows = Array.isArray(notifications) ? notifications : [];
                const unreadCount = rows.filter((item) => !item.read).length;
                const count = document.getElementById("updatesCount");
                if (count) count.textContent = `${unreadCount} new`;
                attendeeNotificationList.replaceChildren();
                if (!rows.length) {
                    attendeeNotificationList.innerHTML = "<li>No notifications yet.</li>";
                    return;
                }
                rows.forEach((item) => {
                    const row = document.createElement("li");
                    const dot = document.createElement("span");
                    dot.className = "activity-dot coral-dot";
                    const content = document.createElement("span");
                    const title = document.createElement("b");
                    title.textContent = item.title || item.type || "Event update";
                    const message = document.createElement("small");
                    message.textContent = item.message || "";
                    content.append(title, message);
                    row.append(dot, content);
                    attendeeNotificationList.append(row);
                });
            })
            .catch((error) => {
                console.error("Unable to load attendee notifications:", error);
                const count = document.getElementById("updatesCount");
                if (count) count.textContent = "Unavailable";
                attendeeNotificationList.innerHTML = "<li>Could not load notifications from the backend.</li>";
            });
    }
}


// =====================================================
// PROFILE
// =====================================================

if (
    document.getElementById(
        "profileName"
    )
) {
    fetch(`${API_BASE}/api/users/me`, { headers: getAuthHeaders() })
        .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then((profile) => {
            document.getElementById("profileName").value = profile.name || "";
            const emailInput = document.getElementById("profileEmail");
            if (emailInput) emailInput.value = profile.email || "";
            const name = document.querySelector("[data-user-name]");
            if (name) name.textContent = profile.name || "Attendee";
            Object.assign(attendeeUser, profile);
        })
        .catch((error) => console.error("Unable to load attendee profile:", error));
}


document
    .getElementById("profileForm")
    ?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            attendeeUser.name =
                document
                    .getElementById(
                        "profileName"
                    )
                    .value
                    .trim();


            attendeeUser.email =
                document
                    .getElementById(
                        "profileEmail"
                    )
                    .value
                    .trim();


            const profileMessage =
                document.getElementById(
                    "profileMessage"
                ) ||
                document.getElementById(
                    "profileConfirmation"
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/api/users/me`,
                        {
                            method: "PUT",
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                                name:
                                    attendeeUser.name,
                                email:
                                    attendeeUser.email
                            })
                        }
                    );


                const updatedUser =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        updatedUser.detail ||
                        updatedUser.error ||
                        "Profile update failed."
                    );

                }


                const activeSession =
                    JSON.parse(
                        sessionStorage.getItem(
                            "eventlySession"
                        ) || "null"
                    ) || {};


                updatedUser.accessToken =
                    activeSession.accessToken;


                sessionStorage.setItem(
                    "eventlySession",
                    JSON.stringify(
                        updatedUser
                    )
                );


                localStorage.setItem(
                    "eventlyUser",
                    JSON.stringify(
                        updatedUser
                    )
                );


                Object.assign(
                    attendeeUser,
                    updatedUser
                );


                if (profileMessage) {

                    profileMessage.textContent =
                        "Profile saved successfully.";

                }

            } catch (error) {

                if (profileMessage) {

                    profileMessage.textContent =
                        error.message ||
                        "Could not save your profile.";

                }

            }

        }
    );


// =====================================================
// BOOKING / TICKET PURCHASE
// =====================================================

if (
    document.getElementById(
        "bookingForm"
    )
) {

    const bookingForm =
        document.getElementById(
            "bookingForm"
        );


    const bookingEvent =
        document.getElementById(
            "bookingEvent"
        );


    const bookingLocation =
        document.getElementById(
            "bookingLocation"
        );


    const bookingTicket =
        document.getElementById(
            "bookingTicket"
        );


    let selectedEvent = null;


    // =================================================
    // LOAD EVENT FROM BACKEND
    // =================================================

    async function loadBookingEvent() {

        try {

            console.log(
                "Loading events from backend..."
            );


            const response =
                await fetch(
                    `${API_BASE}/api/events`,
                    {
                        headers: getAuthHeaders()
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Could not load events: HTTP ${response.status}`
                );

            }


            const backendEvents =
                await response.json();


            console.log(
                "Backend events:",
                backendEvents
            );


            // -------------------------------------------------
            // FIRST: FIND BY EVENT ID
            // -------------------------------------------------

            if (eventIdFromUrl) {

                selectedEvent =
                    backendEvents.find(
                        (item) =>
                            String(item.id) ===
                            String(eventIdFromUrl)
                    );

            }


            // -------------------------------------------------
            // SECOND: FIND BY EVENT NAME
            // -------------------------------------------------

            if (
                !selectedEvent &&
                eventName
            ) {

                const targetName =
                    decodeURIComponent(
                        eventName
                    )
                        .trim()
                        .toLowerCase();


                selectedEvent =
                    backendEvents.find(
                        (item) =>
                            String(
                                item.name || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            targetName
                    );

            }


            if (!selectedEvent) {

                console.error(
                    "Event not found. URL:",
                    location.href
                );


                throw new Error(
                    "Event not found in backend"
                );

            }


            console.log(
                "Selected backend event:",
                selectedEvent
            );


            localStorage.setItem(
                "eventlyEvents",
                JSON.stringify(
                    backendEvents
                )
            );


            bookingEvent.textContent =
                selectedEvent.name ||
                "Event";


            bookingLocation.textContent =
                selectedEvent.location ||
                "Event venue";


            await loadTicketTiers(
                selectedEvent.id
            );

        } catch (error) {

            console.error(
                "Unable to load booking event:",
                error
            );


            bookingEvent.textContent =
                "Event unavailable";


            bookingLocation.textContent =
                error.message;


            const submitButton =
                bookingForm.querySelector(
                    "button[type='submit']"
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

            }

        }

    }


    // =================================================
    // LOAD TICKET TIERS
    // =================================================

    async function loadTicketTiers(
        eventId
    ) {

        try {

            const response =
                await fetch(
                    `${API_BASE}/api/events/${eventId}/ticket-tiers`,
                    {
                        headers: getAuthHeaders()
                    }
                );


            if (!response.ok) {

                console.warn(
                    "Ticket tiers API returned:",
                    response.status
                );

                return;

            }


            const tiers =
                await response.json();


            console.log(
                "Ticket tiers:",
                tiers
            );


            if (
                !Array.isArray(tiers) ||
                tiers.length === 0
            ) {

                console.warn(
                    "No ticket tiers found for event:",
                    eventId
                );

                return;

            }


            bookingTicket.replaceChildren();


            tiers.forEach(
                (tier) => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        tier.name;


                    option.textContent =
                        `${tier.name} · $${Number(
                            tier.price || 0
                        ).toFixed(2)}`;


                    bookingTicket.appendChild(
                        option
                    );

                }
            );

        } catch (error) {

            console.error(
                "Unable to load ticket tiers:",
                error
            );

        }

    }


    // =================================================
    // LOAD EVENT IMMEDIATELY
    // =================================================

    loadBookingEvent();


    // =================================================
    // BOOKING FORM SUBMIT
    // =================================================

    bookingForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            try {

                // -------------------------------------------------
                // MAKE SURE EVENT IS LOADED
                // -------------------------------------------------

                if (
                    !selectedEvent ||
                    !selectedEvent.id
                ) {

                    await loadBookingEvent();

                }


                if (
                    !selectedEvent ||
                    !selectedEvent.id
                ) {

                    throw new Error(
                        "Valid event could not be loaded from backend."
                    );

                }


                console.log(
                    "Final event selected for booking:",
                    selectedEvent
                );


                // -------------------------------------------------
                // SELECT TICKET TIER
                // -------------------------------------------------

                const selectedOption =
                    bookingTicket.selectedOptions[0];


                if (!selectedOption) {

                    throw new Error(
                        "Please select a ticket type."
                    );

                }


                // -------------------------------------------------
                // TICKET TYPE
                // -------------------------------------------------

                const ticketType =
                    selectedOption.value ||
                    selectedOption.textContent
                        .split("·")[0]
                        .trim();


                // -------------------------------------------------
                // PRICE
                // -------------------------------------------------

                const priceText =
                    selectedOption.textContent
                        .match(/[\d.]+/);


                const price =
                    priceText
                        ? Number(priceText[0])
                        : 0;


                // -------------------------------------------------
                // ATTENDEE
                // -------------------------------------------------

                const attendeeName =
                    attendeeUser.name ||
                    "Attendee";


                const attendeeEmail =
                    attendeeUser.email ||
                    attendeeUser.emailId ||
                    "";


                if (!attendeeEmail) {

                    throw new Error(
                        "Please log in again before booking a ticket."
                    );

                }


                // -------------------------------------------------
                // FINAL EVENT ID
                // -------------------------------------------------

                const finalEventId =
                    Number(
                        selectedEvent.id
                    );


                if (
                    !Number.isInteger(
                        finalEventId
                    ) ||
                    finalEventId <= 0
                ) {

                    throw new Error(
                        "Invalid event ID: " +
                        selectedEvent.id
                    );

                }


                // =================================================
                // FINAL TICKET DATA
                // =================================================

                const ticketData = {

                    eventId:
                        finalEventId,

                    attendeeName:
                        attendeeName,

                    attendeeEmail:
                        attendeeEmail,

                    ticketType:
                        ticketType,

                    quantity:
                        1,

                    price:
                        price,

                    status:
                        "BOOKED",

                    createdAt:
                        new Date().toISOString(),

                    // =============================================
                    // IMPORTANT:
                    // PAYMENT METHOD SAVED IN DATABASE
                    // =============================================

                    paymentMethod:
                        "DEMO"
                };


                console.log(
                    "Sending FINAL ticket data:",
                    ticketData
                );


                // =================================================
                // POST TO BACKEND
                // =================================================

                const response =
                    await fetch(
                        `${API_BASE}/api/tickets`,
                        {
                            method: "POST",
                            headers: getAuthHeaders(),
                            body: JSON.stringify(
                                ticketData
                            )
                        }
                    );


                console.log(
                    "Ticket API status:",
                    response.status
                );


                const responseText =
                    await response.text();


                if (!response.ok) {

                    console.error(
                        "Backend ticket error:",
                        responseText
                    );


                    throw new Error(
                        `Ticket booking failed: HTTP ${response.status} ${responseText}`
                    );

                }


                let savedTicket;


                try {

                    savedTicket =
                        JSON.parse(
                            responseText
                        );

                } catch (error) {

                    throw new Error(
                        "Backend returned invalid ticket data."
                    );

                }


                console.log(
                    "Ticket saved successfully:",
                    savedTicket
                );


                // =================================================
                // VERIFY TICKET ID
                // =================================================

                if (!savedTicket.id) {

                    throw new Error(
                        "Backend did not return ticket ID."
                    );

                }


                // =================================================
                // VERIFY PAYMENT METHOD
                // =================================================

                console.log(
                    "Saved payment method:",
                    savedTicket.paymentMethod
                );


                // =================================================
                // LOCAL RECORD
                // =================================================

                const record = {

                    event:
                        savedTicket.eventName ||
                        selectedEvent.name,

                    location:
                        savedTicket.eventLocation ||
                        selectedEvent.location ||
                        "Event venue",

                    date:
                        savedTicket.eventDate ||
                        selectedEvent.date ||
                        "Date to be announced",

                    timeSlot:
                        savedTicket.eventTime ||
                        selectedEvent.time ||
                        "Time to be announced",

                    ticket:
                        savedTicket.ticketType ||
                        ticketType,

                    attendee:
                        savedTicket.attendeeName ||
                        attendeeName,

                    attendeeEmail:
                        savedTicket.attendeeEmail ||
                        attendeeEmail,

                    receipt:
                        "EV-" +
                        savedTicket.id,

                    amount:
                        Number(
                            savedTicket.price ||
                            price
                        ) *
                        Number(
                            savedTicket.quantity ||
                            1
                        ),

                    // =============================================
                    // PAYMENT METHOD
                    // =============================================

                    paymentMethod:
                        savedTicket.paymentMethod ||
                        "DEMO",

                    payment:
                        savedTicket.status ||
                        "BOOKED",

                    quantity:
                        savedTicket.quantity ||
                        1,

                    ticketId:
                        savedTicket.id,

                    eventId:
                        savedTicket.eventId

                };


                // =================================================
                // SAVE LOCAL REGISTRATION
                // =================================================

                const saved =
                    JSON.parse(
                        localStorage.getItem(
                            "eventlyRegistrations"
                        ) || "[]"
                    );


                saved.unshift(
                    record
                );


                localStorage.setItem(
                    "eventlyRegistrations",
                    JSON.stringify(
                        saved
                    )
                );


                localStorage.setItem(
                    "eventlyLastTicket",
                    JSON.stringify(
                        record
                    )
                );


                // =================================================
                // RECEIPT
                // =================================================

                window.location.href =
                    "ticket-receipt.html?id=" +
                    encodeURIComponent(
                        savedTicket.id
                    );

            } catch (error) {

                console.error(
                    "Ticket booking error:",
                    error
                );


                alert(
                    error.message ||
                    "Ticket booking failed. Please try again."
                );

            }

        }
    );

}
