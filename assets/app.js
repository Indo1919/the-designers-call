/* What's left for the designer? — interactions.
   Everything here enhances content that is already in the HTML. */
(() => {
  "use strict";

  const DATA = JSON.parse(document.getElementById("data").textContent);
  const POOL = DATA.pool;
  const ITEMS = Object.fromEntries(DATA.items.map((it) => [it.id, it]));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVGNS = "http://www.w3.org/2000/svg";
  const tip = document.getElementById("tip");
  const pad2 = (n) => String(n).padStart(2, "0");
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------- Tooltip ---------- */
  function showTip(htmlStr, x, y) {
    tip.innerHTML = htmlStr;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14, top = y + 16;
    if (left + r.width > innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > innerHeight - 40) top = y - r.height - 12;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  }
  const hideTip = () => { tip.hidden = true; };

  function itemTip(it) {
    const kind = it.type === "excerpt" ? "excerpt" : "response";
    return `<strong>No. ${it.id}</strong>, ${esc(it.name)}, week ${it.week} ${kind}<span class="tip-q"><mark>${esc(it.mark)}</mark></span>`;
  }

  /* ---------- Minimap: every micro-response as a line ---------- */
  const WEEKS = [...new Set(POOL.map((p) => p.w))].sort((a, b) => a - b);
  const byWeek = WEEKS.map((w) => ({
    w,
    E: POOL.filter((p) => p.w === w && p.t === "E"),
    R: POOL.filter((p) => p.w === w && p.t === "R"),
  }));

  function hitOf(p, mode) {
    if (mode === "sel") return p.sel > 0;
    return p[mode] === 1;
  }

  function renderMap(el, mode, { tall = false, counts = false, animate = false } = {}) {
    const W = Math.max(280, el.clientWidth);
    const gap = Math.max(6, Math.round(W * 0.014));
    const colW = (W - gap * (WEEKS.length - 1)) / WEEKS.length;
    const lineH = tall ? 4 : 2.5, step = tall ? 6 : 4, groupGap = tall ? 10 : 7;
    const rowsMax = Math.max(...byWeek.map((c) => c.E.length + c.R.length));
    const plotH = rowsMax * step + groupGap;
    const labelY = plotH + 20;
    const H = labelY + (counts ? 22 : 4);
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("aria-hidden", mode === "sel" ? "false" : "true");
    const len = (words) => colW * (0.14 + 0.86 * Math.sqrt(Math.min(words, 320) / 320));
    const short = colW < 62;

    byWeek.forEach((col, ci) => {
      const x = ci * (colW + gap);
      let y = 0, hits = 0;
      const draw = (p, i) => {
        const hit = hitOf(p, mode);
        if (hit) hits++;
        const r = document.createElementNS(SVGNS, "rect");
        r.setAttribute("x", x.toFixed(1));
        r.setAttribute("y", y);
        r.setAttribute("width", len(p.words).toFixed(1));
        r.setAttribute("height", lineH);
        r.setAttribute("rx", 1);
        r.dataset.w = p.w; r.dataset.t = p.t; r.dataset.words = p.words;
        if (p.sel) r.dataset.sel = pad2(p.sel);
        if (mode === "sel" && p.sel) {
          const a = document.createElementNS(SVGNS, "a");
          a.setAttribute("href", `#item-${pad2(p.sel)}`);
          const it = ITEMS[pad2(p.sel)];
          a.setAttribute("aria-label", `No. ${it.id}, ${it.name}, week ${it.week} ${it.type}`);
          r.setAttribute("class", "ln-sel");
          const ring = document.createElementNS(SVGNS, "rect");
          ring.setAttribute("class", "ln-ring");
          ring.setAttribute("x", (x - 3).toFixed(1));
          ring.setAttribute("y", y - 2);
          ring.setAttribute("width", (len(p.words) + 6).toFixed(1));
          ring.setAttribute("height", lineH + 4);
          ring.setAttribute("rx", 2);
          a.append(ring, r);
          svg.append(a);
          if (animate) r.classList.add("is-pending");
        } else {
          r.setAttribute("class", "ln" + (mode !== "sel" ? (hit ? " is-hit" : " is-dim") : ""));
          svg.append(r);
        }
        if (animate) {
          r.style.transformBox = "fill-box";
          r.style.transformOrigin = "left center";
          r.style.transform = "scaleX(0)";
          r.style.transition = `transform 520ms cubic-bezier(.2,.7,.2,1) ${280 + ci * 70 + i * 4}ms`;
        }
        y += step;
      };
      col.E.forEach(draw);
      y += groupGap;
      col.R.forEach((p, i) => draw(p, i + col.E.length));

      const label = document.createElementNS(SVGNS, "text");
      label.setAttribute("class", "wk");
      label.setAttribute("x", x);
      label.setAttribute("y", labelY);
      label.textContent = short ? (ci === 0 ? "Wk " + col.w : col.w) : "Week " + col.w;
      svg.append(label);
      if (counts) {
        const c = document.createElementNS(SVGNS, "text");
        c.setAttribute("class", "wk-count");
        c.setAttribute("x", x);
        c.setAttribute("y", labelY + 18);
        c.textContent = short ? hits : `${hits}/${col.E.length + col.R.length}`;
        svg.append(c);
      }
    });

    el.replaceChildren(svg);

    svg.addEventListener("pointermove", (e) => {
      const r = e.target.closest("rect");
      if (!r || !r.dataset.w) return hideTip();
      if (r.dataset.sel) return showTip(itemTip(ITEMS[r.dataset.sel]), e.clientX, e.clientY);
      const kind = r.dataset.t === "E" ? "excerpt" : "response";
      showTip(`Week ${r.dataset.w} ${kind}, ${r.dataset.words} words<br><span style="opacity:.75">Not in this collection</span>`, e.clientX, e.clientY);
    });
    svg.addEventListener("pointerleave", hideTip);
    svg.addEventListener("focusin", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const r = a.querySelector("rect[data-sel]");
      const b = a.getBoundingClientRect();
      showTip(itemTip(ITEMS[r.dataset.sel]), b.right, b.bottom);
    });
    svg.addEventListener("focusout", hideTip);
    return svg;
  }

  /* ---------- Hero: the title is typed, a suggestion is offered, then refused ---------- */
  const heroMap = document.getElementById("hero-map");
  const live = document.querySelector(".title-live");
  const heroSvg = renderMap(heroMap, "sel", { animate: !reduceMotion });

  function playHero() {
    const lead = "What’s left for the ";
    const suggestion = "machine?";
    const choice = "designer?";
    const typed = document.createElement("span");
    const ghost = document.createElement("span");
    ghost.className = "ghost";
    const caret = document.createElement("span");
    caret.className = "caret";
    live.replaceChildren(typed, ghost, caret);

    // grow the minimap lines
    requestAnimationFrame(() => requestAnimationFrame(() => {
      heroSvg.querySelectorAll("rect[style]").forEach((r) => { r.style.transform = "scaleX(1)"; });
    }));

    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const type = async (str, speed) => {
      for (const ch of str) { typed.textContent += ch; await wait(speed + Math.random() * 40); }
    };
    (async () => {
      await wait(450);
      await type(lead, 48);
      await wait(260);
      ghost.textContent = suggestion;
      const hint = document.createElement("span");
      hint.className = "tab-hint";
      hint.textContent = "Tab";
      caret.after(hint);
      await wait(1100);
      ghost.textContent = "";
      hint.remove();
      await wait(240);
      await type(choice, 70);
      heroSvg.querySelectorAll(".is-pending").forEach((r, i) => {
        setTimeout(() => r.classList.remove("is-pending"), i * 18);
      });
      caret.classList.add("is-done");
      await wait(3100);
      caret.remove();
    })();
  }

  if (!reduceMotion) {
    const style = document.createElement("style");
    style.textContent = ".minimap .ln-sel.is-pending{fill:var(--map-line)} .minimap .ln-sel{transition:fill .35s ease}";
    document.head.append(style);
    playHero();
  }

  /* ---------- The semester: find a word across the pool ---------- */
  const dataMap = document.getElementById("data-map");
  const findCount = document.getElementById("find-count");
  const findSummary = document.getElementById("find-summary");
  const chips = [...document.querySelectorAll(".find .chip")];
  let dataMode = "ai";

  const sumRange = (key, a, b) => {
    const rows = POOL.filter((p) => p.w >= a && p.w <= b);
    return [rows.filter((p) => hitOf(p, key)).length, rows.length];
  };
  function summary(mode) {
    const total = POOL.length;
    if (mode === "ai") {
      const [e, en] = sumRange("ai", 1, 4), [l, ln] = sumRange("ai", 6, 9);
      return `In weeks 1 to 4, ${e} of ${en} micro-responses mentioned AI. From week 6 to week 9, ${l} of ${ln} did.`;
    }
    if (mode === "ch") {
      const n = POOL.filter((p) => p.ch).length;
      const weeks = new Set(POOL.filter((p) => p.ch).map((p) => p.w)).size;
      return `Words like choice and decision appear in ${n} of ${total} micro-responses, in all ${weeks} weeks.`;
    }
    if (mode === "ta") {
      const hits = POOL.filter((p) => p.ta);
      const counts = {};
      hits.forEach((p) => { counts[p.w] = (counts[p.w] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return `“Taste” appears in only ${hits.length} of ${total}. ${top[1] === 3 ? "Three" : top[1]} of them come from week ${top[0]}, the week of Jonathan Lee’s talk.`;
    }
    const sel = POOL.filter((p) => p.sel);
    const counts = {};
    sel.forEach((p) => { counts[p.w] = (counts[p.w] || 0) + 1; });
    const weeks = Object.keys(counts).length;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]).sort((a, b) => a - b);
    return `The thirty selections come from ${weeks} of the ${WEEKS.length} weeks, most of them from weeks ${top[0]} and ${top[1]}.`;
  }
  function setMode(mode) {
    dataMode = mode;
    chips.forEach((c) => c.setAttribute("aria-checked", String(c.dataset.mode === mode)));
    renderMap(dataMap, mode, { tall: true, counts: true });
    const hits = POOL.filter((p) => hitOf(p, mode)).length;
    findCount.textContent = `${hits} of ${POOL.length}`;
    findSummary.textContent = summary(mode);
    dataMap.setAttribute("aria-label", `${hits} of ${POOL.length} micro-responses highlighted.`);
  }
  chips.forEach((c) => c.addEventListener("click", () => setMode(c.dataset.mode)));
  document.querySelector(".find").addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const i = chips.findIndex((c) => c.dataset.mode === dataMode);
    const next = chips[(i + (e.key === "ArrowRight" ? 1 : chips.length - 1)) % chips.length];
    setMode(next.dataset.mode); next.focus();
  });
  setMode("ai");

  let lastW = innerWidth;
  const ro = new ResizeObserver(() => {
    if (Math.abs(innerWidth - lastW) < 2) return;
    lastW = innerWidth;
    clearTimeout(ro.t);
    ro.t = setTimeout(() => { renderMap(heroMap, "sel"); renderMap(dataMap, dataMode, { tall: true, counts: true }); }, 120);
  });
  ro.observe(document.body);

  /* ---------- Search the collection (keyword in context) ---------- */
  const PRESETS = {
    choice: /\b(choic\w*|choos\w*|chose\w*)/gi,
    decision: /\b(decision\w*|decid\w*)/gi,
    taste: /\b(taste\w*)/gi,
    intention: /\b(intent\w*)/gi,
    control: /\b(control\w*)/gi,
    ai: /\b(A\.I\.|AI|Ai|ai)\b/g,
  };
  const q = document.getElementById("q");
  const kwic = document.getElementById("kwic");
  const kwicCount = document.getElementById("kwic-count");
  const items = DATA.items;

  function trimLeft(s, n) {
    if (s.length <= n) return s;
    const cut = s.slice(-n);
    const sp = cut.indexOf(" ");
    return "…" + (sp > -1 && sp < 15 ? cut.slice(sp + 1) : cut);
  }
  function trimRight(s, n) {
    if (s.length <= n) return s;
    const cut = s.slice(0, n);
    const sp = cut.lastIndexOf(" ");
    return (sp > n - 15 ? cut.slice(0, sp) : cut) + "…";
  }
  function runSearch() {
    const raw = q.value.trim();
    kwic.replaceChildren();
    if (!raw) { kwicCount.textContent = "Type a word to see every place it appears."; return; }
    const key = raw.toLowerCase();
    const re = PRESETS[key] ? new RegExp(PRESETS[key].source, PRESETS[key].flags)
      : new RegExp("\\b(" + raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w*)", "gi");
    const rows = [];
    for (const it of items) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(it.text))) {
        rows.push({ it, l: it.text.slice(0, m.index), k: m[0], r: it.text.slice(m.index + m[0].length) });
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    const inItems = new Set(rows.map((r) => r.it.id)).size;
    kwicCount.textContent = rows.length
      ? `${rows.length} ${rows.length === 1 ? "place" : "places"} in ${inItems} of the 30 selections`
      : `“${raw}” doesn’t appear in the collection. Try one of the suggested words.`;
    const frag = document.createDocumentFragment();
    rows.forEach((row) => {
      const li = document.createElement("li");
      const kind = row.it.type === "excerpt" ? "excerpt" : "response";
      li.innerHTML = `<a href="#item-${row.it.id}" aria-label="No. ${row.it.id}, ${esc(row.it.name)}, ${kind}: ${esc(trimLeft(row.l, 80) + row.k + trimRight(row.r, 80))}"><span class="k-who"><b>${row.it.id}</b>${esc(row.it.name)}</span><span class="k-l"><span>${esc(trimLeft(row.l, 80))}</span></span><span class="k-k">${esc(row.k)}</span><span class="k-r">${esc(trimRight(row.r, 80))}</span></a>`;
      frag.append(li);
    });
    kwic.append(frag);
  }
  q.addEventListener("input", runSearch);
  document.querySelectorAll(".search-chips .chip").forEach((c) => c.addEventListener("click", () => { q.value = c.dataset.q; runSearch(); q.focus(); }));
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
  addEventListener("scroll", hideTip, { passive: true });

  /* ---------- Top bar, active section and status bar ---------- */
  const topbar = document.querySelector(".topbar");
  new IntersectionObserver(([e]) => topbar.classList.toggle("is-on", !e.isIntersecting), { threshold: 0 })
    .observe(document.querySelector(".dek"));

  const statusL = document.getElementById("status-left");
  const statusR = document.getElementById("status-right");
  const partTitle = Object.fromEntries(DATA.parts.map((p) => [p.num, p.title]));
  const links = Object.fromEntries([...document.querySelectorAll(".topbar-links a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const zones = [
    ["top", () => [`${POOL.length} micro-responses by twenty classmates`, "30 selected"]],
    ["essay", () => ["Framing essay", `${document.querySelectorAll(".ref").length} references to the collection`]],
    ["semester", () => ["The semester, week by week", `${POOL.length} micro-responses`]],
    ["record", () => ["The record", "30 commits, one per selection"]],
    ["sources", () => ["Sources and credits", "15 contributors"]],
  ];
  const setLink = (id) => Object.entries(links).forEach(([k, a]) => a.setAttribute("aria-current", k === id ? "true" : "false"));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      if (el.classList.contains("item")) {
        const it = ITEMS[el.dataset.id];
        const kind = it.type === "excerpt" ? "excerpt" : "response";
        statusL.textContent = `Part ${it.part}, ${partTitle[it.part]}: ${it.name}, week ${it.week} ${kind}`;
        statusR.textContent = `Item ${it.id} of 30`;
        setLink({ I: "making-choices", II: "handing-them-off", III: "whats-left" }[it.part]);
        return;
      }
      const z = zones.find(([id]) => id === el.id);
      if (z) { const [l, r] = z[1](); statusL.textContent = l; statusR.textContent = r; setLink(el.id); }
      if (el.classList.contains("part")) setLink(el.id);
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll(".item, .part, #top, #essay, #semester, #record, #sources").forEach((el) => io.observe(el));
})();
