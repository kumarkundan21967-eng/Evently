(() => {
    if (window.eventlyApiClientInstalled) return;
    window.eventlyApiClientInstalled = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
        const rawUrl = typeof input === "string" ? input : input.url;
        let target;
        try { target = new URL(rawUrl, window.location.href); } catch { return nativeFetch(input, init); }
        if (target.origin !== "http://localhost:8080") return nativeFetch(input, init);

        let user = null;
        try {
            user = JSON.parse(sessionStorage.getItem("eventlySession") || "null")
                || JSON.parse(localStorage.getItem("eventlyUser") || "null");
        } catch { /* Ignore malformed browser session data. */ }
        const token = user?.accessToken;
        if (!token) return nativeFetch(input, init);

        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));
        headers.set("Authorization", `Bearer ${token}`);
        return nativeFetch(input, { ...init, headers });
    };

    document.addEventListener("click", (event) => {
        const link = event.target.closest?.("[data-logout]");
        if (!link) return;
        event.preventDefault();
        let user = null;
        try { user = JSON.parse(sessionStorage.getItem("eventlySession") || "null"); } catch { }
        const token = user?.accessToken;
        const finish = () => {
            sessionStorage.removeItem("eventlySession");
            localStorage.removeItem("eventlyUser");
            window.location.href = link.href;
        };
        if (!token) return finish();
        nativeFetch("http://localhost:8080/api/auth/logout", {
            method: "POST", headers: { Authorization: `Bearer ${token}` }
        }).finally(finish);
    }, true);
})();
