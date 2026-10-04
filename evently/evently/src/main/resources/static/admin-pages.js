// ========================================================
// EVENTLY ADMIN PAGES
// ========================================================

// Spring Boot backend
const API_BASE = window.EVENTLY_API_BASE;


// ========================================================
// PAGE LOAD
// ========================================================

document.addEventListener("DOMContentLoaded", function () {

    // User Management page
    if (document.getElementById("userTable")) {
        loadUsers();
    }

    // Event Approvals page
    if (document.getElementById("approvalList")) {
        loadPendingEvents();
    }

    // Statistics
    if (document.getElementById("totalEvents")) {
        loadStatistics();
    }

    // User form
    if (document.getElementById("userEditor")) {
        setupUserForm();
    }

    // Activity filter
    if (document.getElementById("activityFilter")) {
        setupActivityFilter();
    }

    if (document.getElementById("activityLog")) {
        loadActivities();
    }

    // Settings
    if (document.getElementById("settingsForm")) {
        setupSettings();
    }

    if (document.getElementById("reportStatistics")) {
        loadReportStatistics();
    }

    // Logout
    setupLogout();

});


// ========================================================
// USER MANAGEMENT
// ========================================================


// --------------------------------------------------------
// LOAD USERS
// --------------------------------------------------------

async function loadUsers() {

    const table = document.getElementById("userTable");

    if (!table) {
        return;
    }

    try {

        const response = await fetch(
            API_BASE + "/api/users"
        );

        if (!response.ok) {
            throw new Error("Unable to load users");
        }

        const users = await response.json();

        table.innerHTML = "";


        // No users
        if (users.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="4">
                        No users found.
                    </td>
                </tr>
            `;

            return;
        }


        // Display users
        users.forEach(function (user) {

            const row = document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${escapeHtml(user.name)}

                    <small>
                        ${escapeHtml(user.email)}
                    </small>
                </td>


                <td>

                    <select
                        class="role-select"
                        onchange="
                            updateUserRole(
                                ${user.id},
                                this.value
                            )
                        "
                    >

                        <option
                            value="ADMIN"
                            ${user.role === "ADMIN" ? "selected" : ""}
                        >
                            ADMIN
                        </option>

                        <option
                            value="ORGANIZER"
                            ${user.role === "ORGANIZER" ? "selected" : ""}
                        >
                            ORGANIZER
                        </option>

                        <option
                            value="ATTENDEE"
                            ${user.role === "ATTENDEE" ? "selected" : ""}
                        >
                            ATTENDEE
                        </option>

                    </select>

                </td>


                <td>

                    <span class="status active-status">
                        ${escapeHtml(user.status || "Active")}
                    </span>

                </td>


                <td>

                    <button
                        class="table-action edit-user"
                        onclick="
                            editUser(
                                ${user.id},
                                '${escapeHtml(user.name)}',
                                '${escapeHtml(user.email)}',
                                '${user.role}'
                            )
                        "
                    >
                        Edit
                    </button>


                    <button
                        class="table-action delete-user"
                        onclick="
                            deleteUser(${user.id})
                        "
                    >
                        Delete
                    </button>

                </td>

            `;

            table.appendChild(row);

        });

    }
    catch (error) {

        console.error(
            "Load users error:",
            error
        );

        table.innerHTML = `
            <tr>
                <td colspan="4">
                    Failed to load users.
                    Please check if Java backend is running.
                </td>
            </tr>
        `;

    }

}


// ========================================================
// USER FORM
// ========================================================

