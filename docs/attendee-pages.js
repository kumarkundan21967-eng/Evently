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

const API_BASE = window.EVENTLY_API_BASE;


// =====================================================
// AUTH HEADERS
// =====================================================

function getAuthHeaders() {

    const token = attendeeUser.accessToken || "";

    return {
        "Content-Type": "application/json",
        ...(token
            ? {
                "Authorization": "Bearer " + token
            }
            : {})
    };
}


// =====================================================
// USER NAME
// =====================================================

document
    .querySelectorAll("[data-user-name]")
    .forEach((element) => {

        element.textContent =
            attendeeUser.name || "Attendee";

    });


// =====================================================
// LOGOUT
// =====================================================

document
    .querySelectorAll("[data-logout]")
    .forEach((link) => {

        link.addEventListener("click", () => {

            sessionStorage.removeItem("eventlySession");

        });

    });


// =====================================================
// LOCAL DATA
// =====================================================

const events = JSON.parse(
    localStorage.getItem("eventlyEvents") || "[]"
);

const registrations = JSON.parse(
    localStorage.getItem("eventlyRegistrations") || "[]"
);

const updates = JSON.parse(
    localStorage.getItem("eventlyUpdates") || "[]"
);


// =====================================================
// URL PARAMETERS
// =====================================================

const params =
    new URLSearchParams(window.location.search);

const eventName =
    params.get("event");

const eventIdFromUrl =
    params.get("id");


