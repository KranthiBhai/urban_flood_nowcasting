
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
  const search = document.querySelector("[data-map-search]");
  if (search) {
    search.addEventListener("input", () => {
      const query = search.value.toLowerCase().trim();
      document.querySelectorAll("[data-map-label]").forEach(label => {
        label.hidden = query !== "" && !label.textContent.toLowerCase().includes(query);
      });
    })
  }
});
