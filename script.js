const API_BASE = window.FLOODNOW_API_BASE || "http://localhost:3000/api";
const FALLBACK_LOCATIONS = [
    { name: "Dargamitta", latitude: 14.444, longitude: 79.966, severity: "LOW" },
    { name: "Balaji Nagar", latitude: 14.456, longitude: 79.979, severity: "MODERATE" },
    { name: "Ramji Nagar", latitude: 14.432, longitude: 79.982, severity: "HIGH" },
    { name: "Vedayapalem", latitude: 14.425, longitude: 79.975, severity: "CRITICAL" }
];

async function getApi(path) {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return (await response.json()).data;
}

function formatDate(value) {
    return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function severityClass(severity) {
    return String(severity).toLowerCase();
}

function updateClock() {
    document.querySelectorAll("[data-clock]").forEach((element) => {
        element.textContent = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
    });
}

function renderMap(locations) {
    const cityMaps = document.querySelectorAll("[data-city-map]");
    if (!window.L || !cityMaps.length) return;
    cityMaps.forEach((container) => {
        const map = L.map(container).setView([14.4425987, 79.986456], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
        const markers = locations.map((location) => {
            const marker = L.marker([location.latitude, location.longitude], { icon: L.divIcon({ className: "risk-marker", html: `<span class="map-label risk-${severityClass(location.severity)}">${location.name} &bull; ${location.severity}</span>`, iconSize: null }) }).addTo(map);
            return { marker, location };
        });
        container._riskMarkers = markers;
    });
    const search = document.querySelector("[data-map-search]");
    if (search) search.addEventListener("input", () => {
        const query = search.value.toLowerCase().trim();
        cityMaps.forEach((container) => (container._riskMarkers || []).forEach(({ marker, location }) => marker.setOpacity(query === "" || `${location.name} ${location.severity}`.toLowerCase().includes(query) ? 1 : 0)));
    });
}

function renderDashboard(data) {
    const stats = document.querySelectorAll(".stats .stat .value");
    const current = data.measurements[0];
    if (stats[0]) stats[0].textContent = `${current?.rainfall ?? 0} mm/hr`;
    if (stats[1]) stats[1].textContent = `${current?.drainageCapacity ?? 0} mm/hr`;
    if (stats[2]) stats[2].textContent = `${current?.waterLevel ?? 0}%`;
    if (stats[3]) { stats[3].textContent = current?.severity || "LOW"; stats[3].className = `value badge ${severityClass(current?.severity || "LOW")}`; }
    const alertBox = document.querySelector(".layout > div:nth-child(2) .card");
    if (alertBox) {
        const alertMarkup = data.alerts.slice(0, 2).map((alert) => `<div class="alert ${severityClass(alert.severity)}"><strong>${alert.title}</strong><br>${alert.description}</div>`).join("");
        alertBox.innerHTML = `<h3>Critical alerts</h3>${alertMarkup || "<p class=\"muted\">No active alerts.</p>"}<a class="btn" href="alerts.html">View all alerts</a>`;
    }
    renderMap(data.locations.map((location) => ({ ...location, severity: data.measurements.find((measurement) => measurement.locationId === location.id)?.severity || "LOW" })));
    document.querySelector(".notice")?.replaceChildren(document.createTextNode(`System operational • Last updated ${formatDate(data.lastUpdated)} • ${data.criticalAlerts} critical alert(s)`));
}

function renderAlerts(alerts) {
    const main = document.querySelector("main");
    const policy = main?.querySelector(".card:last-child");
    if (!main || !policy) return;
    main.querySelectorAll(".alert").forEach((element) => element.remove());
    alerts.reverse().forEach((alert) => {
        const element = document.createElement("div");
        element.className = `alert ${severityClass(alert.severity)}`;
        element.innerHTML = `<strong>${alert.severity} — ${alert.location.name}</strong><p>${alert.description}</p><button class="btn secondary">Acknowledge</button>`;
        policy.before(element);
    });
}

function renderHistory(alerts) {
    const rows = document.querySelectorAll(".table tr");
    alerts.forEach((alert, index) => {
        const row = rows[index + 1];
        if (!row) return;
        row.innerHTML = `<td>${formatDate(alert.issuedAt)}</td><td>${alert.location.name}</td><td>${alert.waterLevel}% water level</td><td>${alert.waterLevel}%</td><td><span class="badge ${severityClass(alert.severity)}">${alert.severity}</span></td>`;
    });
}

function renderAnalytics(data) {
    const charts = document.querySelectorAll(".chart");
    const measurements = data.measurements.slice().reverse();
    const rainfall = measurements.map((measurement) => measurement.rainfall);
    const utilization = measurements.map((measurement) => measurement.drainageCapacity);
    [rainfall, utilization].forEach((values, chartIndex) => {
        if (!charts[chartIndex] || !values.length) {
            return;
        }
        const maximum = Math.max(...values, 1);
        charts[chartIndex].innerHTML = values.map((value) => `<div class="barcol" style="height: ${Math.max(12, value / maximum * 95)}%"><small>${value}${chartIndex ? "%" : ""}</small></div>`).join("");
    });
    const timeline = document.querySelector(".timeline");
    if (timeline && data.nowcasts.length) timeline.innerHTML = data.nowcasts.slice(0, 4).map((forecast) => `<div class="timebox">${Math.round((new Date(forecast.forecastTime) - Date.now()) / 60000)} min<strong>${forecast.severity}</strong><span>${forecast.rainfall} mm/hr</span></div>`).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
    updateClock();
    setInterval(updateClock, 1000);
    const page = document.body.dataset.apiPage;
    document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", () => { button.textContent = "Updated just now"; setTimeout(() => { button.textContent = "Refresh data"; }, 1800); }));
    document.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
        if (button.dataset.refresh !== undefined || button.dataset.menu !== undefined) {
            return;
        }
        const original = button.textContent;
        button.textContent = original === "Acknowledge" ? "Acknowledged" : "Completed ✓";
        button.classList.add("action-done");
        setTimeout(() => { button.textContent = original; button.classList.remove("action-done"); }, 2200);
    }));
    const menuButton = document.querySelector("[data-menu]");
    const navlinks = document.querySelector(".navlinks");
    if (menuButton && navlinks) menuButton.addEventListener("click", () => { const open = navlinks.classList.toggle("open"); menuButton.setAttribute("aria-expanded", String(open)); });
    try {
        if (page === "dashboard") renderDashboard(await getApi("/dashboard"));
        if (page === "map") { const data = await getApi("/dashboard"); renderMap(data.locations.map((location) => ({ ...location, severity: data.measurements.find((measurement) => measurement.locationId === location.id)?.severity || "LOW" }))); }
        if (page === "analytics") renderAnalytics(await getApi("/dashboard"));
        if (page === "alerts") renderAlerts(await getApi("/alerts/current"));
        if (page === "history") renderHistory(await getApi("/alerts/history"));
    } catch (error) {
        console.warn("FloodNow API unavailable; showing demo fallback.", error);
        if (page === "dashboard" || page === "map") renderMap(FALLBACK_LOCATIONS);
    }
});
