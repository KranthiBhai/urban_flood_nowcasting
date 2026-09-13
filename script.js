
document.addEventListener("DOMContentLoaded", () => {
  const clock = document.querySelectorAll("[data-clock]");
  function tick() { const d = new Date(); clock.forEach(e => e.textContent = d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })) }
  tick(); setInterval(tick, 1000);
  document.querySelectorAll("[data-risk]").forEach(e => { e.textContent = "HIGH"; e.className = "badge high" });
  document.querySelectorAll("[data-refresh]").forEach(btn => btn.addEventListener("click", () => {
    btn.textContent = "Updated just now"; setTimeout(() => btn.textContent = "Refresh data", 1800);
  }));
  document.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    if (btn.dataset.refresh !== undefined || btn.dataset.menu !== undefined) return;
    const original = btn.textContent;
    btn.textContent = original === "Acknowledge" ? "Acknowledged" : "Completed ✓";
    btn.classList.add("action-done");
    setTimeout(() => { btn.textContent = original; btn.classList.remove("action-done") }, 2200);
  }));
  const menuButton = document.querySelector("[data-menu]");
  const navlinks = document.querySelector(".navlinks");
  if (menuButton && navlinks) {
    menuButton.addEventListener("click", () => {
      const open = navlinks.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    })
  }
  const riskAreas = [
    { name: "Dargamitta", risk: "low", coordinates: [14.444, 79.966] },
    { name: "Balaji Nagar", risk: "moderate", coordinates: [14.456, 79.979] },
    { name: "Ramji Nagar", risk: "high", coordinates: [14.432, 79.982] },
    { name: "Vedayapalem", risk: "critical", coordinates: [14.425, 79.975] }
  ];
  const cityMaps = document.querySelectorAll("[data-city-map]");
  if (window.L && cityMaps.length) {
    cityMaps.forEach(container => {
      const map = L.map(container).setView([14.4425987, 79.986456], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      const markers = riskAreas.map(area => {
        const marker = L.marker(area.coordinates, {
          icon: L.divIcon({
            className: "risk-marker",
            html: `<span class="map-label risk-${area.risk}" data-map-label>${area.name} &bull; ${area.risk.toUpperCase()}</span>`,
            iconSize: null
          })
        }).addTo(map);
        return { marker, area };
      });
      container._riskMarkers = markers;
    });
  }
  const search = document.querySelector("[data-map-search]");
  if (search) {
    search.addEventListener("input", () => {
      const query = search.value.toLowerCase().trim();
      cityMaps.forEach(container => {
        (container._riskMarkers || []).forEach(({ marker, area }) => {
          const visible = query === "" || `${area.name} ${area.risk}`.toLowerCase().includes(query);
          marker.setOpacity(visible ? 1 : 0);
        });
      });
    })
  }
});
