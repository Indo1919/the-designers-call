/* The conversation: six questions, the positions people took, and where they sat. */
(() => {
  "use strict";
  const D = JSON.parse(document.getElementById("payload").textContent);
  const byId = Object.fromEntries(D.items.map((i) => [i.id, i]));
  const PART = Object.fromEntries(D.parts.map((p) => [p.num, p]));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // same shirt colors as the people at the table
  const SHIRTS = ["#4a6fa5", "#c76b4a", "#5b8c6b", "#8a6bb0", "#d4a24c", "#3f7f8c", "#b05a7a", "#6d7a8a", "#a0603a", "#4f5b9c", "#7a9a4a", "#c05050", "#5a8aa0", "#9a7a5a", "#6a5aa0"];
  const COLOR = {};
  [...D.sideA, ...D.sideB].filter(Boolean).forEach((n, i) => (COLOR[n] = SHIRTS[i % SHIRTS.length]));
  const panel = document.getElementById("th-panel");
  const tabs = [...document.querySelectorAll(".th-tab")];
  const mapSeats = [...document.querySelectorAll(".seatmap-svg--convo .sm-seat[data-name]")];
  const mapCap = document.getElementById("th-map-cap");
  const weeksSvg = document.getElementById("th-weeks");

  const sit = (n) => (window.WL ? window.WL.sit(n) : (location.hash = "#seat-" + n.toLowerCase().replace(/\s+/g, "-")));
  const read = (id) => (window.WL ? window.WL.read(id) : (location.href = "collection.html#item-" + id));

  function render(theme) {
    const views = theme.views.map((v, vi) => {
      const voices = v.ids.map((id) => {
        const it = byId[id];
        return `<div class="voice">
          <span class="avatar" style="--c:${COLOR[it.name]}" aria-hidden="true">${esc(it.name[0])}</span>
          <div><p class="voice-q">${esc(it.mark)}</p>
          <p class="voice-by"><span>${esc(it.name)}, week ${it.week} ${it.type}${it.type === "excerpt" ? `, quoting ${esc(D.readings.find((r) => r.key === it.source).author)}` : `, answering ${esc(it.to)}`}</span>
          <button data-read="${id}">Read no. ${id}</button><button data-sit="${esc(it.name)}">Sit in ${esc(it.name)}’s seat</button></p></div>
        </div>`;
      }).join("");
      return `<div class="view" style="animation-delay:${vi * 70}ms"><p class="view-label">${esc(v.label)}</p><div class="voices">${voices}</div></div>`;
    }).join("");
    panel.innerHTML = `<h3 class="q">${esc(theme.question)}</h3><p class="reading">${esc(theme.reading)}</p><div class="views">${views}</div>`;

    // who spoke, on the seat plan
    const ids = theme.views.flatMap((v) => v.ids);
    const people = new Set(ids.map((id) => byId[id].name));
    mapSeats.forEach((g) => {
      const on = people.has(g.dataset.name);
      g.classList.toggle("is-lit", on);
      g.classList.toggle("is-dim", !on);
      g.style.setProperty("--c", on ? COLOR[g.dataset.name] || "#c9d1d9" : "");
    });
    mapCap.textContent = `${people.size} ${people.size === 1 ? "person" : "people"} spoke to this question`;

    // when it came up
    const W = 260, colW = W / 10;
    let s = "";
    for (let w = 1; w <= 10; w++) {
      const x = (w - 0.5) * colW;
      s += `<line x1="${x}" x2="${x}" y1="6" y2="44" stroke="rgba(240,246,252,.07)"/>`;
      ids.map((id) => byId[id]).filter((it) => it.week === w).forEach((it, k) => {
        const y = 40 - k * 9;
        s += it.type === "excerpt"
          ? `<circle cx="${x}" cy="${y}" r="3.6" fill="${COLOR[it.name]}"/>`
          : `<circle cx="${x}" cy="${y}" r="3.1" fill="none" stroke="${COLOR[it.name]}" stroke-width="1.6"/>`;
      });
      s += `<text x="${x}" y="58">${w}</text>`;
    }
    weeksSvg.innerHTML = s;
  }

  function select(i, focus) {
    tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.tabIndex = k === i ? 0 : -1; });
    if (focus) tabs[i].focus();
    render(D.themes[i]);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); select((i + d + tabs.length) % tabs.length, true); }
    });
  });
  panel.addEventListener("click", (e) => {
    const r = e.target.closest("[data-read]"); if (r) return read(r.dataset.read);
    const s = e.target.closest("[data-sit]"); if (s) return sit(s.dataset.sit);
  });
  mapSeats.forEach((g) => {
    g.addEventListener("click", () => sit(g.dataset.name));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sit(g.dataset.name); } });
  });
  select(0);
})();
