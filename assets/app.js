/* What's left for the designer? — interactions.
   The page works without this script; it adds the title sequence, the
   scroll-driven field of every micro-response, search, and wayfinding. */
(() => {
  "use strict";

  const D = JSON.parse(document.getElementById("payload").textContent);
  const POOL = D.pool;                       // {w, t, n, s, ai, k, p}
  const ITEMS = Object.fromEntries(D.items.map((it) => [it.id, it]));
  const N = POOL.length;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tip = document.getElementById("tip");
  const pad2 = (n) => String(n).padStart(2, "0");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Tooltip ---------- */
  function showTip(htmlStr, x, y, onStage = false) {
    tip.innerHTML = htmlStr;
    tip.classList.toggle("on-stage", onStage);
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 16;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 40) top = y - r.height - 12;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  }
  const hideTip = () => { tip.hidden = true; };
  const itemTip = (it) =>
    `<strong>No. ${it.id}</strong>, ${esc(it.name)}, week ${it.week} ${it.type}<span class="tip-q"><mark>${esc(it.mark)}</mark></span>`;

  /* ---------- Title: typed, offered a suggestion, the suggestion refused ---------- */
  const live = document.querySelector(".title-live");
  if (!reduceMotion && live) {
    const typed = document.createElement("span");
    const ghost = document.createElement("span");
    ghost.className = "ghost";
    const caret = document.createElement("span");
    caret.className = "caret";
    live.replaceChildren(typed, ghost, caret);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const type = async (s, speed) => { for (const ch of s) { typed.textContent += ch; await wait(speed + Math.random() * 40); } };
    (async () => {
      await wait(450);
      await type("What’s left for the ", 46);
      await wait(260);
      ghost.textContent = "machine?";
      const hint = document.createElement("span");
      hint.className = "tab-hint";
      hint.textContent = "Tab";
      caret.after(hint);
      await wait(1150);
      ghost.textContent = "";
      hint.remove();
      await wait(240);
      await type("designer?", 70);
      caret.classList.add("is-done");
      await wait(3100);
      caret.remove();
    })();
  }

  /* =====================================================================
     The semester as a field: every micro-response is a line whose length
     follows its word count. Six layouts, blended by scroll position.
     ===================================================================== */
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const story = document.getElementById("story");
  const stepEls = [...document.querySelectorAll(".step")];
  const storyCount = document.getElementById("story-count");
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const COL = {
    line: hex("#5f6b78"), exc: hex("#a6b0bb"), resp: hex("#4b5561"), dim: hex("#222a33"), ghost: hex("#2f3842"),
    hit: hex("#3b8bff"), glow: hex("#f0f6fc"), label: "#8b949e", labelBright: "#c9d1d9",
    kind: { essay: hex("#e6edf3"), explainer: hex("#7d8590"), launch: hex("#9cc3ff"), ai: hex("#3b8bff"), own: hex("#3a434d"), "": hex("#5f6b78") },
  };
  const KIND_ORDER = ["essay", "explainer", "launch", "ai", "own", ""];
  const KIND_WORD = { essay: "an essay or book", explainer: "a talk, explainer or guideline", launch: "a product launch or demo", ai: "writing about AI", own: "the writer’s own reflection" };
  const WEEKS = [...new Set(POOL.map((p) => p.w))].sort((a, b) => a - b);

  let W = 0, H = 0, dpr = 1, layouts = [], drawn = [], growStart = null;

  function geometry() {
    const wide = W > 900;
    const pad = clamp(W * 0.045, 20, 72);
    const cardW = Math.min(400, W * 0.31);
    const x0 = wide ? pad + cardW + W * 0.05 : pad;
    const x1 = W - pad;
    const y0 = wide ? H * 0.15 : 96;
    const y1 = wide ? H * 0.86 : H * 0.55;
    return { wide, x0, x1, y0, y1, bw: x1 - x0, bh: y1 - y0 };
  }

  function makeLayout(key) {
    return { key, x: new Float32Array(N), y: new Float32Array(N), w: new Float32Array(N), h: new Float32Array(N),
      c: new Array(N), a: new Float32Array(N), labels: [], arcs: [] };
  }

  function buildLayouts() {
    const g = geometry();
    const { x0, x1, y0, y1, bw, bh, wide } = g;

    // 0. One page: the semester as a paragraph, every entry a word.
    const L0 = makeLayout("pool");
    {
      const rs = wide ? 9 : 7, lh = wide ? 3 : 2.5, gap = wide ? 5 : 4;
      const sumSqrt = POOL.reduce((s, p) => s + Math.sqrt(Math.min(p.n, 400)), 0);
      let a = ((Math.floor((bh * 0.92) / rs) * bw) * 0.94 - N * gap) / sumSqrt;
      let pos = [], row = 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        let x = x0; row = 0; pos = [];
        POOL.forEach((p) => {
          const len = Math.max(3, a * Math.sqrt(Math.min(p.n, 400)));
          if (x + len > x1 && x > x0) { x = x0; row++; }
          pos.push([x, row, len]);
          x += len + gap;
        });
        if ((row + 1) * rs <= bh) break;
        a *= 0.95;
      }
      const usedH = (row + 1) * rs;
      const top = y0 + (bh - usedH) / 2;
      pos.forEach(([x, r, len], i) => {
        L0.x[i] = x; L0.y[i] = top + r * rs; L0.w[i] = len; L0.h[i] = lh; L0.c[i] = COL.line; L0.a[i] = 1;
      });
    }

    // Shared week columns
    const colGap = Math.max(6, bw * 0.02);
    const colW = (bw - colGap * (WEEKS.length - 1)) / WEEKS.length;
    const base = y1 - 24;
    const perWeek = WEEKS.map((w) => POOL.map((p, i) => i).filter((i) => POOL[i].w === w));
    const maxRows = Math.max(...perWeek.map((r) => r.length));
    const groupGap = 6;
    const rs = Math.min(wide ? 10 : 6, (base - y0 - groupGap - 26) / maxRows);
    const lh = Math.max(1.5, rs * 0.58);
    const len = (n) => colW * (0.14 + 0.86 * Math.sqrt(Math.min(n, 320) / 320));
    const colX = (ci) => x0 + ci * (colW + colGap);
    const weekLabels = (L, color = COL.label) => WEEKS.forEach((w, ci) => {
      L.labels.push({ text: colW < 58 ? (ci === 0 ? "Wk " + w : String(w)) : "Week " + w, x: colX(ci), y: y1 - 6, color, font: "12px 'Instrument Sans', sans-serif" });
    });
    function stack(L, ci, order, colorOf, alphaOf = () => 1, gapAfter = -1) {
      let y = base;
      order.forEach((i, k) => {
        y -= rs;
        L.x[i] = colX(ci); L.y[i] = y; L.w[i] = len(POOL[i].n); L.h[i] = lh; L.c[i] = colorOf(i); L.a[i] = alphaOf(i);
        if (k === gapAfter) y -= groupGap;
      });
      return y;
    }

    // 1. Weeks: excerpts underneath, reflections on top.
    const L1 = makeLayout("weeks");
    perWeek.forEach((idx, ci) => {
      const E = idx.filter((i) => POOL[i].t === "E"), R = idx.filter((i) => POOL[i].t === "R");
      stack(L1, ci, [...E, ...R], (i) => (POOL[i].t === "E" ? COL.exc : COL.resp), undefined, E.length - 1);
    });
    weekLabels(L1);

    // 2. Sources: excerpts sorted by the kind of source they came from.
    const L2 = makeLayout("sources");
    perWeek.forEach((idx, ci) => {
      const E = idx.filter((i) => POOL[i].t === "E").sort((a, b) => KIND_ORDER.indexOf(POOL[a].k) - KIND_ORDER.indexOf(POOL[b].k));
      const R = idx.filter((i) => POOL[i].t === "R");
      stack(L2, ci, [...E, ...R], (i) => (POOL[i].t === "E" ? COL.kind[POOL[i].k] || COL.line : COL.dim), undefined, E.length - 1);
    });
    weekLabels(L2);

    // 3. AI: every entry that mentions AI sinks to the bottom of its week.
    const L3 = makeLayout("ai");
    perWeek.forEach((idx, ci) => {
      const hits = idx.filter((i) => POOL[i].ai), rest = idx.filter((i) => !POOL[i].ai);
      stack(L3, ci, [...hits, ...rest], (i) => (POOL[i].ai ? COL.hit : COL.dim));
      const yTop = base - hits.length * rs;
      L3.labels.push({ text: String(hits.length), x: colX(ci), y: yTop - 7, color: "#79b8ff", font: "500 13px 'JetBrains Mono', monospace", box: true });
    });
    weekLabels(L3);

    // 4. Repeats: the same passage chosen by different people, joined by arcs.
    const L4 = makeLayout("repeat");
    perWeek.forEach((idx, ci) => {
      const E = idx.filter((i) => POOL[i].t === "E"), R = idx.filter((i) => POOL[i].t === "R");
      stack(L4, ci, [...E, ...R], (i) => (POOL[i].p.length ? COL.glow : COL.dim), undefined, E.length - 1);
    });
    weekLabels(L4);
    const byPassage = {};
    POOL.forEach((p, i) => p.p.forEach((j) => { (byPassage[j] = byPassage[j] || []).push(i); }));
    Object.values(byPassage).forEach((list) => {
      list.sort((a, b) => L4.x[a] - L4.x[b] || L4.y[a] - L4.y[b]);
      for (let k = 1; k < list.length; k++) L4.arcs.push([list[k - 1], list[k]]);
    });

    // 5. Chosen: the thirty lift out of the field and line up as the collection.
    const L5 = makeLayout("chosen");
    const labelW = wide ? 112 : 92;
    const ly0 = wide ? y0 : 84, lbh = wide ? bh : H * 0.6 - 84;
    const chosenStep = Math.min(wide ? 19 : 15, (lbh - 24) / 30);
    const listTop = ly0 + (lbh - 30 * chosenStep - 24) / 2;
    const maxLen = (bw - labelW) * 0.9;
    const partOffset = (s) => { const k = ["I", "II", "III"].indexOf(ITEMS[pad2(s)].part); return k * 12; };
    POOL.forEach((p, i) => {
      if (p.s) {
        const y = listTop + (p.s - 1) * chosenStep + partOffset(p.s);
        L5.x[i] = x0 + labelW; L5.y[i] = y; L5.w[i] = maxLen * (0.12 + 0.88 * Math.sqrt(Math.min(p.n, 320) / 320));
        L5.h[i] = wide ? 4 : 3; L5.c[i] = COL.hit; L5.a[i] = 1;
        const it = ITEMS[pad2(p.s)];
        L5.labels.push({ text: pad2(p.s), x: x0, y: y + 4.5, color: COL.label, font: "500 11px 'JetBrains Mono', monospace" });
        L5.labels.push({ text: it.name, x: x0 + (wide ? 28 : 24), y: y + 4.5, color: COL.labelBright, font: (wide ? 13 : 11) + "px 'Instrument Sans', sans-serif" });
      } else {
        L5.x[i] = L4.x[i]; L5.y[i] = L4.y[i]; L5.w[i] = L4.w[i]; L5.h[i] = L4.h[i]; L5.c[i] = COL.ghost; L5.a[i] = 0.16;
      }
    });

    layouts = [L0, L1, L2, L3, L4, L5];
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    buildLayouts();
    schedule();
  }

  const cards = stepEls.map((el) => el.querySelector(".step-card"));
  function scrollState() {
    // Each transition is tied to its caption card: it plays as the card rises
    // into place, and is settled by the time the card is readable.
    const vh = innerHeight, wide = innerWidth > 900;
    const start = vh * (wide ? 1.05 : 1.2), span = vh * (wide ? 0.5 : 0.38);
    let cur = 0, t = 1;
    for (let i = 1; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      const c = r.top + r.height / 2;
      if (c < start) { cur = i; t = clamp((start - c) / span, 0, 1); }
    }
    if (reduceMotion) t = 1;
    return { cur, t };
  }

  let lastStep = -1;
  function draw(now) {
    if (!layouts.length) return;
    const { cur, t } = scrollState();
    const A = layouts[Math.max(0, cur - 1)], B = layouts[cur];
    const tt = cur === 0 ? 1 : t;

    // first appearance: lines grow in as the stage arrives
    let grow = 1;
    if (!reduceMotion) {
      const r = story.getBoundingClientRect();
      if (growStart === null && r.top < innerHeight * 0.6) growStart = now;
      grow = growStart === null ? 0 : clamp((now - growStart) / 1400, 0, 1);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // arcs behind the lines
    const arcW = (B.key === "repeat" ? tt : 0) + (A.key === "repeat" && B !== A ? 1 - tt : 0);
    if (arcW > 0.01) {
      const L = layouts[4];
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = `rgba(88,166,255,${0.75 * arcW * arcW})`;
      L.arcs.forEach(([a, b]) => {
        const ax = L.x[a] + L.w[a] / 2, ay = L.y[a], bx = L.x[b] + L.w[b] / 2, by = L.y[b];
        const lift = 40 + Math.abs(bx - ax) * 0.18;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - lift, bx, by);
        ctx.stroke();
      });
    }

    drawn.length = 0;
    for (let i = 0; i < N; i++) {
      const delay = (i / N) * 0.35;
      const lt = ease(clamp((tt - delay) / 0.65, 0, 1));
      const x = lerp(A.x[i], B.x[i], lt), y = lerp(A.y[i], B.y[i], lt);
      const gi = clamp((grow - (i / N) * 0.5) / 0.5, 0, 1);
      const w = lerp(A.w[i], B.w[i], lt) * ease(gi), h = lerp(A.h[i], B.h[i], lt);
      const ca = A.c[i], cb = B.c[i];
      const a = lerp(A.a[i], B.a[i], lt);
      ctx.fillStyle = `rgba(${lerp(ca[0], cb[0], lt) | 0},${lerp(ca[1], cb[1], lt) | 0},${lerp(ca[2], cb[2], lt) | 0},${a})`;
      ctx.fillRect(x, y, w, h);
      drawn.push(x, y, w, h, a);
    }

    // labels cross-fade between layouts
    const paintLabels = (L, alpha) => {
      if (alpha < 0.02) return;
      ctx.globalAlpha = alpha;
      L.labels.forEach((lb) => {
        ctx.font = lb.font;
        if (lb.box) { const m = ctx.measureText(lb.text).width; ctx.fillStyle = "#0b0f14"; ctx.fillRect(lb.x - 3, lb.y - 13, m + 8, 18); }
        ctx.fillStyle = lb.color; ctx.fillText(lb.text, lb.x, lb.y);
      });
      ctx.globalAlpha = 1;
    };
    ctx.textBaseline = "alphabetic";
    if (A === B) paintLabels(B, 1);
    else { paintLabels(A, Math.pow(1 - tt, 2)); paintLabels(B, Math.pow(tt, 2)); }

    if (cur !== lastStep) {
      lastStep = cur;
      stepEls.forEach((el, i) => el.classList.toggle("is-active", i === cur));
      storyCount.textContent = `${cur + 1} of ${stepEls.length}`;
      const txt = stepEls[cur].querySelector(".step-text").textContent;
      canvas.setAttribute("aria-label", `${stepEls[cur].querySelector(".step-big").textContent} ${txt}`);
    }
    if (!reduceMotion && grow < 1) schedule();
  }

  let raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame((now) => { raf = 0; draw(now); }); }

  function hitAt(mx, my) {
    let best = -1;
    for (let i = 0; i < N; i++) {
      const o = i * 5, x = drawn[o], y = drawn[o + 1], w = drawn[o + 2], h = drawn[o + 3], a = drawn[o + 4];
      if (a < 0.5 || w < 2) continue;
      const pad = Math.max(0, (6 - h) / 2);
      if (mx >= x - 2 && mx <= x + w + 2 && my >= y - pad && my <= y + h + pad) { best = i; if (POOL[i].s) break; }
    }
    return best;
  }
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const i = hitAt(e.clientX - r.left, e.clientY - r.top);
    canvas.classList.toggle("is-pointing", i >= 0 && !!POOL[i].s);
    if (i < 0) return hideTip();
    const p = POOL[i];
    if (p.s) return showTip(itemTip(ITEMS[pad2(p.s)]), e.clientX, e.clientY, true);
    const kind = p.t === "E" ? "excerpt" : "response";
    const extra = [p.t === "E" && p.k ? `from ${KIND_WORD[p.k]}` : "", p.ai ? "mentions AI" : "", p.p.length ? "repeats a passage someone else chose" : ""].filter(Boolean).join(", ");
    showTip(`Week ${p.w} ${kind}, ${p.n} words${extra ? "<br>" + extra : ""}<br><span style="opacity:.6">Not in this collection</span>`, e.clientX, e.clientY, true);
  });
  canvas.addEventListener("pointerleave", () => { hideTip(); canvas.classList.remove("is-pointing"); });
  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    const i = hitAt(e.clientX - r.left, e.clientY - r.top);
    if (i >= 0 && POOL[i].s) document.getElementById("item-" + pad2(POOL[i].s)).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });

  addEventListener("scroll", () => { schedule(); hideTip(); }, { passive: true });
  let rt = 0, lastW = 0;
  addEventListener("resize", () => {
    if (Math.abs(innerWidth - lastW) < 2 && Math.abs(canvas.clientHeight - H) < 80) return;
    clearTimeout(rt); rt = setTimeout(() => { lastW = innerWidth; resize(); }, 120);
  });
  lastW = innerWidth;
  resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

  /* ---------- Search the collection (keyword in context) ---------- */
  const PRESETS = {
    choice: /\b(choic\w*|choos\w*|chose\w*)/gi, decision: /\b(decision\w*|decid\w*)/gi, taste: /\b(taste\w*)/gi,
    intention: /\b(intent\w*)/gi, control: /\b(control\w*)/gi, ai: /\b(A\.I\.|AI|Ai|ai)\b/g,
  };
  const q = document.getElementById("q");
  const kwic = document.getElementById("kwic");
  const kwicCount = document.getElementById("kwic-count");
  const chipsQ = [...document.querySelectorAll(".search-chips .chip")];
  const trimLeft = (s, n) => { if (s.length <= n) return s; const c = s.slice(-n), sp = c.indexOf(" "); return "…" + (sp > -1 && sp < 15 ? c.slice(sp + 1) : c); };
  const trimRight = (s, n) => { if (s.length <= n) return s; const c = s.slice(0, n), sp = c.lastIndexOf(" "); return (sp > n - 15 ? c.slice(0, sp) : c) + "…"; };
  function runSearch() {
    const raw = q.value.trim();
    chipsQ.forEach((c) => c.classList.toggle("is-on", c.dataset.q.toLowerCase() === raw.toLowerCase()));
    kwic.replaceChildren();
    if (!raw) { kwicCount.textContent = "Type a word to see every place it appears."; return; }
    const key = raw.toLowerCase();
    const re = PRESETS[key] ? new RegExp(PRESETS[key].source, PRESETS[key].flags)
      : new RegExp("\\b(" + raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w*)", "gi");
    const rows = [];
    for (const it of D.items) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(it.text))) {
        rows.push({ it, l: it.text.slice(0, m.index), k: m[0], r: it.text.slice(m.index + m[0].length) });
        if (!m[0].length) re.lastIndex++;
      }
    }
    const inItems = new Set(rows.map((r) => r.it.id)).size;
    kwicCount.textContent = rows.length
      ? `${rows.length} ${rows.length === 1 ? "place" : "places"} in ${inItems} of the 30 selections`
      : `“${raw}” doesn’t appear in the collection. Try one of the suggested words.`;
    const frag = document.createDocumentFragment();
    rows.forEach((row) => {
      const li = document.createElement("li");
      const L = trimLeft(row.l, 80), R = trimRight(row.r, 80);
      li.innerHTML = `<a href="#item-${row.it.id}" aria-label="No. ${row.it.id}, ${esc(row.it.name)}: ${esc(L + row.k + R)}"><span class="k-who"><b>${row.it.id}</b>${esc(row.it.name)}</span><span class="k-l"><span>${esc(L)}</span></span><span class="k-k">${esc(row.k)}</span><span class="k-r">${esc(R)}</span></a>`;
      frag.append(li);
    });
    kwic.append(frag);
  }
  q.addEventListener("input", runSearch);
  chipsQ.forEach((c) => c.addEventListener("click", () => { q.value = c.dataset.q; runSearch(); }));
  runSearch();

  /* ---------- Essay references preview their selection ---------- */
  document.querySelectorAll(".ref").forEach((a) => {
    const it = ITEMS[a.dataset.ref];
    if (!it) return;
    a.setAttribute("aria-label", `No. ${it.id}, ${it.name}, week ${it.week} ${it.type}`);
    a.addEventListener("pointerenter", (e) => showTip(itemTip(it), e.clientX, e.clientY));
    a.addEventListener("pointermove", (e) => showTip(itemTip(it), e.clientX, e.clientY));
    a.addEventListener("pointerleave", hideTip);
    a.addEventListener("focus", () => { const b = a.getBoundingClientRect(); showTip(itemTip(it), b.left, b.bottom); });
    a.addEventListener("blur", hideTip);
  });

  /* ---------- Wayfinding: top bar, active section, status bar ---------- */
  const topbar = document.querySelector(".topbar");
  const status = document.getElementById("status");
  const statusL = document.getElementById("status-left");
  const statusR = document.getElementById("status-right");
  new IntersectionObserver(([e]) => topbar.classList.toggle("is-on", !e.isIntersecting), { threshold: 0 })
    .observe(document.querySelector(".dek"));
  const onStage = () => {
    const r = story.getBoundingClientRect();
    const dark = r.top <= 40 && r.bottom > 60;
    topbar.classList.toggle("is-dark", dark);
    status.classList.toggle("is-dark", r.top < innerHeight - 30 && r.bottom > innerHeight - 30);
  };
  addEventListener("scroll", onStage, { passive: true });
  onStage();

  const partTitle = Object.fromEntries(D.parts.map((p) => [p.num, p.title]));
  const partAnchor = { I: "making-choices", II: "handing-them-off", III: "whats-left" };
  const links = Object.fromEntries([...document.querySelectorAll(".topbar-links a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const setLink = (id) => Object.entries(links).forEach(([k, a]) => a.setAttribute("aria-current", k === id ? "true" : "false"));
  const zones = {
    top: () => [`${N} micro-responses by twenty classmates`, "30 selected"],
    essay: () => ["Framing essay", `${document.querySelectorAll(".ref").length} references to the collection`],
    search: () => ["Search the collection", "30 selections"],
    data: () => ["The same lines, chosen again", "Notes on the data"],
    record: () => ["The record", "30 commits, one per selection"],
    sources: () => ["Sources and credits", "15 contributors"],
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.classList.contains("item")) {
        const it = ITEMS[el.dataset.id];
        statusL.textContent = `Part ${it.part}, ${partTitle[it.part]}: ${it.name}, week ${it.week} ${it.type}`;
        statusR.textContent = `Item ${it.id} of 30`;
        setLink(partAnchor[it.part]);
      } else if (el.classList.contains("step")) {
        const i = +el.dataset.step;
        statusL.textContent = `The semester, ${i + 1} of ${stepEls.length}`;
        statusR.textContent = `${N} micro-responses`;
        setLink("story");
      } else if (el.classList.contains("part")) {
        setLink(el.id);
      } else if (zones[el.id]) {
        const [l, r] = zones[el.id]();
        statusL.textContent = l; statusR.textContent = r; setLink(el.id);
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll(".item, .part, .step, #top, #essay, #search, #data, #record, #sources").forEach((el) => io.observe(el));
})();