function setupUserForm() {

    const form =
        document.getElementById("userEditor");

    if (!form) {
        return;
    }


    // ----------------------------------------------------
    // ADD USER BUTTON
    // ----------------------------------------------------

    const addButton =
        document.getElementById("addUserButton");

    if (addButton) {

        addButton.addEventListener(
            "click",
            function () {

                form.style.display = "block";

                document.getElementById(
                    "editorTitle"
                ).textContent = "Add user";

                document.getElementById(
                    "userEditIndex"
                ).value = "";

                document.getElementById(
                    "userName"
                ).value = "";

                document.getElementById(
                    "userEmail"
                ).value = "";

                document.getElementById(
                    "userRole"
                ).value = "ATTENDEE";

                document.getElementById("userPassword").value = "";
                document.getElementById("userPassword").required = true;
                document.getElementById("userPasswordLabel").style.display = "";
                document.getElementById("userPasswordLabel").firstChild.textContent = "Initial password";

            }
        );

    }


    // ----------------------------------------------------
    // CLOSE USER FORM
    // ----------------------------------------------------

    const closeButton =
        document.getElementById("closeEditor");

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                form.style.display = "none";

            }
        );

    }


    // ----------------------------------------------------
    // SAVE USER
    // ----------------------------------------------------

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const id =
                document.getElementById(
                    "userEditIndex"
                ).value;


            const name =
                document.getElementById(
                    "userName"
                ).value.trim();


            const email =
                document.getElementById(
                    "userEmail"
                ).value.trim();


            const role =
                document.getElementById(
                    "userRole"
                ).value;


            const userData = {

                name: name,

                email: email,

                role: role

            };

            const passwordInput = document.getElementById("userPassword");
            if (id) {
                passwordInput.required = false;
                if (passwordInput.value) userData.password = passwordInput.value;
            } else {
                userData.password = passwordInput.value;
            }


            try {

                let response;


                // UPDATE USER
                if (id) {

                    response = await fetch(
                        API_BASE +
                        "/api/users/" +
                        id,
                        {

                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    userData
                                )

                        }
                    );

                }


                // CREATE USER
                else {

                    response = await fetch(
                        API_BASE +
                        "/api/users",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    userData
                                )

                        }
                    );

                }


                if (!response.ok) {

                    throw new Error(
                        "User save failed"
                    );

                }


                showUserMessage(
                    "User saved successfully."
                );


                form.style.display = "none";


                loadUsers();

            }
            catch (error) {

                console.error(
                    "Save user error:",
                    error
                );

                showUserMessage(
                    "Failed to save user. Check Java backend."
                );

            }

        }
    );

}


// ========================================================
// EDIT USER
// ========================================================

function editUser(
    id,
    name,
    email,
    role
) {

    const form =
        document.getElementById("userEditor");

    if (!form) {
        return;
    }


    form.style.display = "block";


    document.getElementById(
        "editorTitle"
    ).textContent = "Edit user";


    document.getElementById(
        "userEditIndex"
    ).value = id;


    document.getElementById(
        "userName"
    ).value = name;


    document.getElementById(
        "userEmail"
    ).value = email;


    document.getElementById(
        "userRole"
    ).value = role;

    document.getElementById("userPassword").value = "";
    document.getElementById("userPassword").required = false;
    document.getElementById("userPasswordLabel").style.display = "";
    document.getElementById("userPasswordLabel").firstChild.textContent = "New password (optional)";

}


// ========================================================
// DELETE USER
// ========================================================

async function deleteUser(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this user?"
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            API_BASE +
            "/api/users/" +
            id,
            {
                method: "DELETE"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Delete failed"
            );

        }


        showUserMessage(
            "User deleted successfully."
        );


        loadUsers();

    }
    catch (error) {

        console.error(
            "Delete user error:",
            error
        );

        showUserMessage(
            "Failed to delete user."
        );

    }

}


// ========================================================
// UPDATE USER ROLE
// ========================================================

async function updateUserRole(
    id,
    role
) {

    try {

        const response = await fetch(
            API_BASE +
            "/api/users/" +
            id +
            "/role",
            {

                method: "PUT",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    role: role
                })

            }
        );


        if (!response.ok) {

            throw new Error(
                "Role update failed"
            );

        }


        showUserMessage(
            "User role updated."
        );

    }
    catch (error) {

        console.error(
            "Role update error:",
            error
        );

        showUserMessage(
            "Failed to update role."
        );

    }

}


// ========================================================
// USER MESSAGE
// ========================================================

function showUserMessage(message) {

    const element =
        document.getElementById(
            "userConfirmation"
        );

    if (!element) {
        return;
    }


    element.textContent = message;


    setTimeout(
        function () {

            element.textContent = "";

        },
        3000
    );

}


// ========================================================
// EVENT APPROVALS
// ========================================================


// --------------------------------------------------------
// LOAD PENDING EVENTS
// --------------------------------------------------------

