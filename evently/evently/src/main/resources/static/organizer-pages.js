// =========================================================
// EVENTLY — ORGANIZER JAVASCRIPT
// =========================================================


// =========================================================
// JAVA BACKEND URL
// =========================================================

const API_URL = `${window.EVENTLY_API_BASE}/api/events`;


// =========================================================
// ORGANIZER USER SESSION
// =========================================================

const orgUser = JSON.parse(
    sessionStorage.getItem("eventlySession") ||
    localStorage.getItem("eventlyUser") ||
    "{}"
);


// =========================================================
// LOAD ORGANIZER EVENT OPTIONS
// =========================================================

async function populateOrganizerEventOptions() {

    const selects = [
        document.querySelector('#ticketPageForm select[name="event"]'),
        document.querySelector('#messagePageForm select[name="event"]')
    ].filter(Boolean);

    if (!selects.length) return;

    try {

        const response = await fetch(
            `${API_URL}/manage`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const events = await response.json();

        selects.forEach((select) => {

            select.replaceChildren(
                new Option("Select event", "")
            );

            events.forEach((item) => {

                select.add(
                    new Option(
                        item.name,
                        String(item.id)
                    )
                );

            });

        });

    } catch (error) {

        console.error(
            "Loading organizer event options failed:",
            error
        );

    }

}


populateOrganizerEventOptions();


// =========================================================
// ORGANIZER STATISTICS
// =========================================================

if (document.querySelector(".analytics-grid") || document.getElementById("publishedEventsCount")) {

    fetch(`${API_URL}/my/statistics`)
        .then((response) => {

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();

        })
        .then((stats) => {

            const formatCurrency = new Intl.NumberFormat(
                    "en-IN",
                    {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0
                    }
                );
            const setText = (selector, value) => {
                document.querySelectorAll(selector).forEach((node) => {
                    node.textContent = value;
                });
            };

            // Keep the dashboard summary and statistics page on the same API values.
            setText("#publishedEventsCount", stats.publishedEvents ?? 0);
            setText("#registrationTotal", stats.registrations ?? 0);
            setText("#ticketSalesTotal", stats.ticketSales ?? 0);
            setText("#organizerTotalEvents", stats.totalEvents ?? 0);
            setText("#organizerRegistrationsTotal", stats.registrations ?? 0);
            setText("#organizerTicketSalesTotal", stats.ticketSales ?? 0);
            setText("#organizerBookingValue", formatCurrency.format(Number(stats.bookingValue) || 0));


            const points =
                stats.weeklyRegistrations || [];


            const max = Math.max(
                1,
                ...points.map(
                    (point) =>
                        Number(point.count) || 0
                )
            );


            document
                .querySelectorAll(".chart .bars i")
                .forEach((bar, index) => {

                    const point = points[index];

                    bar.style.height =
                        point
                            ? `${Math.max(
                                4,
                                (
                                    Number(point.count) /
                                    max
                                ) * 100
                            )}%`
                            : "4%";

                    bar.title =
                        point
                            ? `${point.date}: ${point.count}`
                            : "No data";

                });

        })
        .catch((error) => {

            console.error(
                "Unable to load organizer statistics:",
                error
            );

        });

}


// =========================================================
// UPCOMING EVENTS
// =========================================================

if (
    document
        .querySelector(".org-header h1")
        ?.textContent
        .toLowerCase()
        .includes("upcoming")
) {

    const list =
        document.querySelector(".org-list");


    if (list) {

        fetch(`${API_URL}/manage`)
            .then((response) => {

                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }

                return response.json();

            })
            .then((events) => {

                list.replaceChildren();


                if (!events.length) {

                    list.textContent =
                        "You do not have any events yet.";

                    return;

                }


                events
                    .sort((a, b) =>
                        String(a.date || "")
                            .localeCompare(
                                String(b.date || "")
                            )
                    )
                    .forEach((item) => {

                        const row =
                            document.createElement("div");

                        row.className =
                            "org-row";


                        const details =
                            document.createElement("span");


                        const name =
                            document.createElement("b");

                        name.textContent =
                            item.name ||
                            "Untitled event";


                        const meta =
                            document.createElement("small");

                        meta.textContent =
                            `${item.date || "Date to be announced"} · ` +
                            `${item.time || "Time to be announced"} · ` +
                            `${item.location || "Venue to be announced"}`;


                        details.append(
                            name,
                            meta
                        );


                        const status =
                            document.createElement("span");

                        status.className =
                            "badge";

                        status.textContent =
                            item.status ||
                            "PENDING";


                        row.append(
                            details,
                            status
                        );


                        list.append(row);

                    });

            })
            .catch((error) => {

                console.error(
                    "Unable to load upcoming events:",
                    error
                );

            });

    }

}