// =====================================================
// BROWSE EVENTS
// =====================================================

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

            console.log(
                "Events received from backend:",
                rows
            );


            // Only APPROVED events
            const approvedEvents =
                rows.filter(
                    (event) =>
                        String(event.status || "")
                            .toUpperCase() ===
                        "APPROVED"
                );


            // Save approved events locally
            localStorage.setItem(
                "eventlyEvents",
                JSON.stringify(approvedEvents)
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
                        document.createElement("article");

                    article.className =
                        "event-row";


                    // ---------------------------------
                    // NUMBER
                    // ---------------------------------

                    const date =
                        document.createElement("div");

                    date.className =
                        "event-date";


                    const number =
                        document.createElement("strong");

                    number.textContent =
                        String(index + 1)
                            .padStart(2, "0");


                    date.appendChild(number);


                    // ---------------------------------
                    // EVENT DETAILS
                    // ---------------------------------

                    const details =
                        document.createElement("div");


                    const title =
                        document.createElement("h3");

                    title.textContent =
                        item.name || "Event";


                    const meta =
                        document.createElement("small");

                    meta.textContent =
                        `${item.location || "Event venue"} · ${
                            item.date || "Date to be announced"
                        }`;


                    details.append(
                        title,
                        meta
                    );


                    // ---------------------------------
                    // VIEW DETAILS BUTTON
                    // ---------------------------------

                    const link =
                        document.createElement("a");

                    link.className =
                        "premium-button";

                    link.textContent =
                        "View details";


                    /*
                     * IMPORTANT:
                     * Backend event ID is passed
                     * to event-booking.html
                     */

                    if (
                        item.id !== null &&
                        item.id !== undefined
                    ) {

                        link.href =
                            `event-booking.html?id=${encodeURIComponent(
                                item.id
                            )}&event=${encodeURIComponent(
                                item.name || ""
                            )}`;

                    } else {

                        console.error(
                            "Event has no backend ID:",
                            item
                        );

                        link.href =
                            "#";

                        link.addEventListener(
                            "click",
                            (e) => {

                                e.preventDefault();

                                alert(
                                    "This event does not have a valid backend ID."
                                );

                            }
                        );

                    }


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
// TICKET HISTORY - BACKEND
// =====================================================

if (
    document.getElementById("ticketHistory")
) {

    const ticketHistory =
        document.getElementById("ticketHistory");


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
            `${API_BASE}/api/tickets/my?email=${encodeURIComponent(
                attendeeEmail
            )}`;


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

                            const eventLocation = ticket.eventLocation || "Location unavailable";
                            const eventDate = ticket.eventDate || "Date unavailable";
                            const eventTime = ticket.eventTime || "Time unavailable";
                            const paymentMethod = ticket.paymentMethod || "Not recorded";


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
                                        </small>

                                        <small>
                                            ${eventLocation} · ${eventDate} · ${eventTime}
                                        </small>

                                        <small>
                                            Payment: ${paymentMethod} · Ticket #${ticket.id}
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
// REGISTRATION HISTORY
// =====================================================

if (
    document.getElementById(
        "registrationHistoryPage"
    )
) {

    const registrationHistory =
        document.getElementById(
            "registrationHistoryPage"
        );


    registrationHistory.innerHTML = `
        <p class="empty">
            Loading registration history...
        </p>
    `;


    const attendeeEmail =
        String(
            attendeeUser.email ||
            attendeeUser.emailId ||
            attendeeUser.emailAddress ||
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
            `${API_BASE}/api/tickets/my?email=${encodeURIComponent(
                attendeeEmail
            )}`,
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

                            const eventTitle =
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


                            const price =
                                ticket.price || 0;

                            const eventLocation =
                                ticket.eventLocation ||
                                "Location unavailable";

                            const eventDate =
                                ticket.eventDate ||
                                "Date unavailable";

                            const eventTime =
                                ticket.eventTime ||
                                "Time unavailable";

                            const paymentMethod =
                                ticket.paymentMethod ||
                                "Not recorded";


                            return `
                                <div class="history-row">

                                    <span>

                                        <b>
                                            ${eventTitle}
                                        </b>

                                        <small>
                                            ${ticketType}
                                            ·
                                            ${quantity}
                                            ticket${quantity === 1 ? "" : "s"}
                                            ·
                                            ₹${price}
                                        </small>

                                        <small>
                                            ${eventLocation} · ${eventDate} · ${eventTime}
                                        </small>

                                        <small>
                                            Payment: ${paymentMethod} · Ticket #${ticket.id || "—"}
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

if (
    document.getElementById(
        "notificationList"
    )
) {

    const notificationList =
        document.getElementById(
            "notificationList"
        );


    const notificationEmail = String(attendeeUser.email || attendeeUser.emailId || attendeeUser.emailAddress || "").trim();
    notificationList.innerHTML = `<p class="empty">Loading notifications...</p>`;

    if (!notificationEmail) {
        notificationList.innerHTML = `<p class="empty">Please log in again to view notifications.</p>`;
    } else {
        fetch(`${API_BASE}/api/notifications/my?email=${encodeURIComponent(notificationEmail)}`, {
            headers: getAuthHeaders()
        }).then(async (response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        }).then((notifications) => {
            if (!Array.isArray(notifications) || notifications.length === 0) {
                notificationList.innerHTML = `<p class="empty">No new notifications.</p>`;
                return;
            }

            notificationList.replaceChildren();
            notifications.forEach((item) => {
                const row = document.createElement("div");
                row.className = "notification";
                const dot = document.createElement("i");
                dot.className = "notification-dot";
                if (item.read) dot.style.opacity = "0.35";
                const content = document.createElement("span");
                const title = document.createElement("b");
                title.textContent = item.title || "Notification";
                const message = document.createElement("small");
                message.textContent = item.message || "";
                const meta = document.createElement("small");
                meta.textContent = [item.type, item.createdAt].filter(Boolean).join(" · ");
                content.append(title, message, meta);
                row.append(dot, content);

                if (!item.read && item.id != null) {
                    row.tabIndex = 0;
                    row.title = "Mark as read";
                    const markRead = async () => {
                        try {
                            const result = await fetch(`${API_BASE}/api/notifications/${item.id}/read`, {
                                method: "PUT",
                                headers: getAuthHeaders()
                            });
                            if (!result.ok) throw new Error(`HTTP ${result.status}`);
                            item.read = true;
                            dot.style.opacity = "0.35";
                            row.removeEventListener("click", markRead);
                            row.removeEventListener("keydown", onKeyDown);
                        } catch (error) {
                            console.error("Unable to mark notification as read:", error);
                        }
                    };
                    const onKeyDown = (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            markRead();
                        }
                    };
                    row.addEventListener("click", markRead);
                    row.addEventListener("keydown", onKeyDown);
                }
                notificationList.append(row);
            });
        }).catch((error) => {
            console.error("Unable to load notifications:", error);
            notificationList.innerHTML = `<p class="empty">Unable to load notifications. Please make sure the Java backend is running.</p>`;
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

    document.getElementById(
        "profileName"
    ).value =
        attendeeUser.name || "";

}


if (
    document.getElementById(
        "profileEmail"
    )
) {

    document.getElementById(
        "profileEmail"
    ).value =
        attendeeUser.email || "";

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
                );


            try {

                const response =
                    await fetch(
                        `${API_BASE}/api/users/me`,
                        {
                            method: "PUT",

                            headers:
                                getAuthHeaders(),

                            body:
                                JSON.stringify({
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
                        updatedUser.message ||
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


                profileMessage.textContent =
                    "Profile saved successfully.";

            } catch (error) {

                profileMessage.textContent =
                    error.message ||
                    "Could not save your profile.";

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

    let selectedEvent = null;


    const bookingEvent =
        document.getElementById(
            "bookingEvent"
        );


    const bookingLocation =
        document.getElementById(
            "bookingLocation"
        );


    const bookingDate =
        document.getElementById(
            "bookingDate"
        );


    const bookingTicket =
        document.getElementById(
            "bookingTicket"
        );


    const bookingForm =
        document.getElementById(
            "bookingForm"
        );


    // =================================================
    // LOAD EVENT FROM BACKEND
    // =================================================

    async function loadBookingEvent() {

        try {

            const response =
                await fetch(
                    `${API_BASE}/api/events`,
                    {
                        headers:
                            getAuthHeaders()
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to load events: " +
                    response.status
                );

            }


            const backendEvents =
                await response.json();


            console.log(
                "Events received from backend:",
                backendEvents
            );


            const currentParams =
                new URLSearchParams(
                    window.location.search
                );


            const urlEventId =
                currentParams.get("id");


            const urlEventName =
                currentParams.get("event");


            console.log(
                "Booking URL event ID:",
                urlEventId
            );


            console.log(
                "Booking URL event name:",
                urlEventName
            );


            // FIND BY ID FIRST
            if (urlEventId) {

                selectedEvent =
                    backendEvents.find(
                        (event) =>
                            String(event.id) ===
                            String(urlEventId)
                    );

            }


            // FIND BY NAME
            if (
                !selectedEvent &&
                urlEventName
            ) {

                selectedEvent =
                    backendEvents.find(
                        (event) =>
                            String(
                                event.name || ""
                            )
                                .trim()
                                .toLowerCase() ===
                            String(
                                urlEventName
                            )
                                .trim()
                                .toLowerCase()
                    );

            }


            // EVENT NOT FOUND
            if (!selectedEvent) {

                console.error(
                    "Requested event not found:",
                    {
                        urlEventId,
                        urlEventName,
                        backendEvents
                    }
                );


                throw new Error(
                    "Event not found in backend"
                );

            }


            console.log(
                "Selected event:",
                selectedEvent
            );


            // SHOW EVENT
            if (bookingEvent) {

                bookingEvent.textContent =
                    selectedEvent.name ||
                    "Event";

            }


            if (bookingLocation) {

                bookingLocation.textContent =
                    selectedEvent.location ||
                    "Event venue";

            }


            if (bookingDate) {

                bookingDate.textContent =
                    selectedEvent.date ||
                    "Date to be announced";

            }


            // SAVE BACKEND EVENTS
            localStorage.setItem(
                "eventlyEvents",
                JSON.stringify(
                    backendEvents
                )
            );


            // LOAD TICKET TIERS
            if (bookingTicket) {

                bookingTicket.innerHTML = "";

            }


            try {

                const tierResponse =
                    await fetch(
                        `${API_BASE}/api/events/${selectedEvent.id}/ticket-tiers`,
                        {
                            headers:
                                getAuthHeaders()
                        }
                    );


                if (tierResponse.ok) {

                    const tiers =
                        await tierResponse.json();


                    console.log(
                        "Ticket tiers:",
                        tiers
                    );


                    if (
                        Array.isArray(tiers) &&
                        tiers.length > 0
                    ) {

                        tiers.forEach(
                            (tier) => {

                                const option =
                                    document.createElement(
                                        "option"
                                    );


                                option.value =
                                    tier.name;


                                option.textContent =
                                    `${tier.name} · ₹${Number(
                                        tier.price
                                    ).toFixed(2)}`;


                                bookingTicket.appendChild(
                                    option
                                );

                            }
                        );

                    } else {

                        addDefaultTicket();

                    }

                } else {

                    addDefaultTicket();

                }

            } catch (error) {

                console.warn(
                    "Unable to load ticket tiers:",
                    error
                );


                addDefaultTicket();

            }

        } catch (error) {

            console.error(
                "Booking event loading error:",
                error
            );


            if (bookingEvent) {

                bookingEvent.textContent =
                    "Event not found";

            }


            if (bookingLocation) {

                bookingLocation.textContent =
                    "Please go back and select an available event.";

            }


            if (bookingDate) {

                bookingDate.textContent =
                    "";

            }


            alert(
                "Event not found in backend"
            );

        }

    }


    // =================================================
    // DEFAULT TICKET
    // =================================================

    function addDefaultTicket() {

        if (!bookingTicket) {
            return;
        }


        bookingTicket.innerHTML = "";


        const option =
            document.createElement(
                "option"
            );


        option.value =
            "General Admission";


        option.textContent =
            "General Admission · ₹18.00";


        bookingTicket.appendChild(
            option
        );

    }


    // =================================================
    // LOAD EVENT
    // =================================================

    loadBookingEvent();


    // =================================================
    // BOOKING FORM SUBMIT
    // =================================================

    bookingForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (
                !selectedEvent ||
                !selectedEvent.id
            ) {

                alert(
                    "Event details are not loaded yet. Please try again."
                );

                return;

            }


            if (!attendeeUser.email) {

                alert(
                    "Please login before booking a ticket."
                );


                window.location.href =
                    "login.html";


                return;

            }


            const selectedOption =
                bookingTicket &&
                bookingTicket.selectedOptions
                    ? bookingTicket.selectedOptions[0]
                    : null;


            if (!selectedOption) {

                alert(
                    "Please select a ticket type."
                );

                return;

            }


            const ticketType =
                selectedOption.value ||
                selectedOption.textContent.trim();


            // Extract price
            let price = 0;


            const priceMatch =
                selectedOption.textContent.match(
                    /\d+(?:\.\d+)?/
                );


            if (priceMatch) {

                price =
                    Number(
                        priceMatch[0]
                    );

            }


            const attendeeName =
                attendeeUser.name ||
                "Attendee";


            const attendeeEmail =
                attendeeUser.email ||
                "";


            // =================================================
            // TICKET DATA
            // =================================================

            const ticketData = {

                eventId:
                    Number(
                        selectedEvent.id
                    ),

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

                paymentMethod:
                    "DEMO"

            };


            console.log(
                "Sending ticket to backend:",
                ticketData
            );


            // =================================================
            // SEND TO BACKEND
            // =================================================

            try {

                const response =
                    await fetch(
                        `${API_BASE}/api/tickets`,
                        {

                            method:
                                "POST",

                            headers:
                                getAuthHeaders(),

                            body:
                                JSON.stringify(
                                    ticketData
                                )

                        }
                    );


                console.log(
                    "Ticket API status:",
                    response.status
                );


                if (!response.ok) {

                    const errorText =
                        await response.text();


                    console.error(
                        "Backend ticket error:",
                        errorText
                    );


                    throw new Error(
                        `Ticket booking failed: ${response.status}`
                    );

                }


                const savedTicket =
                    await response.json();


                console.log(
                    "Ticket saved successfully:",
                    savedTicket
                );


                // =================================================
                // LOCAL REGISTRATION RECORD
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
                // SAVE LOCAL HISTORY
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
                    JSON.stringify(saved)
                );


                localStorage.setItem(
                    "eventlyLastTicket",
                    JSON.stringify(record)
                );


                // =================================================
                // GO TO RECEIPT
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
    // =====================================================
// MY PLANS - VIEW DETAILS
// =====================================================

document.querySelectorAll("[data-my-plan-event]").forEach((card) => {

    const eventId =
        card.getAttribute("data-event-id");

    const eventName =
        card.getAttribute("data-event-name");

    if (!eventId) {
        console.warn("My Plan event has no event ID:", card);
        return;
    }

    let button =
        card.querySelector("[data-view-details]");

    // Agar button already hai to usko use karo
    if (!button) {
        button = document.createElement("a");
        button.textContent = "View details";
        button.className = "premium-button";

        card.appendChild(button);
    }

    button.href =
        "event-booking.html?id=" +
        encodeURIComponent(eventId) +
        "&event=" +
        encodeURIComponent(eventName || "");

});

}