async function loadPendingEvents() {

    const container =
        document.getElementById(
            "approvalList"
        );

    if (!container) {
        return;
    }


    try {

        const response = await fetch(
            API_BASE +
            "/api/events/pending"
        );


        if (!response.ok) {

            throw new Error(
                "Events loading failed"
            );

        }


        const events =
            await response.json();


        container.innerHTML = "";


        // Pending count
        const pendingCount =
            document.getElementById(
                "pendingCount"
            );

        if (pendingCount) {

            pendingCount.textContent =
                events.length +
                " pending";

        }


        // No pending events
        if (events.length === 0) {

            container.innerHTML = `
                <p>
                    No pending events.
                </p>
            `;

            return;
        }


        // Display events
        events.forEach(
            function (event) {

                const article =
                    document.createElement(
                        "article"
                    );


                article.className =
                    "approval-item";


                article.innerHTML = `

                    <div>

                        <strong>
                            ${escapeHtml(
                                event.name ||
                                "Unnamed Event"
                            )}
                        </strong>


                        <small>
                            Submitted by
                            ${escapeHtml(
                                event.organizer ||
                                "Unknown"
                            )}
                            ·
                            ${escapeHtml(
                                event.date ||
                                "Date not available"
                            )}
                            ·
                            ${escapeHtml(
                                event.time ||
                                "Time not available"
                            )}
                        </small>


                        <small>
                            Location:
                            ${escapeHtml(
                                event.location ||
                                "Not specified"
                            )}
                        </small>

                    </div>


                    <div class="approval-actions">

                        <button
                            class="view-details"
                            onclick="
                                viewEventDetails(
                                    ${event.id},
                                    '${escapeHtml(
                                        event.description ||
                                        ""
                                    )}'
                                )
                            "
                        >
                            View details
                        </button>


                        <button
                            class="approve-event"
                            onclick="
                                approveEvent(
                                    ${event.id}
                                )
                            "
                        >
                            Approve
                        </button>


                        <button
                            class="reject-event"
                            onclick="
                                rejectEvent(
                                    ${event.id}
                                )
                            "
                        >
                            Reject
                        </button>

                    </div>

                `;


                container.appendChild(
                    article
                );

            }
        );

    }
    catch (error) {

        console.error(
            "Load events error:",
            error
        );


        container.innerHTML = `
            <p>
                Failed to load events.
                Please check if Java backend is running.
            </p>
        `;

    }

}


// ========================================================
// VIEW EVENT DETAILS
// ========================================================

function viewEventDetails(
    id,
    description
) {

    alert(
        "Event ID: " +
        id +
        "\n\n" +
        description
    );

}


// ========================================================
// APPROVE EVENT
// ========================================================

async function approveEvent(id) {

    const confirmed = confirm(
        "Approve this event?"
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            API_BASE +
            "/api/events/" +
            id +
            "/approve",
            {
                method: "PUT"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Approval failed"
            );

        }


        alert(
            "Event approved successfully."
        );


        loadPendingEvents();

    }
    catch (error) {

        console.error(
            "Approve event error:",
            error
        );

        alert(
            "Failed to approve event."
        );

    }

}


// ========================================================
// REJECT EVENT
// ========================================================

async function rejectEvent(id) {

    const confirmed = confirm(
        "Reject this event?"
    );

    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            API_BASE +
            "/api/events/" +
            id +
            "/reject",
            {
                method: "PUT"
            }
        );


        if (!response.ok) {

            throw new Error(
                "Rejection failed"
            );

        }


        alert(
            "Event rejected."
        );


        loadPendingEvents();

    }
    catch (error) {

        console.error(
            "Reject event error:",
            error
        );

        alert(
            "Failed to reject event."
        );

    }

}


// ========================================================
// STATISTICS
// ========================================================

async function loadStatistics() {

    try {

        const response = await fetch(
            API_BASE +
            "/api/admin/statistics"
        );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        const totalEvents =
            document.getElementById(
                "totalEvents"
            );

        const activeHosts =
            document.getElementById(
                "activeHosts"
            );

        const totalAttendees =
            document.getElementById(
                "totalAttendees"
            );


        if (totalEvents) {

            totalEvents.textContent =
                data.totalEvents || 0;

        }


        if (activeHosts) {

            activeHosts.textContent =
                data.activeHosts || 0;

        }


        if (totalAttendees) {

            totalAttendees.textContent =
                data.totalAttendees || 0;

        }

    }
    catch (error) {

        console.log(
            "Statistics API not available."
        );

    }

}


