
document.addEventListener("DOMContentLoaded",()=>{
  const clock=document.querySelectorAll("[data-clock]");
  function tick(){const d=new Date();clock.forEach(e=>e.textContent=d.toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"medium"}))}
  tick();setInterval(tick,1000);
  document.querySelectorAll("[data-risk]").forEach(e=>{
    const r=["LOW","MODERATE","HIGH","CRITICAL"][Math.floor(Math.random()*4)];
    e.textContent=r;e.className="badge "+r.toLowerCase();
  });
  document.querySelectorAll("[data-refresh]").forEach(btn=>btn.addEventListener("click",()=>{
    btn.textContent="Updated ✓";setTimeout(()=>btn.textContent="Refresh data",1500);
  }));
});