// =========================================================
// DISPLAY ORGANIZER NAME
// =========================================================

document
    .querySelectorAll("[data-org-name]")
    .forEach((element) => {

        element.textContent =
            orgUser.name ||
            "Organizer";

    });


// =========================================================
// LOGOUT
// =========================================================

document
    .querySelectorAll("[data-logout]")
    .forEach((link) => {

        link.addEventListener(
            "click",
            () => {

                sessionStorage.removeItem(
                    "eventlySession"
                );

            }
        );

    });


// =========================================================
// SUCCESS MESSAGE
// =========================================================

const saveMessage = (message) => {

    const target =
        document.getElementById(
            "orgMessage"
        );


    if (target) {

        target.textContent =
            message;


        setTimeout(() => {

            target.textContent = "";

        }, 2800);

    }

};


// =========================================================
// CREATE EVENT — JAVA BACKEND
// =========================================================

document
    .getElementById("createEventPageForm")
    ?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const data =
                new FormData(
                    event.target
                );


            const item = {

                name:
                    data.get("name"),

                description:
                    data.get("description"),

                location:
                    data.get("location"),

                date:
                    data.get("date"),

                time:
                    data.get("time"),

                organizer:
                    orgUser.name ||
                    "Organizer",

                capacity:
                    Number(
                        data.get("capacity")
                    ),

                status:
                    "PENDING"

            };


            console.log(
                "Sending event to Java:",
                item
            );


            try {

                const response =
                    await fetch(
                        API_URL,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(item)
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        "Server error: " +
                        response.status
                    );

                }


                const savedEvent =
                    await response.json();


                console.log(
                    "Event saved in database:",
                    savedEvent
                );


                // =================================================
                // OPTIONAL LOCAL STORAGE
                // =================================================

                const events =
                    JSON.parse(
                        localStorage.getItem(
                            "eventlyEvents"
                        ) || "[]"
                    );


                events.unshift(
                    savedEvent
                );


                localStorage.setItem(
                    "eventlyEvents",
                    JSON.stringify(events)
                );


                localStorage.setItem(
                    "eventlyLatestEvent",
                    JSON.stringify(savedEvent)
                );


                event.target.reset();


                saveMessage(
                    "Event successfully created and saved!"
                );


            } catch (error) {

                console.error(
                    "Error creating event:",
                    error
                );


                saveMessage(
                    "Failed to create event. Check if Java backend is running."
                );

            }

        }
    );


// =========================================================
// TICKET / PRICE
// =========================================================

document
    .getElementById("ticketPageForm")
    ?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const data =
                new FormData(
                    event.target
                );


            const eventId =
                Number(
                    data.get("event")
                );


            try {

                const response =
                    await fetch(
                        `${API_URL}/${eventId}/ticket-tiers`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                name:
                                    data.get("ticket"),

                                price:
                                    Number(
                                        data.get("price")
                                    ),

                                quantity:
                                    Number(
                                        data.get("quantity")
                                    )

                            })

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        await response.text()
                    );

                }


                event.target.reset();


                saveMessage(
                    "Ticket option saved."
                );


            } catch (error) {

                console.error(
                    "Saving ticket tier failed:",
                    error
                );


                saveMessage(
                    "Could not save ticket option. Check the event and available capacity."
                );

            }

        }
    );


// =========================================================
// COMMUNICATION / MESSAGE
// =========================================================

document
    .getElementById("messagePageForm")
    ?.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const data =
                new FormData(
                    event.target
                );


            const eventId =
                Number(
                    data.get("event")
                );


            try {

                const response =
                    await fetch(
                        `${API_URL}/${eventId}/announcements`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                message:
                                    data.get("message")
                            })

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        await response.text()
                    );

                }


                const result =
                    await response.json();


                event.target.reset();


                saveMessage(
                    `Update sent to ${result.recipients} attendee(s).`
                );


            } catch (error) {

                console.error(
                    "Sending event update failed:",
                    error
                );


                saveMessage(
                    "Could not send the event update."
                );

            }

        }
    );


// =========================================================
// MANAGE EVENTS — JAVA BACKEND
// =========================================================

const orgEventList =
    document.getElementById(
        "orgEventList"
    );


if (orgEventList) {

    loadOrganizerEvents();

}


// =========================================================
// LOAD ORGANIZER EVENTS
// =========================================================

