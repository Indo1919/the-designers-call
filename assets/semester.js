/* The semester page: five studies of all the entries the collection was chosen from. */
(() => {
  "use strict";
  const D = JSON.parse(document.getElementById("payload").textContent);
  const POOL = D.pool, ITEMS = D.items;
  const byN = Object.fromEntries(ITEMS.map((it) => [+it.id, it]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const pad2 = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el = (p, t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; };
  const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;

  /* ---------- 1. Contact sheets ---------- */
  (() => {
    const svg = document.getElementById("cs"), cap = document.getElementById("cs-cap"), row = document.getElementById("cs-weeks");
    if (!svg) return;
    let week = 9;
    function draw() {
      [...row.children].forEach((b, i) => b.setAttribute("aria-selected", i + 1 === week ? "true" : "false"));
      svg.replaceChildren();
      const L = POOL.filter((p) => p.w === week);
      const wide = svg.parentElement.clientWidth > 700;
      const per = wide ? 12 : 6, fw = 66, fh = 50, gx = 76, sh = 84, gap = 14;
      const W = 30 + per * gx, rows = Math.ceil(L.length / per), H = rows * (sh + gap) + 8;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const r = rng(week * 131);
      for (let s = 0; s < rows; s++) {
        const y0 = 4 + s * (sh + gap);
        el(svg, "rect", { x: 2, y: y0, width: W - 4, height: sh, rx: 4, class: "cs-strip" });
        for (let h = 0; h < Math.floor((W - 20) / 19); h++) {
          el(svg, "rect", { x: 12 + h * 19, y: y0 + 5, width: 9, height: 6, rx: 1.5, class: "cs-hole" });
          el(svg, "rect", { x: 12 + h * 19, y: y0 + sh - 11, width: 9, height: 6, rx: 1.5, class: "cs-hole" });
        }
      }
      const nE = L.filter((p) => p.t === "E").length;
      L.forEach((p, i) => {
        const s = Math.floor(i / per), c = i % per, x = 18 + c * gx, y = 4 + s * (sh + gap) + 17;
        const g = el(svg, "g", { class: "cs-frame" + (p.s ? " is-kept" : "") + (p.t === "E" ? " is-ex" : " is-re"), tabindex: p.s ? "0" : "-1" });
        el(g, "rect", { x, y, width: fw, height: fh, rx: 2, class: "cs-cell" });
        const n = Math.min(7, Math.max(1, Math.round(p.n / 16)));
        for (let k = 0; k < n; k++) el(g, "rect", { x: x + 7, y: y + 7 + k * 5.6, width: (fw - 14) * (k === n - 1 ? 0.3 + r() * 0.5 : 0.78 + r() * 0.22), height: 2, rx: 1, class: "cs-line" });
        el(svg, "text", { x: x + fw / 2, y: y + fh + 11, class: "cs-edge" }, `${week}▸${i + 1}${i === 0 ? "  before class" : i === nE ? "  after class" : ""}`);
        if (p.s) {
          let d = ""; const cx = x + fw / 2, cy = y + fh / 2;
          for (let a = 0; a <= 7.0; a += 0.22) { const k = 1 + (r() - 0.5) * 0.07; d += (a ? "L" : "M") + (cx + Math.cos(a + 0.5) * 44 * k).toFixed(1) + " " + (cy + Math.sin(a + 0.5) * 33 * k).toFixed(1); }
          const path = el(svg, "path", { d, class: "cs-circle" });
          if (!reduceMotion) { const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len; requestAnimationFrame(() => { path.style.transition = `stroke-dashoffset .9s ${0.15 + i * 0.02}s ease`; path.style.strokeDashoffset = 0; }); }
          el(svg, "text", { x: x + fw + 2, y: y - 4, class: "cs-num" }, "no. " + pad2(p.s));
        }
        const say = () => { cap.textContent = `Week ${week}, frame ${i + 1}: ${p.t === "E" ? "an excerpt chosen before class" : "a reflection written after class"}, ${p.n} words. ` + (p.s ? `Circled: no. ${pad2(p.s)} in the collection, by ${byN[p.s].name}. Click to read it.` : "Not in the collection."); };
        g.addEventListener("pointerenter", say); g.addEventListener("focus", say);
        if (p.s) {
          g.addEventListener("click", () => (location.href = "collection.html#item-" + pad2(p.s)));
          g.addEventListener("keydown", (e) => { if (e.key === "Enter") location.href = "collection.html#item-" + pad2(p.s); });
        }
      });
      const kept = L.filter((p) => p.s).length;
      cap.textContent = `Week ${week}: ${L.length} frames, ${nE} excerpts and ${L.length - nE} reflections. ${kept} circled.`;
    }
    for (let w = 1; w <= 10; w++) {
      const b = document.createElement("button");
      b.setAttribute("role", "tab"); b.textContent = "Week " + w;
      b.addEventListener("click", () => { week = w; draw(); });
      row.appendChild(b);
    }
    draw();
    let lw = innerWidth; addEventListener("resize", () => { if (Math.abs(innerWidth - lw) > 40) { lw = innerWidth; draw(); } });
  })();

  /* ---------- 2. The highlighter ---------- */
  (() => {
    const ol = document.getElementById("hl");
    if (!ol) return;
    D.passages.forEach((p) => {
      const li = document.createElement("li");
      let node = document.createTextNode("“" + p.text + "”");
      for (let k = 0; k < p.n; k++) { const s = document.createElement("span"); s.className = "hl-s"; s.style.setProperty("--k", k); s.appendChild(node); node = s; }
      const q = document.createElement("p"); q.className = "hl-q"; q.appendChild(node);
      const m = document.createElement("p"); m.className = "hl-m";
      m.innerHTML = `<span class="hl-n">${"<i></i>".repeat(p.n)}</span>${p.n} classmates chose this line. ${esc(p.src)}`;
      li.append(q, m); ol.appendChild(li);
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-on"); io.unobserve(e.target); } }), { threshold: 0.4 });
    [...ol.children].forEach((li) => io.observe(li));
  })();

  /* ---------- 3. Hand it off ---------- */
  (() => {
    const q = document.getElementById("ho-q"), cap = document.getElementById("ho-cap"), range = document.getElementById("ho"), out = document.getElementById("ho-out"), pick = document.getElementById("ho-pick");
    if (!q) return;
    let words = [], it = null;
    function load(id) {
      it = ITEMS.find((x) => x.id === id);
      [...pick.children].forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === id ? "true" : "false"));
      q.replaceChildren(); words = [];
      const ms = it.text.indexOf(it.mark), me = ms + it.mark.length, r = rng(+id * 977);
      let pos = 0;
      it.text.split(/(\s+)/).forEach((tok) => {
        if (!tok.trim()) { q.appendChild(document.createTextNode(tok)); pos += tok.length; return; }
        const sp = document.createElement("span"); sp.textContent = tok; q.appendChild(sp);
        words.push({ sp, m: pos < me && pos + tok.length > ms, rk: r() });
        pos += tok.length;
      });
      q.classList.toggle("is-excerpt", it.type === "excerpt");
      update();
    }
    function update() {
      const v = +range.value; let kept = 0;
      words.forEach((w) => { const off = !w.m && w.rk * 100 < v; w.sp.classList.toggle("off", off); w.sp.classList.toggle("kept", w.m && v >= 100); if (!off) kept++; });
      out.textContent = v + "%";
      cap.textContent = v >= 100 ? `What’s left is the phrase that was marked: “${it.mark}” ${it.name}, week ${it.week}, no. ${it.id}.` : `${kept} of ${words.length} word choices are still the writer’s.`;
    }
    ITEMS.forEach((x) => {
      const b = document.createElement("button");
      b.dataset.id = x.id; b.textContent = `${x.id} ${x.name}`;
      b.addEventListener("click", () => { range.value = 0; load(x.id); });
      pick.appendChild(b);
    });
    range.addEventListener("input", update);
    load("01");
  })();

  /* ---------- 4. Type it or tab it ---------- */
  (() => {
    const box = document.getElementById("tt"), cap = document.getElementById("tt-cap"), pick = document.getElementById("tt-pick");
    if (!box) return;
    let T = "", it = null, st = [], p = 0, errT = 0;
    function load(id) {
      it = ITEMS.find((x) => x.id === id); T = it.mark; st = []; p = 0;
      [...pick.children].forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === id ? "true" : "false"));
      render();
    }
    function render() {
      box.replaceChildren();
      [...T].forEach((ch, i) => { const s = document.createElement("span"); s.textContent = ch; s.className = st[i] === "y" ? "y" : st[i] === "g" ? "g" : "u"; if (i === p && document.activeElement === box) s.classList.add("cur"); box.appendChild(s); });
      if (p >= T.length && document.activeElement === box) { const c = document.createElement("span"); c.className = "cur-end"; box.appendChild(c); }
      const y = st.filter((x) => x === "y").length, g = st.filter((x) => x === "g").length;
      cap.textContent = p >= T.length
        ? `${y} of ${T.length} characters typed by you, ${g} by autocomplete. The line is ${it.name}’s, week ${it.week}, no. ${it.id}.`
        : p ? `You’ve written ${y}. Autocomplete has written ${g}.` : "Click the line and start typing, or press Tab.";
    }
    box.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Tab" && p < T.length) { e.preventDefault(); for (let i = p; i < T.length; i++) st[i] = "g"; p = T.length; render(); return; }
      if (e.key === "Backspace") { e.preventDefault(); if (p > 0) { p--; st[p] = undefined; } render(); return; }
      if (e.key.length === 1 && p < T.length) {
        e.preventDefault();
        const want = T[p], got = e.key;
        const norm = (c) => c.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').toLowerCase();
        if (norm(got) === norm(want)) { st[p] = "y"; p++; render(); }
        else { render(); const c = box.children[p]; if (c) { c.classList.add("err"); clearTimeout(errT); errT = setTimeout(render, 260); } }
      }
    });
    box.addEventListener("focus", render); box.addEventListener("blur", render);
    document.getElementById("tt-reset").addEventListener("click", () => { st = []; p = 0; box.focus(); render(); });
    ["23", "15", "01", "17", "24", "29", "10", "28"].forEach((id) => {
      const x = ITEMS.find((i) => i.id === id);
      const b = document.createElement("button"); b.dataset.id = id; b.textContent = `${id} ${x.name}`;
      b.addEventListener("click", () => { load(id); box.focus(); });
      pick.appendChild(b);
    });
    load("23");
  })();

  /* ---------- 5. The room fills with AI ---------- */
  (() => {
    const cv = document.getElementById("ink"), range = document.getElementById("ink-w"), out = document.getElementById("ink-out"), cap = document.getElementById("ink-cap"), play = document.getElementById("ink-play");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let shown = 10, timer = 0, anim = 10;
    function draw() {
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, sc = Math.min(W, H) / 230;
      const cur = anim;
      POOL.forEach((p, i) => {
        const r = 5.6 * sc * Math.sqrt(i + 0.5), a = i * 2.39996, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (p.w > Math.ceil(cur)) { ctx.globalAlpha = 0.14; ctx.fillStyle = "#6e7681"; ctx.beginPath(); ctx.arc(x, y, 1.2 * sc, 0, 7); ctx.fill(); return; }
        const age = Math.max(0, cur - p.w);
        if (p.ai) {
          ctx.globalAlpha = 0.13; ctx.fillStyle = "#3b8bff"; ctx.beginPath(); ctx.arc(x, y, (3 + 2.7 * age) * sc, 0, 7); ctx.fill();
          ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 2.5 * sc, 0, 7); ctx.fill();
        } else { ctx.globalAlpha = 0.75; ctx.fillStyle = p.s ? "#e6edf3" : "#8b949e"; ctx.beginPath(); ctx.arc(x, y, (p.s ? 2.3 : 1.8) * sc, 0, 7); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
    }
    function caption() {
      const wk = D.weeks[shown - 1];
      const upTo = D.weeks.slice(0, shown).reduce((a, w) => [a[0] + w.ai, a[1] + w.total], [0, 0]);
      out.textContent = "Week " + shown;
      cap.textContent = `Week ${shown}: ${wk.ai} of ${wk.total} entries mention AI. Through week ${shown}: ${upTo[0]} of ${upTo[1]}.`;
    }
    function set(w, smooth) {
      const from = anim; shown = w; range.value = w; caption();
      if (!smooth || reduceMotion) { anim = w; draw(); return; }
      const t0 = performance.now();
      const tick = (now) => { const k = Math.min(1, (now - t0) / 700); anim = from + (w - from) * (1 - Math.pow(1 - k, 3)); draw(); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
    range.addEventListener("input", () => { stop(); set(+range.value, true); });
    function stop() { clearInterval(timer); timer = 0; play.textContent = "Play"; }
    play.addEventListener("click", () => {
      if (timer) return stop();
      play.textContent = "Pause"; set(1, false);
      timer = setInterval(() => { if (shown >= 10) return stop(); set(shown + 1, true); }, 900);
    });
    set(10, false);
    let lw = innerWidth; addEventListener("resize", () => { if (innerWidth !== lw) { lw = innerWidth; draw(); } });
  })();
})();