// ========================================================
// SETTINGS
// ========================================================

function setupSettings() {
    fetch(API_BASE + "/api/admin/settings")
        .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then((settings) => {
            document.getElementById("settingsPlatform").value = settings.platformName || "Evently";
            document.getElementById("settingsStatus").value = settings.defaultStatus || "Pending review";
            document.getElementById("settingsNotifications").checked = Boolean(settings.notifications);
        })
        .catch((error) => console.error("Unable to load admin settings:", error));
}


// ========================================================
// SAVE SETTINGS
// ========================================================

async function saveSettings() {

    console.log("SAVE SETTINGS FUNCTION STARTED");

    const confirmation =
        document.getElementById("settingsConfirmation");

    if (!confirmation) {
        console.error("settingsConfirmation not found");
        return;
    }

    const platformInput =
        document.getElementById("settingsPlatform");

    const statusInput =
        document.getElementById("settingsStatus");

    const notificationInput =
        document.getElementById("settingsNotifications");

    if (!platformInput || !statusInput || !notificationInput) {
        console.error("Settings input not found");
        return;
    }

    const settings = {
        platformName: platformInput.value.trim(),
        defaultStatus: statusInput.value,
        notifications: notificationInput.checked
    };

    console.log("Settings:", settings);

    // Clear previous message
    confirmation.textContent = "";
    confirmation.style.display = "none";

    try {

        const response = await fetch(
            API_BASE + "/api/admin/settings",
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(settings)
            }
        );

        console.log("Response status:", response.status);

        if (!response.ok) {
            throw new Error(
                "Server returned " + response.status
            );
        }

        // SUCCESS MESSAGE
        confirmation.textContent =
            "Settings saved successfully.";

        confirmation.style.display = "block";
        confirmation.style.color = "green";
        confirmation.style.background = "#e8f8ef";

        console.log(
            "Settings saved successfully."
        );

    } catch (error) {

        console.error(
            "Settings error:",
            error
        );

        // ERROR MESSAGE
        confirmation.textContent =
            "Failed to save settings.";

        confirmation.style.display = "block";
        confirmation.style.color = "red";
        confirmation.style.background = "#fdecec";
    }
}
// ========================================================
// LOGOUT
// ========================================================

async function loadActivities() {

    const activityLog =
        document.getElementById("activityLog");

    if (!activityLog) {
        return;
    }

    try {

        const response = await fetch(
            API_BASE + "/api/admin/activity"
        );

        if (!response.ok) {
            throw new Error(
                "Activity loading failed: " +
                response.status
            );
        }

        const activities =
            await response.json();

        activityLog.innerHTML = "";

        // ============================================
        // NO ACTIVITY
        // ============================================

        if (
            !activities ||
            activities.length === 0
        ) {

            activityLog.innerHTML = `
                <li>
                    <span>
                        <b>No activity yet</b>
                        <small>
                            No activities found in database.
                        </small>
                    </span>
                </li>
            `;

            return;
        }


        // ============================================
        // DISPLAY ACTIVITIES
        // ============================================

        activities.forEach(function (activity) {

            const li =
                document.createElement("li");


            // Activity type
            const activityType =
                activity.activityType || "ALL";


            li.setAttribute(
                "data-activity",
                activityType
            );


            // ========================================
            // ACTIVITY DOT
            // ========================================

            let dotClass = "activity-dot";

            if (activityType === "EVENT_CREATED") {
                dotClass += " coral-dot";
            }

            else if (
                activityType === "TICKET_PURCHASED"
            ) {
                dotClass += " yellow-dot";
            }

            else if (
                activityType === "EVENT_APPROVED"
            ) {
                dotClass += " green-dot";
            }

            else if (
                activityType === "EVENT_REJECTED"
            ) {
                dotClass += " coral-dot";
            }

            else if (
                activityType === "SETTINGS_CHANGED"
            ) {
                dotClass += " purple-dot";
            }


            // ========================================
            // ACTIVITY HTML
            // ========================================

            li.innerHTML = `
                <span class="${dotClass}"></span>

                <span>

                    <b>
                        ${escapeHtml(
                            activity.title ||
                            activity.activityType ||
                            "Activity"
                        )}
                    </b>

                    <small>
                        ${escapeHtml(
                            activity.description || ""
                        )}
                    </small>

                    <small>
                        ${escapeHtml(
                            activity.username ||
                            "System"
                        )}

                        ${
                            activity.createdAt
                                ? " · " +
                                  escapeHtml(
                                      activity.createdAt
                                  )
                                : ""
                        }
                    </small>

                </span>
            `;


            activityLog.appendChild(li);

        });


        // ============================================
        // SETUP FILTER
        // ============================================

        setupActivityFilter();


        // ============================================
        // APPLY CURRENT FILTER
        // ============================================

        const filter =
            document.getElementById(
                "activityFilter"
            );

        if (filter) {

            const selectedType =
                filter.value;

            const activityItems =
                document.querySelectorAll(
                    "#activityLog li"
                );

            let visible = 0;

            activityItems.forEach(
                function (item) {

                    const type =
                        item.dataset.activity;

                    if (
                        selectedType === "ALL" ||
                        type === selectedType
                    ) {

                        item.style.display = "";
                        visible++;

                    } else {

                        item.style.display = "none";

                    }

                }
            );


            const emptyActivity =
                document.getElementById(
                    "emptyActivity"
                );

            if (emptyActivity) {

                emptyActivity.style.display =
                    visible === 0
                        ? "block"
                        : "none";
            }
        }


    } catch (error) {

        console.error(
            "Activity loading error:",
            error
        );

        activityLog.innerHTML = `
            <li>
                <span>
                    <b>
                        Failed to load activity
                    </b>

                    <small>
                        Check if Java backend is running.
                    </small>
                </span>
            </li>
        `;
    }
}