async function loadOrganizerEvents() {

    orgEventList.innerHTML = `
        <p>Loading events...</p>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/manage`
            );


        if (!response.ok) {

            throw new Error(
                "Server error: " +
                response.status
            );

        }


        const events =
            await response.json();


        console.log(
            "Events received from Java:",
            events
        );


        // =====================================================
        // NO EVENTS
        // =====================================================

        if (
            !events ||
            events.length === 0
        ) {

            orgEventList.innerHTML = `
                <p>
                    No events created yet.
                </p>
            `;

            return;

        }


        // =====================================================
        // DISPLAY EVENTS
        // =====================================================

        orgEventList.innerHTML =
            events
                .map((event) => {

                    const status =
                        event.status ||
                        "PENDING";


                    // =================================================
                    // STATUS STYLE
                    // =================================================

                    let statusBackground =
                        "#fff7e8";

                    let statusColor =
                        "#c47a00";

                    let statusBorder =
                        "#ffe0a8";


                    if (status === "APPROVED") {

                        statusBackground =
                            "#eee9ff";

                        statusColor =
                            "#6246d8";

                        statusBorder =
                            "#ddd3ff";

                    }


                    if (status === "REJECTED") {

                        statusBackground =
                            "#fff0f0";

                        statusColor =
                            "#d84b4b";

                        statusBorder =
                            "#ffd5d5";

                    }


                    if (status === "PENDING") {

                        statusBackground =
                            "#fff7e8";

                        statusColor =
                            "#c47a00";

                        statusBorder =
                            "#ffe0a8";

                    }


                    return `

                        <div
                            class="org-row"
                            style="
                                display:flex;
                                align-items:center;
                                justify-content:space-between;
                                gap:20px;
                            "
                        >

                            <!-- EVENT DETAILS -->

                            <span
                                style="
                                    display:flex;
                                    flex-direction:column;
                                    gap:6px;
                                    min-width:0;
                                "
                            >

                                <b
                                    style="
                                        font-size:15px;
                                        color:#17162f;
                                    "
                                >
                                    ${event.name || "Untitled event"}
                                </b>


                                <small
                                    style="
                                        color:#77758c;
                                        font-size:12px;
                                    "
                                >
                                    ${event.location || "No location"}
                                    ·
                                    ${event.date || "No date"}
                                    ·
                                    ${event.time || "No time"}
                                </small>

                            </span>


                            <!-- ACTION AREA -->

                            <span
                                style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:flex-end;
                                    gap:9px;
                                    flex-shrink:0;
                                "
                            >

                                <!-- STATUS -->

                                <span
                                    style="
                                        display:inline-flex;
                                        align-items:center;
                                        justify-content:center;
                                        padding:8px 13px;
                                        border-radius:20px;
                                        background:${statusBackground};
                                        color:${statusColor};
                                        border:1px solid ${statusBorder};
                                        font-size:11px;
                                        font-weight:800;
                                        letter-spacing:.3px;
                                        white-space:nowrap;
                                    "
                                >
                                    ${status}
                                </span>


                                <!-- EDIT BUTTON -->

                                <button
                                    type="button"
                                    onclick="editOrganizerEvent(${event.id})"
                                    style="
                                        border:1px solid #ddd3ff;
                                        background:#eee9ff;
                                        color:#6246d8;
                                        padding:8px 15px;
                                        border-radius:9px;
                                        font-size:12px;
                                        font-weight:700;
                                        font-family:inherit;
                                        cursor:pointer;
                                        transition:all .2s ease;
                                        white-space:nowrap;
                                    "
                                    onmouseover="
                                        this.style.background='#6246d8';
                                        this.style.color='#ffffff';
                                        this.style.borderColor='#6246d8';
                                        this.style.transform='translateY(-1px)';
                                        this.style.boxShadow='0 4px 10px rgba(98,70,216,.20)';
                                    "
                                    onmouseout="
                                        this.style.background='#eee9ff';
                                        this.style.color='#6246d8';
                                        this.style.borderColor='#ddd3ff';
                                        this.style.transform='translateY(0)';
                                        this.style.boxShadow='none';
                                    "
                                >
                                    Edit
                                </button>


                                <!-- DELETE BUTTON -->

                                <button
                                    type="button"
                                    onclick="deleteOrganizerEvent(${event.id})"
                                    style="
                                        border:1px solid #ffd5d5;
                                        background:#fff0f0;
                                        color:#d84b4b;
                                        padding:8px 15px;
                                        border-radius:9px;
                                        font-size:12px;
                                        font-weight:700;
                                        font-family:inherit;
                                        cursor:pointer;
                                        transition:all .2s ease;
                                        white-space:nowrap;
                                    "
                                    onmouseover="
                                        this.style.background='#d84b4b';
                                        this.style.color='#ffffff';
                                        this.style.borderColor='#d84b4b';
                                        this.style.transform='translateY(-1px)';
                                        this.style.boxShadow='0 4px 10px rgba(216,75,75,.20)';
                                    "
                                    onmouseout="
                                        this.style.background='#fff0f0';
                                        this.style.color='#d84b4b';
                                        this.style.borderColor='#ffd5d5';
                                        this.style.transform='translateY(0)';
                                        this.style.boxShadow='none';
                                    "
                                >
                                    Delete
                                </button>

                            </span>

                        </div>

                    `;

                })
                .join("");


    } catch (error) {

        console.error(
            "Error loading events:",
            error
        );


        orgEventList.innerHTML = `

            <p>
                Failed to load events.
                Please check if Java backend is running.
            </p>

        `;

    }

}


