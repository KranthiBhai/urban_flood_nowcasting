const API_BASE = window.FLOODNOW_API_BASE || "http://localhost:3000/api";
if (document.body?.dataset.apiPage) {
    document.body.classList.add("api-loading");
}
const FALLBACK_LOCATIONS = [
    { name: "Dargamitta", latitude: 14.444, longitude: 79.966, severity: "LOW" },
    { name: "Balaji Nagar", latitude: 14.456, longitude: 79.979, severity: "MODERATE" },
    { name: "Ramji Nagar", latitude: 14.432, longitude: 79.982, severity: "HIGH" },
    { name: "Vedayapalem", latitude: 14.425, longitude: 79.975, severity: "CRITICAL" },
    { name: "Gandhi Nagar", latitude: 14.467, longitude: 79.989, severity: "MODERATE" },
    { name: "Santhapet", latitude: 14.438, longitude: 79.975, severity: "HIGH" },
    { name: "Old City", latitude: 14.451, longitude: 79.992, severity: "HIGH" },
    { name: "Markapur Road", latitude: 14.417, longitude: 79.971, severity: "LOW" },
    { name: "Gopalapuram", latitude: 14.476, longitude: 79.972, severity: "LOW" },
    { name: "Rajupalem", latitude: 14.409, longitude: 79.986, severity: "CRITICAL" }
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

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function getInfrastructureRows() {
    return [...document.querySelectorAll(".admin-infrastructure-card .table tr")].map((row) =>
        [...row.querySelectorAll("th, td")].map((cell) => cell.textContent.trim()),
    );
}

function escapeCsv(value) {
    return `"${String(value).replaceAll('"', '""')}"`;
}

function createCsvReport(rows) {
    const generatedAt = new Date().toLocaleString("en-IN");
    return [["FloodNow AI infrastructure report"], [`Generated: ${generatedAt}`], [], ...rows]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\r\n");
}

function escapePdfText(value) {
    return String(value).replace(/[^\x20-\x7E]/g, "?").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function createPdfReport(rows) {
    const lines = ["FloodNow AI infrastructure report", `Generated: ${new Date().toLocaleString("en-IN")}`, "", ...rows.map((row) => row.join(" | "))];
    const textCommands = ["BT", "/F1 11 Tf", "50 750 Td", ...lines.map((line, index) => `${index ? "0 -18 Td " : ""}(${escapePdfText(line)}) Tj`), "ET"].join("\n");
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${textCommands.length} >>\nstream\n${textCommands}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return pdf;
}

function setupExports() {
    document.querySelectorAll("[data-export]").forEach((button) => button.addEventListener("click", () => {
        const rows = getInfrastructureRows();
        if (button.dataset.export === "csv") {
            downloadFile(createCsvReport(rows), "floodnow-infrastructure-report.csv", "text/csv;charset=utf-8");
        } else {
            downloadFile(createPdfReport(rows), "floodnow-infrastructure-report.pdf", "application/pdf");
        }
        button.textContent = "Downloaded";
        setTimeout(() => { button.textContent = button.dataset.export === "csv" ? "Export CSV" : "Export PDF"; }, 1800);
    }));
}

function findLatestMeasurement(locationId, measurements) {
    return (measurements || []).filter((measurement) => measurement.locationId === locationId).sort((a, b) => new Date(b.measurementTime) - new Date(a.measurementTime))[0] || null;
}

function updateSelectionCard(location, measurement) {
    const card = document.querySelector(".selection-card");
    if (!card) return;

    const label = measurement?.severity || location?.severity || "LOW";
    const rainfall = measurement?.rainfall ?? 0;
    const capacity = measurement?.drainageCapacity ?? 0;
    const waterLevel = measurement?.waterLevel ?? 0;

    const title = card.querySelector(".selection-header h4");
    const subtitle = card.querySelector(".selection-subtitle");
    const rows = card.querySelectorAll(".selection-row strong");
    const forecast = card.querySelector(".forecast-pill");

    if (title) title.textContent = location?.name ? location.name : "Node D-14";
    if (subtitle) subtitle.textContent = location?.name ? `${location.name} drainage node` : "Selected drainage node";

    if (rows.length >= 3) {
        rows[0].textContent = `${rainfall} mm/hr`;
        rows[1].textContent = `${capacity} mm/hr`;
        rows[2].textContent = `${waterLevel}%`;
    }

    if (forecast) {
        forecast.textContent = label;
        forecast.className = `forecast-pill ${severityClass(label)}`;
    }
}

function renderMap(locations, measurements = []) {
    const cityMaps = document.querySelectorAll("[data-city-map]");
    if (!window.L || !cityMaps.length) return;
    cityMaps.forEach((container) => {
        const map = L.map(container).setView([14.4425987, 79.986456], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
        const markers = locations.map((location) => {
            const measurement = findLatestMeasurement(location.id, measurements);
            const severity = measurement?.severity || location.severity || "LOW";
            const marker = L.marker([location.latitude, location.longitude], {
                icon: L.divIcon({
                    className: "risk-marker",
                    html: `<span class="map-label risk-${severityClass(severity)}" data-location-name="${location.name}">${location.name} &bull; ${severity}</span>`,
                    iconSize: null,
                }),
            }).addTo(map);

            marker.on("click", () => {
                updateSelectionCard(location, measurement || { rainfall: 0, drainageCapacity: 0, waterLevel: 0, severity });
            });

            return { marker, location, measurement, severity };
        });
        container._riskMarkers = markers;
    });
    const search = document.querySelector("[data-map-search]");
    if (search) search.addEventListener("input", () => {
        const query = search.value.toLowerCase().trim();
        cityMaps.forEach((container) => (container._riskMarkers || []).forEach(({ marker, location }) => marker.setOpacity(query === "" || `${location.name} ${location.severity}`.toLowerCase().includes(query) ? 1 : 0)));
    });
}

function calculateCitySummary(data) {
    const latestByLocation = new Map();
    data.measurements.forEach((measurement) => {
        const key = measurement.locationId;
        const current = latestByLocation.get(key);
        if (!current || new Date(measurement.measurementTime) > new Date(current.measurementTime)) {
            latestByLocation.set(key, measurement);
        }
    });
    const latestMeasurements = [...latestByLocation.values()];
    const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const rainfall = avg(latestMeasurements.map((measurement) => measurement.rainfall));
    const drainage = avg(latestMeasurements.map((measurement) => measurement.drainageCapacity));
    const waterLevel = avg(latestMeasurements.map((measurement) => measurement.waterLevel));
    const severityOrder = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
    const highestSeverity = latestMeasurements.reduce((highest, measurement) => {
        const currentRank = severityOrder.indexOf(measurement.severity || "LOW");
        const bestRank = severityOrder.indexOf(highest || "LOW");
        return currentRank > bestRank ? measurement.severity : highest;
    }, "LOW");
    return {
        rainfall: Math.round(rainfall),
        drainage: Math.round(drainage),
        waterLevel: Math.round(waterLevel),
        severity: highestSeverity,
    };
}

function renderDashboard(data) {
    const stats = document.querySelectorAll(".stats .stat .value");
    const summary = calculateCitySummary(data);
    if (stats[0]) stats[0].textContent = `${summary.rainfall} mm/hr`;
    if (stats[1]) stats[1].textContent = `${summary.drainage} mm/hr`;
    if (stats[2]) stats[2].textContent = `${summary.waterLevel}%`;
    if (stats[3]) {
        stats[3].textContent = summary.severity || "LOW";
        stats[3].className = `value badge ${severityClass(summary.severity || "LOW")}`;
    }
    const alertBox = document.querySelector(".critical-alerts-card");
    if (alertBox) {
        const alertMarkup = data.alerts.slice(0, 2).map((alert) => `<div class="alert ${severityClass(alert.severity)}"><strong>${alert.title}</strong><br>${alert.description}</div>`).join("");
        alertBox.innerHTML = `<h3>Critical alerts</h3>${alertMarkup || "<p class=\"muted\">No active alerts.</p>"}<a class="btn" href="alerts.html">View all alerts</a>`;
    }
    const cityLocations = data.locations.map((location) => ({
        ...location,
        severity: data.measurements.find((measurement) => measurement.locationId === location.id)?.severity || "LOW"
    }));
    renderMap(cityLocations, data.measurements);
    document.querySelector(".notice")?.replaceChildren(document.createTextNode(`System operational • Last updated ${formatDate(data.lastUpdated)} • ${data.criticalAlerts} critical alert(s)`));
}

function renderAlerts(alerts) {
    const main = document.querySelector("main");
    const policy = main?.querySelector(".card:last-child");
    const feed = main?.querySelector(".alerts-feed");
    if (!main || !policy || !feed) return;
    feed.querySelectorAll(".alert").forEach((element) => element.remove());
    alerts.reverse().forEach((alert) => {
        const element = document.createElement("div");
        element.className = `alert ${severityClass(alert.severity)}`;
        element.innerHTML = `<strong>${alert.severity} — ${alert.location.name}</strong><p>${alert.description}</p><button class="btn secondary">Acknowledge</button>`;
        feed.appendChild(element);
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
    setupExports();
    document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", () => { button.textContent = "Updated just now"; setTimeout(() => { button.textContent = "Refresh data"; }, 1800); }));
    document.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
        if (button.dataset.refresh !== undefined || button.dataset.menu !== undefined || button.dataset.export !== undefined) {
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
        if (page === "map") {
            const data = await getApi("/dashboard");
            renderMap(data.locations.map((location) => ({ ...location, severity: data.measurements.find((measurement) => measurement.locationId === location.id)?.severity || "LOW" })), data.measurements);
        }
        if (page === "analytics") renderAnalytics(await getApi("/dashboard"));
        if (page === "alerts") renderAlerts(await getApi("/alerts/current"));
        if (page === "history") renderHistory(await getApi("/alerts/history"));
        if (page === "admin") await getApi("/dashboard");
    } catch (error) {
        console.warn("FloodNow API unavailable; showing demo fallback.", error);
        if (page === "dashboard" || page === "map") renderMap(FALLBACK_LOCATIONS);
    } finally {
        document.body.classList.remove("api-loading");
    }
});