function setupActivityFilter() {

    const filter = document.getElementById("activityFilter");

    if (!filter) return;

    if (filter.dataset.filterBound === "true") return;

    filter.dataset.filterBound = "true";

    filter.addEventListener("change", function () {

        const selectedType = filter.value;

        const activities =
            document.querySelectorAll("#activityLog li");

        let visible = 0;

        activities.forEach(function (item) {

            const activityType =
                item.dataset.activity;

            if (
                selectedType === "ALL" ||
                activityType === selectedType
            ) {

                item.style.display = "";
                visible++;

            } else {

                item.style.display = "none";

            }

        });

        const emptyActivity =
            document.getElementById("emptyActivity");

        if (emptyActivity) {

            emptyActivity.style.display =
                visible === 0 ? "block" : "none";
        }

    });
}

function setupLogout() {

    const logout =
        document.querySelector(
            "[data-logout]"
        );

    if (!logout) {
        return;
    }


    logout.addEventListener(
        "click",
        function () {

            localStorage.clear();

            sessionStorage.clear();

        }
    );

}


// ========================================================
// REPORTS
// ========================================================

async function loadReportStatistics() {
    try {
        const response = await fetch(API_BASE + "/api/admin/statistics");
        if (!response.ok) {
            throw new Error("Statistics request failed");
        }

        const data = await response.json();
        document.getElementById("reportApprovedEvents").textContent = data.approvedEvents ?? 0;
        document.getElementById("reportTicketsSold").textContent = data.ticketsSold ?? 0;
        document.getElementById("reportBookings").textContent = data.totalBookings ?? 0;
        document.getElementById("reportAttendees").textContent = data.uniqueAttendees ?? 0;
        document.getElementById("reportBookingValue").textContent =
            "₹" + Number(data.bookingValue ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (error) {
        console.error("Failed to load report statistics:", error);
        document.querySelectorAll("#reportStatistics strong").forEach(value => {
            value.textContent = "Unavailable";
        });
    }
}


// USERS REPORT

async function downloadUsersReport() {
    await downloadAdminReport("/api/admin/reports/users", "evently-users.csv");
}


// EVENTS REPORT

async function downloadEventsReport() {
    await downloadAdminReport("/api/admin/reports/events", "evently-events.csv");
}

async function downloadAdminReport(path, filename) {
    try {
        const response = await fetch(API_BASE + path);
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Report request failed (${response.status})`);
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
        console.error("Failed to download report:", error);
        alert("Report download failed. Please sign in as an admin and try again.");
    }
}


// ========================================================
// HTML ESCAPE
// ========================================================

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}