// =========================================================
// EDIT EVENT
// =========================================================

async function editOrganizerEvent(eventId) {

    try {

        // =====================================================
        // GET CURRENT EVENT
        // =====================================================

        const getResponse =
            await fetch(
                `${API_URL}/${eventId}`
            );


        if (!getResponse.ok) {

            throw new Error(
                "Unable to load event: " +
                getResponse.status
            );

        }


        const currentEvent =
            await getResponse.json();


        // =====================================================
        // GET UPDATED VALUES
        // =====================================================

        const name =
            prompt(
                "Enter event name:",
                currentEvent.name || ""
            );


        if (name === null) {
            return;
        }


        const description =
            prompt(
                "Enter event description:",
                currentEvent.description || ""
            );


        if (description === null) {
            return;
        }


        const location =
            prompt(
                "Enter event location:",
                currentEvent.location || ""
            );


        if (location === null) {
            return;
        }


        const date =
            prompt(
                "Enter event date (YYYY-MM-DD):",
                currentEvent.date || ""
            );


        if (date === null) {
            return;
        }


        const time =
            prompt(
                "Enter event time:",
                currentEvent.time || ""
            );


        if (time === null) {
            return;
        }


        const capacityInput =
            prompt(
                "Enter event capacity:",
                currentEvent.capacity || ""
            );


        if (capacityInput === null) {
            return;
        }


        const capacity =
            Number(
                capacityInput
            );


        if (
            !capacity ||
            capacity <= 0
        ) {

            alert(
                "Please enter a valid capacity."
            );

            return;

        }


        // =====================================================
        // UPDATED EVENT
        // =====================================================

        const updatedEvent = {

            name:
                name,

            description:
                description,

            location:
                location,

            date:
                date,

            time:
                time,

            capacity:
                capacity,

            organizer:
                currentEvent.organizer ||
                orgUser.name ||
                "Organizer",

            status:
                currentEvent.status ||
                "PENDING"

        };


        console.log(
            "Updating event:",
            updatedEvent
        );


        // =====================================================
        // UPDATE EVENT — PUT
        // =====================================================

        const response =
            await fetch(
                `${API_URL}/${eventId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            updatedEvent
                        )
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Update failed (${response.status}): ${errorText}`
            );

        }


        const savedEvent =
            await response.json();


        console.log(
            "Event updated:",
            savedEvent
        );


        alert(
            "Event updated successfully!"
        );


        // =====================================================
        // RELOAD EVENT LIST
        // =====================================================

        loadOrganizerEvents();


    } catch (error) {

        console.error(
            "Error updating event:",
            error
        );


        alert(
            "Failed to update event.\n\n" +
            error.message
        );

    }

}


// =========================================================
// DELETE EVENT
// =========================================================

async function deleteOrganizerEvent(eventId) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this event?"
        );


    if (!confirmDelete) {
        return;
    }


    try {

        console.log(
            "Deleting event:",
            eventId
        );


        const response =
            await fetch(
                `${API_URL}/${eventId}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Delete failed (${response.status}): ${errorText}`
            );

        }


        console.log(
            "Event deleted successfully"
        );


        alert(
            "Event deleted successfully!"
        );


        // =====================================================
        // RELOAD EVENT LIST
        // =====================================================

        loadOrganizerEvents();


    } catch (error) {

        console.error(
            "Error deleting event:",
            error
        );


        alert(
            "Failed to delete event.\n\n" +
            error.message
        );

    }

}


// =========================================================
// RUPEE FORMATTER
// =========================================================

const formatRupees = (amount) => {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(
        Number(amount) || 0
    );

};
