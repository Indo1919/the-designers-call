/* The table: thirty micro-responses set back at the seminar table where they
   were written. Click anyone to fly into their seat and see the room through
   their eyes. Built with three.js; every object comes from the data payload. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/OrbitControls.js";
import { RoomEnvironment } from "three/addons/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/RoundedBoxGeometry.js";

const D = JSON.parse(document.getElementById("payload").textContent);
const ITEMS = D.items;
const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const PART = Object.fromEntries(D.parts.map((p) => [p.num, p]));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(pointer: coarse)").matches;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const slugName = (n) => n.toLowerCase().replace(/\s+/g, "-");

/* ------------------------------------------------------------------ setup */
const canvas = $("scene");
const room = $("room");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (e) {
  room.classList.add("no-gl");
  $("veil").innerHTML = '<p>This browser can’t draw the 3D table. <a href="collection.html">Read the collection</a> instead.</p>';
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const BG = new THREE.Color("#0b0d10");
scene.background = BG;
scene.fog = new THREE.Fog(BG, 11, 26);
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
scene.environment = envTex;

const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 60);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enableZoom = false;          // the page has to scroll; zoom lives on buttons and pinch
controls.enablePan = false;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = 1.32;
controls.minDistance = 4.2;
controls.maxDistance = 16;
controls.rotateSpeed = 0.55;
controls.target.set(-0.4, 0.55, 0);

/* ------------------------------------------------------------------ lights */
scene.add(new THREE.HemisphereLight("#b9c6d6", "#1a140f", 0.55));
const key = new THREE.SpotLight("#ffe2bd", 175, 0, 0.8, 0.8, 2);
key.position.set(0.2, 6.2, 1.1);
key.target.position.set(-0.2, 0.7, 0);
key.castShadow = true;
key.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
key.shadow.camera.near = 2;
key.shadow.camera.far = 12;
scene.add(key, key.target);
const fill = new THREE.SpotLight("#cfe0ff", 60, 0, 0.9, 1, 2);
fill.position.set(-2.8, 5, -3.5);
fill.target.position.set(0, 0.6, 0);
scene.add(fill, fill.target);
const screenGlow = new THREE.PointLight("#9fc4ff", 9, 9, 2);
screenGlow.position.set(-5.6, 1.9, 0);
scene.add(screenGlow);

/* ------------------------------------------------------------------ textures drawn in canvas */
function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const SERIF = "Literata, Georgia, 'Times New Roman', serif";
const SANS = "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

function woodTexture() {
  return canvasTex(2048, 1024, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = "#7a4e2d"; g.fillRect(0, 0, w, h);
    // planks along the long axis
    const planks = 6;
    for (let p = 0; p < planks; p++) {
      const y0 = (p * h) / planks, ph = h / planks;
      const tone = 0.86 + r() * 0.22;
      g.fillStyle = `rgba(${(122 * tone) | 0},${(80 * tone) | 0},${(46 * tone) | 0},1)`;
      g.fillRect(0, y0, w, ph);
      for (let k = 0; k < 140; k++) {
        const yy = y0 + r() * ph, amp = 2 + r() * 9, f = 0.002 + r() * 0.006, ph2 = r() * 6;
        g.strokeStyle = `rgba(${40 + r() * 30},${22 + r() * 18},${10 + r() * 10},${0.05 + r() * 0.16})`;
        g.lineWidth = 0.6 + r() * 2.2;
        g.beginPath();
        for (let x = 0; x <= w; x += 16) { const y = yy + Math.sin(x * f + ph2) * amp + Math.sin(x * f * 3.1) * amp * 0.25; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
      g.fillStyle = "rgba(20,10,4,.35)"; g.fillRect(0, y0, w, 1.5);
    }
    // a few knots
    for (let k = 0; k < 7; k++) {
      const x = r() * w, y = r() * h, rr = 8 + r() * 18;
      const gr = g.createRadialGradient(x, y, 1, x, y, rr * 2.4);
      gr.addColorStop(0, "rgba(45,24,10,.55)"); gr.addColorStop(1, "rgba(45,24,10,0)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr * 3, rr, 0, 0, Math.PI * 2); g.fill();
    }
  });
}
function noiseTexture(base, amt, rep) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(3), img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * amt; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    g.putImageData(img, 0, 0);
  }, { repeat: rep });
}

/* wraps text into lines that fit `maxW`, returning words with their char offsets */
function layoutWords(g, text, maxW) {
  const words = []; let i = 0;
  text.split(/(\s+)/).forEach((tok) => { if (tok.trim()) words.push({ t: tok, s: i, e: i + tok.length }); i += tok.length; });
  const lines = []; let line = [], lw = 0; const sp = g.measureText(" ").width;
  words.forEach((wd) => {
    wd.w = g.measureText(wd.t).width;
    if (line.length && lw + sp + wd.w > maxW) { lines.push(line); line = []; lw = 0; }
    lw += (line.length ? sp : 0) + wd.w; line.push(wd);
  });
  if (line.length) lines.push(line);
  return { lines, sp };
}

function paperTexture(it) {
  const W = 760, Hh = 1075;
  return canvasTex(W, Hh, (g) => {
    const resp = it.type === "response";
    g.fillStyle = resp ? "#f5f0e3" : "#fbfaf6"; g.fillRect(0, 0, W, Hh);
    const r = rng(parseInt(it.id, 10) * 31);
    for (let k = 0; k < 2200; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.025})`; g.fillRect(r() * W, r() * Hh, 1.5, 1.5); }
    if (resp) { g.strokeStyle = "rgba(90,130,190,.16)"; g.lineWidth = 1.2; for (let y = 210; y < Hh - 80; y += 38) { g.beginPath(); g.moveTo(52, y); g.lineTo(W - 52, y); g.stroke(); } g.strokeStyle = "rgba(200,80,80,.22)"; g.beginPath(); g.moveTo(88, 0); g.lineTo(88, Hh); g.stroke(); }
    const ml = 104, mr = W - 64;
    g.fillStyle = "#1f2328";
    g.font = `500 30px ${MONO}`; g.fillText("No. " + it.id, ml, 92);
    g.font = `400 26px ${SANS}`; g.fillStyle = "#59636e";
    const meta = `${resp ? "Response" : "Excerpt"}, week ${it.week}`;
    g.fillText(meta, mr - g.measureText(meta).width, 92);
    g.fillStyle = PART[it.part].color; g.fillRect(ml, 116, 46, 6);
    g.fillStyle = "#1f2328"; g.font = `500 34px ${SANS}`; g.fillText(it.name, ml, 168);
    // body, auto-fit
    const top = 228, bottom = Hh - 150, maxW = mr - ml;
    const ms = it.text.indexOf(it.mark), me = ms + it.mark.length;
    let size = 40, L;
    for (; size >= 15; size -= 1) {
      g.font = `${resp ? 400 : 400} ${size}px ${SERIF}`;
      L = layoutWords(g, (resp ? "" : "“") + it.text + (resp ? "" : "”"), maxW);
      if (L.lines.length * size * 1.42 <= bottom - top) break;
    }
    const lh = size * 1.42, off = resp ? 0 : 1;
    L.lines.forEach((line, li) => {
      let x = ml; const y = top + li * lh + size;
      line.forEach((wd, wi) => {
        const inMark = ms >= 0 && wd.s - off < me && wd.e - off > ms;
        if (inMark) { g.fillStyle = "rgba(255,221,87,.78)"; const next = line[wi + 1]; const nIn = next && next.s - off < me && next.e - off > ms; g.fillRect(x - 3, y - size * 0.86, wd.w + (nIn ? L.sp : 0) + 6, size * 1.1); }
        g.fillStyle = "#1f2328"; g.fillText(wd.t, x, y);
        x += wd.w + L.sp;
      });
    });
    g.font = `400 22px ${SANS}`; g.fillStyle = "#6e7781";
    const foot = resp ? `Responding to ${it.to}` : D.readings.find((r2) => r2.key === it.source).author + ", " + D.readings.find((r2) => r2.key === it.source).title;
    const fl = layoutWords(g, foot, maxW).lines.slice(0, 2);
    fl.forEach((line, i) => g.fillText(line.map((w) => w.t).join(" "), ml, Hh - 92 + i * 30));
  });
}

function nameCardTexture(name, sub) {
  return canvasTex(640, 220, (g, w, h) => {
    g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1f2328"; g.font = `500 ${name.length > 9 ? 66 : 80}px ${SANS}`;
    const tw = g.measureText(name).width; g.fillText(name, (w - tw) / 2, 128);
    g.fillStyle = "#6e7781"; g.font = `400 28px ${MONO}`; const sw = g.measureText(sub).width; g.fillText(sub, (w - sw) / 2, 182);
  });
}

function packetTexture(rd) {
  return canvasTex(700, 990, (g, w, h) => {
    g.fillStyle = "#f7f5ef"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#59636e"; g.font = `400 26px ${MONO}`; g.fillText("Reading", 70, 96);
    g.fillStyle = "#1f2328"; g.font = `500 54px ${SERIF}`;
    const tl = layoutWords(g, rd.title, w - 140).lines;
    tl.forEach((ln, i) => g.fillText(ln.map((x) => x.t).join(" "), 70, 200 + i * 66));
    const y1 = 200 + tl.length * 66 + 20;
    g.font = `400 34px ${SANS}`; g.fillText(rd.author, 70, y1);
    g.fillStyle = "#6e7781"; g.font = `400 26px ${SANS}`; g.fillText(rd.pub, 70, y1 + 46);
    g.fillStyle = "rgba(31,35,40,.18)";
    const r = rng(rd.key.length * 13);
    for (let y = y1 + 120; y < h - 80; y += 30) g.fillRect(70, y, (w - 140) * (y % 210 === 0 ? 0.55 : 0.82 + r() * 0.18), 9);
  });
}

function stackTopTexture(wk) {
  return canvasTex(420, 594, (g, w, h) => {
    g.fillStyle = "#f4f2ec"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1f2328"; g.font = `500 64px ${SANS}`; g.fillText("Week " + wk.w, 40, 120);
    g.fillStyle = "#59636e"; g.font = `400 30px ${MONO}`; g.fillText(`${wk.total} entries`, 40, 176);
    if (wk.chosen) g.fillText(`${wk.chosen} kept`, 40, 220);
    g.fillStyle = "rgba(31,35,40,.14)";
    for (let y = 290; y < h - 50; y += 26) g.fillRect(40, y, (w - 80) * (0.7 + ((y * 7) % 30) / 100), 8);
  });
}
const edgeTex = canvasTex(64, 256, (g, w, h) => {
  g.fillStyle = "#ece8df"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${0.05 + ((y * 13) % 7) / 90})`; g.fillRect(0, y, w, 1); }
}, { repeat: [1, 1] });

function screenTexture() {
  return canvasTex(1600, 900, (g, w, h) => {
    g.fillStyle = "#0d1420"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#3b8bff"; g.fillRect(120, 300, 90, 7);
    g.fillStyle = "#c9d1d9"; g.font = `400 84px ${SERIF}`;
    g.fillText("Taste, choice, and AI", 120, 420);
    g.fillStyle = "#6e7681"; g.font = `400 36px ${SANS}`; g.fillText("Visual Culture Seminar, fall 2026", 124, 500);
    g.fillStyle = "rgba(201,209,217,.12)";
    for (let i = 0; i < 10; i++) g.fillRect(124 + i * 128, 640, 96, 96 * (0.25 + (i % 4) * 0.22));
  });
}
/* ------------------------------------------------------------------ the room */
const TABLE = { L: 8.2, W: 2.6, H: 0.75, T: 0.045 };
const TOP_Y = TABLE.H;
const env = (m, k = 0.35) => { m.envMapIntensity = k; return m; };

const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), env(new THREE.MeshStandardMaterial({ map: noiseTexture("#1d1b19", 26, [24, 24]), roughness: 0.96 }), 0.15));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 7), env(new THREE.MeshStandardMaterial({ color: "#17191d", roughness: 0.92 }), 0.1));
wall.position.set(-6.9, 3.5, 0); wall.rotation.y = Math.PI / 2; wall.receiveShadow = true; scene.add(wall);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.91), new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }));
screen.position.set(-6.86, 2.05, 0); screen.rotation.y = Math.PI / 2; scene.add(screen);
const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.0, 3.5), new THREE.MeshStandardMaterial({ color: "#0c0e11", roughness: 0.6 }));
screenFrame.position.set(-6.885, 2.05, 0); scene.add(screenFrame);

// table top: a long slab with rounded corners
{
  const { L, W } = TABLE, r = 0.42, s = new THREE.Shape();
  s.moveTo(-L / 2 + r, -W / 2); s.lineTo(L / 2 - r, -W / 2); s.quadraticCurveTo(L / 2, -W / 2, L / 2, -W / 2 + r);
  s.lineTo(L / 2, W / 2 - r); s.quadraticCurveTo(L / 2, W / 2, L / 2 - r, W / 2); s.lineTo(-L / 2 + r, W / 2);
  s.quadraticCurveTo(-L / 2, W / 2, -L / 2, W / 2 - r); s.lineTo(-L / 2, -W / 2 + r); s.quadraticCurveTo(-L / 2, -W / 2, -L / 2 + r, -W / 2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: TABLE.T, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.008, bevelSegments: 3, curveSegments: 18 });
  geo.rotateX(Math.PI / 2); geo.translate(0, TOP_Y, 0);
  const wood = woodTexture(); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(1 / L, 1 / W); wood.offset.set(0.5, 0.5);
  const top = new THREE.Mesh(geo, env(new THREE.MeshStandardMaterial({ map: wood, roughness: 0.42, metalness: 0.0 }), 0.6));
  top.castShadow = true; top.receiveShadow = true; scene.add(top);
  const legMat = new THREE.MeshStandardMaterial({ color: "#1b1d21", roughness: 0.45, metalness: 0.6 });
  [-2.9, 0, 2.9].forEach((x) => {
    const leg = new THREE.Mesh(new RoundedBoxGeometry(0.08, TABLE.H - 0.06, 1.5, 2, 0.02), legMat);
    leg.position.set(x, (TABLE.H - 0.06) / 2, 0); leg.castShadow = true; scene.add(leg);
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.03, 1.9, 2, 0.012), legMat);
    foot.position.set(x, 0.015, 0); scene.add(foot);
  });
}
// pendant lights
{
  const housing = new THREE.MeshStandardMaterial({ color: "#121417", roughness: 0.4, metalness: 0.7 });
  const glow = new THREE.MeshBasicMaterial({ color: "#fff1dc", toneMapped: false });
  [-2.1, 2.1].forEach((x) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.05, 0.14), housing); bar.position.set(x, 2.75, 0); scene.add(bar);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.005, 0.1), glow); strip.position.set(x, 2.722, 0); scene.add(strip);
    [-1.3, 1.3].forEach((dx) => { const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 2.2), housing); w2.position.set(x + dx, 3.85, 0); scene.add(w2); });
  });
}

/* ------------------------------------------------------------------ seats */
const SEATS = [];          // every chair, named or not
const SEAT = {};           // by name
const SIDE_X = (i) => -3.35 + i * 0.76;
const SIDE_Z = 1.78, FRONT_X = -4.62;
D.sideA.forEach((name, i) => SEATS.push({ name, side: "A", x: SIDE_X(i), z: SIDE_Z, yaw: Math.PI }));      // faces -z
D.sideB.forEach((name, i) => SEATS.push({ name, side: "B", x: SIDE_X(i), z: -SIDE_Z, yaw: 0 }));           // faces +z
D.front.forEach((f, i) => SEATS.push({ name: f.name, role: f.role, side: "F", x: FRONT_X, z: -0.96 + i * 0.64, yaw: Math.PI / 2 })); // faces +x
SEATS.forEach((s) => {
  s.dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw));
  if (s.name) SEAT[s.name] = s;
  s.items = ITEMS.filter((it) => it.name === s.name);
  s.answeredBy = ITEMS.filter((it) => (it.answers || []).includes(s.name));
});
// ring order for previous / next
const RING = [...D.front.map((f) => f.name), ...D.sideA.filter(Boolean), ...[...D.sideB].reverse().filter(Boolean)];

const SHIRTS = ["#4a6fa5", "#c76b4a", "#5b8c6b", "#8a6bb0", "#d4a24c", "#3f7f8c", "#b05a7a", "#6d7a8a", "#a0603a", "#4f5b9c", "#7a9a4a", "#c05050", "#5a8aa0", "#9a7a5a", "#6a5aa0"];
const chairSeat = env(new THREE.MeshStandardMaterial({ color: "#2b2f36", roughness: 0.85 }), 0.2);
const chairMetal = new THREE.MeshStandardMaterial({ color: "#8a9099", roughness: 0.35, metalness: 0.8 });
const ghostMat = new THREE.MeshStandardMaterial({ color: "#9aa4af", roughness: 0.5, transparent: true, opacity: 0.16, depthWrite: false });
const pantsMat = env(new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.8 }), 0.2);

// a face painted onto the head: two eyes and a small smile, so each head is one mesh
const faceTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = "#efe7dc"; g.fillRect(0, 0, w, h);
  const cx = w * 0.25;
  g.fillStyle = "#1d2026";
  [-1, 1].forEach((k) => { g.beginPath(); g.ellipse(cx + k * 25, h * 0.43, 7, 9, 0, 0, Math.PI * 2); g.fill(); });
  g.strokeStyle = "#1d2026"; g.lineWidth = 4.5; g.lineCap = "round";
  g.beginPath(); g.arc(cx, h * 0.47, 19, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
});
const headMat = env(new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.55 }), 0.4);
const plainHead = env(new THREE.MeshStandardMaterial({ color: "#efe7dc", roughness: 0.55 }), 0.4);

const G = {
  chairSeat: new RoundedBoxGeometry(0.46, 0.06, 0.44, 2, 0.025),
  chairBack: new RoundedBoxGeometry(0.44, 0.36, 0.05, 2, 0.022),
  leg: new THREE.CylinderGeometry(0.012, 0.012, 0.44, 6),
  head: new THREE.SphereGeometry(0.135, 32, 20),
  thigh: new THREE.CapsuleGeometry(0.068, 0.28, 3, 8),
};

/* merge indexed geometries (each already transformed) into one */
function merge(geos) {
  const pos = [], nor = [], uv = [], idx = []; let off = 0;
  geos.forEach((g) => {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
    else for (let i = 0; i < p.count; i++) idx.push(i + off);
    off += p.count;
  });
  const m = new THREE.BufferGeometry();
  m.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  m.computeBoundingSphere();
  return m;
}
const _o = new THREE.Object3D();
function xf(geo, pos, rot = [0, 0, 0], scl = [1, 1, 1]) {
  _o.position.set(...pos); _o.rotation.set(...rot); _o.scale.set(...scl); _o.updateMatrix();
  return geo.clone().applyMatrix4(_o.matrix);
}
// one body (torso + both arms) and one pair of hands, shared by everyone
const BODY = (() => {
  const parts = [xf(new THREE.CapsuleGeometry(0.16, 0.26, 6, 18), [0, 0.84, 0], [0.08, 0, 0])];
  [-1, 1].forEach((k) => {
    const sh = new THREE.Vector3(0.2 * k, 1.03, 0.0), hand = new THREE.Vector3(0.17 * k, TOP_Y + 0.05, 0.47);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), hand.clone().sub(sh).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    const mid = sh.clone().lerp(hand, 0.5);
    parts.push(xf(new THREE.CapsuleGeometry(0.05, 0.26, 4, 10), [mid.x, mid.y, mid.z], [e.x, e.y, e.z], [1, sh.distanceTo(hand) / 0.36, 1]));
  });
  return merge(parts);
})();
const HANDS = merge([-1, 1].map((k) => xf(new THREE.SphereGeometry(0.052, 14, 10), [0.17 * k, TOP_Y + 0.05, 0.47])));
const CARD = (() => {
  const h = 0.085, w = 0.25, tilt = 0.32;
  return merge([
    xf(new THREE.PlaneGeometry(w, h), [0, (h / 2) * Math.cos(tilt), (h / 2) * Math.sin(tilt)], [-tilt, 0, 0]),
    (() => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(Math.PI); g.rotateX(tilt); g.translate(0, (h / 2) * Math.cos(tilt), -(h / 2) * Math.sin(tilt)); return g; })(),
  ]);
})();

function place(obj, s, forward, up = 0, side = 0) {
  // local coords relative to a seat: forward = toward the table
  const right = new THREE.Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
  obj.position.set(s.x + s.dir.x * forward + right.x * side, up, s.z + s.dir.z * forward + right.z * side);
}

const pickables = [];
let shirtIdx = 0;
const chairM = { seat: [], back: [], leg: [] }, legM = { named: [], ghost: [] };
const tmpG = new THREE.Group(), tmpC = new THREE.Object3D();
function collect(list, s, forward, local) {
  place(tmpG, s, forward); tmpG.rotation.set(0, s.yaw, 0); tmpG.updateMatrix();
  tmpC.position.set(...local.p); tmpC.rotation.set(...(local.r || [0, 0, 0])); tmpC.updateMatrix();
  list.push(new THREE.Matrix4().multiplyMatrices(tmpG.matrix, tmpC.matrix));
}
SEATS.forEach((s, si) => {
  collect(chairM.seat, s, -0.08, { p: [0, 0.46, 0] });
  collect(chairM.back, s, -0.08, { p: [0, 0.74, -0.21], r: [-0.08, 0, 0] });
  [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]].forEach(([x, z]) => collect(chairM.leg, s, -0.08, { p: [x, 0.22, z] }));
  const named = !!s.name;
  [-1, 1].forEach((k) => {
    collect(named ? legM.named : legM.ghost, s, 0, { p: [0.1 * k, 0.55, 0.2], r: [Math.PI / 2, 0, 0] });
    collect(named ? legM.named : legM.ghost, s, 0, { p: [0.1 * k, 0.26, 0.38] });
  });

  const person = new THREE.Group();
  const shirt = named ? env(new THREE.MeshStandardMaterial({ color: s.side === "F" ? "#2d323b" : SHIRTS[shirtIdx++ % SHIRTS.length], roughness: 0.78 }), 0.3) : ghostMat;
  const body = new THREE.Mesh(BODY, shirt);
  const hands = new THREE.Mesh(HANDS, named ? plainHead : ghostMat);
  const headG = new THREE.Group(); headG.position.set(0, 1.27, 0.02);
  const head = new THREE.Mesh(G.head, named ? headMat : ghostMat);
  headG.add(head);
  person.add(body, hands, headG);
  if (named) [body, head].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  place(person, s, 0); person.rotation.y = s.yaw;
  scene.add(person);
  Object.assign(s, { person, torso: body, headG, head, arms: [], hands: [hands], shirt, phase: si * 0.77, headYaw: 0 });
  if (named) {
    [body, head].forEach((m) => { m.userData = { kind: "seat", name: s.name }; pickables.push(m); });
    s.eye = new THREE.Vector3(); s.eye.copy(person.position).add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(s.dir, 0.06);

    // name card: a folded tent card facing the room
    const sub = s.side === "F" ? (s.answeredBy.length ? `${s.answeredBy.length} answered` : s.role) : `${s.items.length} ${s.items.length === 1 ? "entry" : "entries"}`;
    const cardMat = env(new THREE.MeshStandardMaterial({ map: nameCardTexture(s.name, sub), roughness: 0.7 }), 0.4);
    const tent = new THREE.Mesh(CARD, cardMat);
    tent.userData = { kind: "seat", name: s.name }; pickables.push(tent); tent.castShadow = true;
    place(tent, s, 0.56, TOP_Y + 0.002, s.side === "F" ? 0 : 0.27); tent.rotation.y = s.yaw;
    scene.add(tent); s.card = tent;
  }
});
function instanced(geo, mat, mats, shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((mx, i) => m.setMatrixAt(i, mx));
  m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m;
}
instanced(G.chairSeat, chairSeat, chairM.seat);
instanced(G.chairBack, chairSeat, chairM.back);
instanced(G.leg, chairMetal, chairM.leg, false);
instanced(G.thigh, pantsMat, legM.named, false);
instanced(G.thigh, ghostMat, legM.ghost, false);

/* ------------------------------------------------------------------ sheets of paper */
const PAPER = { w: 0.21, h: 0.297 };
const paperGeo = new THREE.PlaneGeometry(PAPER.w, PAPER.h);
const borderGeo = new THREE.PlaneGeometry(PAPER.w + 0.034, PAPER.h + 0.034);
const SHEETS = [];
Object.values(SEAT).forEach((s) => {
  const k = s.items.length;
  s.items.forEach((it, j) => {
    const g = new THREE.Group();
    const r = rng(parseInt(it.id, 10) * 97);
    const mat = env(new THREE.MeshStandardMaterial({ map: paperTexture(it), roughness: 0.92, transparent: true }), 0.35);
    const m = new THREE.Mesh(paperGeo, mat); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.castShadow = true;
    const bmat = new THREE.MeshBasicMaterial({ color: PART[it.part].color, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const b = new THREE.Mesh(borderGeo, bmat); b.rotation.x = -Math.PI / 2; b.position.y = -0.0004;
    g.add(b, m);
    const side = (j - (k - 1) / 2) * 0.19;
    place(g, s, 0.82 + r() * 0.04, TOP_Y + 0.003 + j * 0.0012, side);
    g.rotation.y = s.yaw + Math.PI + (r() - 0.5) * 0.22;
    scene.add(g);
    m.userData = { kind: "sheet", id: it.id }; pickables.push(m);
    const sh = { it, g, m, mat, bmat, home: g.position.clone(), homeRot: g.rotation.y, lift: 0, liftT: 0, vis: 1, visT: 1, fly: null };
    SHEETS.push(sh); it._sheet = sh;
  });
});

/* ------------------------------------------------------------------ the semester in ten stacks */
const STACKS = D.weeks.map((wk, i) => {
  const h = Math.max(0.004, wk.total * 0.0026);
  const geo = new THREE.BoxGeometry(PAPER.w, 1, PAPER.h);
  const sideMat = env(new THREE.MeshStandardMaterial({ map: edgeTex, color: "#cfcac0", roughness: 0.95 }), 0.25);
  const topMat = env(new THREE.MeshStandardMaterial({ map: stackTopTexture(wk), color: "#d8d3c9", roughness: 0.95 }), 0.25);
  const m = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
  const x = -2.62 + i * 0.6;
  m.position.set(x, TOP_Y + h / 2, 0); m.scale.y = h;
  m.rotation.y = Math.PI / 2 + (((i * 37) % 9) - 4) * 0.02;
  m.castShadow = true; m.receiveShadow = true;
  m.userData = { kind: "stack", w: wk.w };
  scene.add(m); pickables.push(m);
  return { wk, m, h, x, s: 1, sT: 1 };
});

/* ------------------------------------------------------------------ the readings */
const READ = {};
D.readings.forEach((rd, i) => {
  const g = new THREE.Group();
  const tex = packetTexture(rd);
  const mat = env(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), 0.35);
  for (let k = 0; k < 3; k++) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), k === 2 ? mat : env(new THREE.MeshStandardMaterial({ color: "#efece4", roughness: 0.95 }), 0.3));
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(k * 0.002, k * 0.0012, -k * 0.002); sheet.receiveShadow = true; sheet.castShadow = k === 2;
    if (k === 2) { sheet.userData = { kind: "reading", key: rd.key }; pickables.push(sheet); }
    g.add(sheet);
  }
  const staple = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.003), chairMetal); staple.position.set(-0.08, 0.005, -0.125); staple.rotation.y = 0.7; g.add(staple);
  const col = i % 2, row = Math.floor(i / 2);
  g.position.set(-3.62 + col * 0.36, TOP_Y + 0.002, -0.56 + row * 0.56);
  g.rotation.y = Math.PI / 2 + (((i * 53) % 7) - 3) * 0.05;
  scene.add(g);
  READ[rd.key] = { rd, g, pos: g.position.clone().add(new THREE.Vector3(0, 0.01, 0)) };
});

/* ------------------------------------------------------------------ threads */
const THREADS = [];
const threadGroup = new THREE.Group(); scene.add(threadGroup);
const pulseGeo = new THREE.SphereGeometry(0.016, 10, 8);
function headPos(name) { const s = SEAT[name]; return s ? s.person.position.clone().add(new THREE.Vector3(0, 1.27, 0)) : null; }
SHEETS.forEach((sh) => {
  const it = sh.it;
  const ends = it.type === "response" ? it.answers.map((n) => ({ p: headPos(n), to: n })).filter((e) => e.p) : [{ p: READ[it.source].pos, to: it.source }];
  ends.forEach((e) => {
    const a = sh.home.clone().add(new THREE.Vector3(0, 0.01, 0)), b = e.p;
    const mid = a.clone().lerp(b, 0.5); mid.y += 0.45 + a.distanceTo(b) * 0.16;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const color = it.type === "response" ? "#58a6ff" : "#f2c98a";
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.0045, 6), mat);
    const pmat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, toneMapped: false });
    const pulse = new THREE.Mesh(pulseGeo, pmat);
    threadGroup.add(tube, pulse);
    THREADS.push({ it, to: e.to, from: it.name, curve, mat, pmat, pulse, off: Math.random(), a: 0, aT: 0 });
  });
});

/* ------------------------------------------------------------------ resize */
let shift = 0, shiftT = 0;   // how far the view centre moves aside for the seat panel (0 to 1)
let baseFov = 40;
function applyView() {
  const w = room.clientWidth, h = room.clientHeight;
  camera.fov = baseFov;
  if (shift < 0.001) { camera.clearViewOffset(); camera.aspect = w / h; camera.updateProjectionMatrix(); return; }
  if (w >= 760) {
    const px = Math.min(432, w * 0.4) * shift;
    camera.aspect = (w + px) / h;
    camera.setViewOffset(w + px, h, 0, 0, w, h);
  } else {
    const py = h * 0.5 * shift;
    camera.aspect = w / (h + py);
    camera.fov = (2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * ((h + py) / h)) * 180) / Math.PI;
    camera.setViewOffset(w, h + py, 0, py, w, h);
  }
  camera.updateProjectionMatrix();
}
function resize() {
  renderer.setSize(room.clientWidth, room.clientHeight, false);
  applyView();
}
new ResizeObserver(resize).observe(room);
resize();

/* ------------------------------------------------------------------ camera states */
const OVERVIEW = { pos: new THREE.Vector3(3.9, 4.5, 6.9), look: new THREE.Vector3(-0.2, 0.62, 0.15), fov: 40 };
const isNarrow = () => room.clientWidth < 760;
function overviewPose() {
  // portrait screens look down the length of the table, toward the screen, like a seat in a cinema
  return isNarrow() ? { pos: new THREE.Vector3(8.4, 7.6, 3.4), look: new THREE.Vector3(-1.1, 0.2, -0.1), fov: 52 } : OVERVIEW;
}
let mode = "intro";   // intro | orbit | fly | seat
let fly = null;
let current = null;   // seat in first person
const look = { yaw: 0, pitch: 0, yawT: 0, pitchT: 0 };

function startFly(toPos, toLook, toFov, dur, then) {
  const fromPos = camera.position.clone();
  const dirV = new THREE.Vector3(); camera.getWorldDirection(dirV);
  const fromLook = camera.position.clone().addScaledVector(dirV, Math.max(1, camera.position.distanceTo(toLook)));
  const ctrl = fromPos.clone().lerp(toPos, 0.5); ctrl.y = Math.max(fromPos.y, toPos.y) + 0.9 + fromPos.distanceTo(toPos) * 0.12;
  fly = { t0: performance.now(), dur: reduceMotion ? 1 : dur, fromPos, toPos, ctrl, fromLook, toLook: toLook.clone(), fromFov: baseFov, toFov, then };
  controls.enabled = false;
  mode = "fly";
}
function seatLookTarget(s, yaw, pitch) {
  const baseYaw = s.yaw + yaw;
  const d = new THREE.Vector3(Math.sin(baseYaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(baseYaw) * Math.cos(pitch));
  return s.eye.clone().add(d);
}

/* ------------------------------------------------------------------ sitting down */
const seatEl = $("seat"), seatBody = $("seat-body");
function sit(name, { instant = false } = {}) {
  const s = SEAT[name];
  if (!s) return;
  closeReader();
  if (current && current !== s) showPerson(current, true);
  current = s;
  look.yaw = look.yawT = 0;
  look.pitch = look.pitchT = isNarrow() ? (s.side === "F" ? -0.04 : -0.13) : (s.side === "F" ? -0.12 : -0.3);
  shiftT = 1;
  const fov = isNarrow() ? 64 : 58;
  const target = seatLookTarget(s, 0, look.pitch);
  const done = () => { mode = "seat"; showPerson(s, false); };
  if (instant) { camera.position.copy(s.eye); baseFov = fov; applyView(); camera.lookAt(target); done(); }
  else startFly(s.eye, target, fov, mode === "seat" ? 1300 : 1900, done);
  setTimeout(() => showPerson(s, false), instant ? 0 : (reduceMotion ? 0 : 1300));
  renderSeatPanel(s);
  room.classList.add("is-seated");
  seatEl.hidden = false;
  history.replaceState(null, "", "#seat-" + slugName(name));
  markPicker(name);
  setLensThreads();
}
function standUp() {
  if (!current) return;
  showPerson(current, true);
  current = null;
  shiftT = 0;
  seatEl.hidden = true;
  room.classList.remove("is-seated");
  history.replaceState(null, "", location.pathname + location.search);
  markPicker(null);
  const o = overviewPose();
  startFly(o.pos, o.look, o.fov, 1700, () => { mode = "orbit"; controls.target.copy(o.look); controls.enabled = true; });
  setLensThreads();
}
function showPerson(s, on) { s.torso.visible = on; s.headG.visible = on; s.hands.forEach((h) => (h.visible = on)); if (s.card) s.card.visible = on; }
function lookAtPoint(p) {
  if (!current) return;
  const d = p.clone().sub(current.eye);
  const yawWorld = Math.atan2(d.x, d.z);
  let dy = yawWorld - current.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  look.yawT = clamp(dy, -1.9, 1.9);
  look.pitchT = clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -1.25, 0.5);
}
function step(dir) {
  if (!current) return;
  const i = RING.indexOf(current.name);
  sit(RING[(i + dir + RING.length) % RING.length]);
}

function partChip(p) { return `<span class="pc" style="--c:${PART[p].color}">${p}. ${esc(PART[p].title)}</span>`; }
function renderSeatPanel(s) {
  let h = "";
  if (s.side === "F") {
    h += `<p class="seat-kicker">${esc(s.role)}</p><h2>${esc(s.name)}</h2>`;
    if (s.answeredBy.length) {
      h += `<p class="seat-sub">${s.answeredBy.length} ${s.answeredBy.length === 1 ? "response" : "responses"} in the collection answer ${esc(s.name.split(" ")[0])}. From here you can see who wrote them.</p><ol class="seat-list">`;
      s.answeredBy.forEach((it) => {
        h += `<li class="card">${partChip(it.part)}<p class="card-meta">No. ${it.id}, ${esc(it.name)}, week ${it.week}</p><p class="card-mark">${esc(it.mark)}</p>
          <div class="card-act"><button data-act="read" data-id="${it.id}">Read in full</button><button data-act="face" data-name="${esc(it.name)}">Look at ${esc(it.name)}</button><button data-act="sit" data-name="${esc(it.name)}">Sit there</button></div></li>`;
      });
      h += "</ol>";
    } else h += `<p class="seat-sub">${esc(s.name)} appears in the entries as someone the class was listening to.</p>`;
  } else {
    const weeks = [...new Set(s.items.map((i) => i.week))];
    h += `<p class="seat-kicker">You’re sitting in</p><h2>${esc(s.name)}’s seat</h2>
      <p class="seat-sub">${s.items.length} ${s.items.length === 1 ? "entry" : "entries"} in the collection, from week${weeks.length > 1 ? "s" : ""} ${weeks.join(" and ")}. The sheets in front of you are theirs.</p><ol class="seat-list">`;
    s.items.forEach((it) => {
      const tgt = it.type === "response"
        ? it.answers.map((n) => `<button data-act="face" data-name="${esc(n)}">Look at ${esc(n)}</button>`).join("")
        : `<button data-act="reading" data-key="${it.source}">Look at the reading</button>`;
      h += `<li class="card">${partChip(it.part)}<p class="card-meta">No. ${it.id}, ${it.type}, week ${it.week}${it.type === "response" ? `, answering ${esc(it.to)}` : `, from ${esc(D.readings.find((r) => r.key === it.source).author)}`}</p>
        <p class="card-mark">${esc(it.mark)}</p>
        <div class="card-act"><button data-act="sheet" data-id="${it.id}">Look down at it</button>${tgt}<button data-act="read" data-id="${it.id}">Read in full</button></div></li>`;
    });
    h += "</ol>";
    if (s.answeredBy.length) h += `<p class="seat-foot">Answered by ${s.answeredBy.map((i) => `<button class="lnk" data-act="sit" data-name="${esc(i.name)}">${esc(i.name)}</button>`).join(", ")}.</p>`;
  }
  seatBody.innerHTML = h;
  seatBody.scrollTop = 0;
}
seatBody.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const a = b.dataset.act;
  if (a === "read") openReader(b.dataset.id);
  else if (a === "sit") sit(b.dataset.name);
  else if (a === "face") lookAtPoint(headPos(b.dataset.name));
  else if (a === "reading") lookAtPoint(READ[b.dataset.key].pos);
  else if (a === "sheet") { const sh = byId[b.dataset.id]._sheet; lookAtPoint(sh.g.position); sh.liftT = 1; setTimeout(() => (sh.liftT = 0), 2200); }
});
$("seat-back").addEventListener("click", standUp);
$("seat-prev").addEventListener("click", () => step(-1));
$("seat-next").addEventListener("click", () => step(1));
addEventListener("keydown", (e) => {
  if ($("reader").open) return;
  if (mode !== "seat" && mode !== "fly") return;
  if (e.key === "Escape") standUp();
  else if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
});

/* ------------------------------------------------------------------ reader */
const reader = $("reader"), readerIn = $("reader-in");
function openReader(id) {
  const it = byId[id];
  const ms = it.text.indexOf(it.mark);
  const body = ms >= 0 ? esc(it.text.slice(0, ms)) + `<mark>${esc(it.mark)}</mark>` + esc(it.text.slice(ms + it.mark.length)) : esc(it.text);
  const foot = it.type === "excerpt"
    ? `<p class="r-cite">${esc(it.cite)}</p><p class="r-by">Excerpt chosen by ${esc(it.name)}, week ${it.week}, before class.</p>`
    : `<p class="r-by">${esc(it.name)}, week ${it.week}, after class. Responding to ${esc(it.to)}.</p>${it.ctx ? `<p class="r-ctx">${esc(it.name)}’s note on what was said: ${esc(it.ctx)}</p>` : ""}`;
  readerIn.innerHTML = `<p class="r-meta">${partChip(it.part)}<span>No. ${it.id} of 30</span><span>Chosen from ${it.chosenFrom} ${it.type === "excerpt" ? "excerpts" : "responses"} that week</span></p>
    <blockquote class="r-text r-text--${it.type}">${body}</blockquote>${foot}
    <div class="r-act">${current && current.name === it.name ? "" : `<button data-act="sit" data-name="${esc(it.name)}">Sit in ${esc(it.name)}’s seat</button>`}<a href="collection.html#item-${it.id}">Open in the collection</a></div>`;
  if (!reader.open) reader.showModal();
}
function closeReader() { if (reader.open) reader.close(); }
$("reader-x").addEventListener("click", closeReader);
reader.addEventListener("click", (e) => {
  if (e.target === reader) closeReader();
  const b = e.target.closest("button[data-act='sit']"); if (b) { closeReader(); sit(b.dataset.name); }
});

/* ------------------------------------------------------------------ lenses */
let lens = "people";
let partOn = null;
let week = 10;
const lensBtns = [...document.querySelectorAll(".lens button")];
const lensDetails = [...document.querySelectorAll(".ld")];
function setLens(k) {
  lens = k;
  lensBtns.forEach((b) => b.setAttribute("aria-selected", b.dataset.lens === k ? "true" : "false"));
  lensDetails.forEach((d) => d.classList.toggle("is-on", d.dataset.for === k));
  if (k !== "weeks") { setWeek(10, false); stopPlay(); }
  if (k !== "parts") setPart(null);
  setLensThreads();
}
lensBtns.forEach((b) => b.addEventListener("click", () => setLens(b.dataset.lens)));
function setLensThreads(hoverName) {
  THREADS.forEach((t) => {
    let on = lens === "threads";
    if (current) on = t.from === current.name;
    if (hoverName && lens === "threads") on = t.from === hoverName || t.to === hoverName;
    if (lens === "weeks" && t.it.week > week) on = false;
    t.aT = on ? 1 : (lens === "threads" && !current ? 0.07 : 0);
  });
}
// parts
document.querySelectorAll(".pchip").forEach((b) => b.addEventListener("click", () => setPart(partOn === b.dataset.part ? null : b.dataset.part)));
function setPart(p) {
  partOn = p;
  document.querySelectorAll(".pchip").forEach((b) => b.setAttribute("aria-pressed", b.dataset.part === p ? "true" : "false"));
}
// weeks
const wkIn = $("wk"), wkOut = $("wk-out"), wkCap = $("wk-cap");
function setWeek(w, animate = true) {
  const prev = week; week = w; wkIn.value = w;
  wkOut.textContent = "Week " + w;
  const wk = D.weeks[w - 1];
  wkCap.textContent = `${wk.total} entries written, ${wk.ai} mention AI, ${wk.chosen} kept for the collection.`;
  STACKS.forEach((st) => (st.sT = st.wk.w <= w ? 1 : 0));
  SHEETS.forEach((sh) => {
    const show = sh.it.week <= w;
    if (show && sh.vis < 0.5 && animate && sh.it.week > prev - 1 && !reduceMotion) {
      // fly from the week's stack to the writer
      const st = STACKS[sh.it.week - 1];
      sh.fly = { t0: performance.now() + Math.random() * 250, from: new THREE.Vector3(st.x, TOP_Y + st.h + 0.02, 0) };
    }
    sh.visT = show ? 1 : 0;
  });
  setLensThreads();
}
wkIn.addEventListener("input", () => { stopPlay(); setWeek(+wkIn.value); });
let playT = 0;
function stopPlay() { clearInterval(playT); playT = 0; $("play").textContent = "Play"; }
$("play").addEventListener("click", () => {
  if (playT) return stopPlay();
  $("play").textContent = "Pause";
  setWeek(1, false);
  playT = setInterval(() => { if (week >= 10) return stopPlay(); setWeek(week + 1); }, 1500);
});

/* ------------------------------------------------------------------ picker (seat map) */
function markPicker(name) {
  document.querySelectorAll("#picker .sm-seat[data-name]").forEach((g) => g.classList.toggle("is-current", g.dataset.name === name));
}
document.querySelectorAll("#picker .sm-seat[data-name]").forEach((g) => {
  const n = g.dataset.name;
  g.addEventListener("click", () => sit(n));
  g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sit(n); } });
  g.addEventListener("pointerenter", () => { hoverSeat = SEAT[n]; setLensThreads(n); });
  g.addEventListener("pointerleave", () => { hoverSeat = null; setLensThreads(); });
});
$("zin").addEventListener("click", () => zoom(0.82));
$("zout").addEventListener("click", () => zoom(1.22));
function zoom(f) {
  if (mode !== "orbit") return;
  const off = camera.position.clone().sub(controls.target);
  const len = clamp(off.length() * f, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).addScaledVector(off.normalize(), len);
}

/* ------------------------------------------------------------------ pointer */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const tip = $("tip3d");
let hover = null, hoverSeat = null, down = null, dragged = false;
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(pickables, false).filter((h) => h.object.visible && (!current || h.object.userData.name !== current.name));
  return hits.length ? hits[0].object.userData : null;
}
function tipFor(u) {
  if (u.kind === "seat") {
    const s = SEAT[u.name];
    if (s.side === "F") return `<b>${esc(s.name)}</b><span>${esc(s.role)}${s.answeredBy.length ? `. ${s.answeredBy.length} ${s.answeredBy.length === 1 ? "response answers" : "responses answer"} them` : ""}</span><em>Click to see the room from here</em>`;
    return `<b>${esc(s.name)}</b><span>${s.items.length} ${s.items.length === 1 ? "entry" : "entries"}: ${s.items.map((i) => "no. " + i.id).join(", ")}</span><em>Click to sit in this seat</em>`;
  }
  if (u.kind === "sheet") { const it = byId[u.id]; return `<b>No. ${it.id}, ${esc(it.name)}</b><span>${it.type === "excerpt" ? "Excerpt" : "Response"}, week ${it.week}</span><q>${esc(it.mark)}</q><em>Click to read</em>`; }
  if (u.kind === "stack") { const wk = D.weeks[u.w - 1]; return `<b>Week ${wk.w}</b><span>${wk.total} entries written, ${wk.ai} mention AI. ${wk.chosen} kept for the collection.</span>`; }
  if (u.kind === "reading") { const rd = READ[u.key].rd; return `<b>${esc(rd.author)}</b><span>${esc(rd.title)}</span><span>Quoted by ${rd.classmates} of 20 classmates. ${rd.ids.length} ${rd.ids.length === 1 ? "excerpt" : "excerpts"} in the collection.</span>`; }
  return "";
}
canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, yaw: look.yawT, pitch: look.pitchT }; dragged = false; canvas.setPointerCapture?.(e.pointerId); });
canvas.addEventListener("pointermove", (e) => {
  if (down) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 5) dragged = true;
    if (mode === "seat" && dragged) {
      look.yawT = clamp(down.yaw - dx * 0.0042, -1.9, 1.9);
      look.pitchT = clamp(down.pitch + dy * 0.0036, -1.25, 0.5);
    }
  }
  if (isTouch && !down) return;
  const u = pick(e);
  hover = u;
  canvas.style.cursor = u && (u.kind === "seat" || u.kind === "sheet") ? "pointer" : (mode === "seat" ? "grab" : "default");
  const name = u && u.kind === "seat" ? u.name : u && u.kind === "sheet" ? byId[u.id].name : null;
  if ((hoverSeat && hoverSeat.name) !== name) { hoverSeat = name ? SEAT[name] : null; setLensThreads(name || undefined); }
  if (u && !down) {
    tip.innerHTML = tipFor(u); tip.hidden = false;
    const r = room.getBoundingClientRect(), tr = tip.getBoundingClientRect();
    let x = e.clientX - r.left + 16, y = e.clientY - r.top + 18;
    if (x + tr.width > r.width - 12) x = e.clientX - r.left - tr.width - 16;
    if (y + tr.height > r.height - 12) y = e.clientY - r.top - tr.height - 16;
    tip.style.transform = `translate(${x}px,${y}px)`;
  } else tip.hidden = true;
});
canvas.addEventListener("pointerup", (e) => {
  const wasDrag = dragged; down = null;
  if (wasDrag) return;
  const u = pick(e);
  if (!u) return;
  tip.hidden = true;
  if (u.kind === "seat") sit(u.name);
  else if (u.kind === "sheet") openReader(u.id);
});
canvas.addEventListener("pointerleave", () => { tip.hidden = true; if (!down) { hoverSeat = null; setLensThreads(); } });

/* ------------------------------------------------------------------ loop */
const clock = new THREE.Clock();
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(room);
const tmpV = new THREE.Vector3();
let rafId = 0;

function update(now, dt) {
  const t = clock.elapsedTime;
  // camera
  if (mode === "fly" && fly) {
    const k = clamp((now - fly.t0) / fly.dur, 0, 1), e = ease(k);
    const a = fly.fromPos, b = fly.toPos, c = fly.ctrl;
    camera.position.set(
      (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * c.x + e * e * b.x,
      (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * c.y + e * e * b.y,
      (1 - e) * (1 - e) * a.z + 2 * (1 - e) * e * c.z + e * e * b.z);
    tmpV.copy(fly.fromLook).lerp(fly.toLook, easeOut(k));
    camera.lookAt(tmpV);
    baseFov = fly.fromFov + (fly.toFov - fly.fromFov) * e; applyView();
    if (k >= 1) { const f = fly; fly = null; f.then && f.then(); }
  } else if (mode === "seat" && current) {
    look.yaw += (look.yawT - look.yaw) * Math.min(1, dt * 6);
    look.pitch += (look.pitchT - look.pitch) * Math.min(1, dt * 6);
    camera.position.copy(current.eye);
    camera.lookAt(seatLookTarget(current, look.yaw, look.pitch));
  } else if (mode === "orbit") {
    controls.update();
  }

  if (Math.abs(shiftT - shift) > 0.001) { shift += (shiftT - shift) * Math.min(1, dt * 4); applyView(); }

  // people breathe and turn toward who they answered when threads are on
  SEATS.forEach((s) => {
    if (!s.person) return;
    s.torso.scale.y = 1 + Math.sin(t * 1.5 + s.phase) * 0.012;
    let yawT = 0;
    if (s.name && (lens === "threads" || (current && current.name !== s.name && current.answeredBy.some((i) => i.name === s.name)))) {
      const it = s.items.find((i) => i.type === "response");
      const target = current && current.answeredBy.some((i) => i.name === s.name) ? current.name : it && it.answers[0];
      if (target && SEAT[target]) {
        const d = headPos(target).sub(s.person.position);
        let dy = Math.atan2(d.x, d.z) - s.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        yawT = clamp(dy, -1.1, 1.1);
      }
    }
    if (hoverSeat === s) s.shirt.emissive && s.shirt.emissive.setRGB(0.08, 0.08, 0.1);
    else if (s.shirt.emissive) s.shirt.emissive.setRGB(0, 0, 0);
    s.headYaw += (yawT - s.headYaw) * Math.min(1, dt * 3);
    s.headG.rotation.y = s.headYaw;
    s.headG.rotation.x = Math.sin(t * 0.7 + s.phase) * 0.03;
  });

  // sheets: visibility, lift, parts, flight from the stacks
  SHEETS.forEach((sh) => {
    sh.vis += (sh.visT - sh.vis) * Math.min(1, dt * 5);
    const partLift = lens === "parts" && partOn === sh.it.part ? 1 : 0;
    const hov = hover && hover.kind === "sheet" && hover.id === sh.it.id ? 1 : 0;
    const want = Math.max(sh.liftT, partLift * 4, hov * 0.5);
    sh.lift += (want - sh.lift) * Math.min(1, dt * 7);
    let pos = sh.home;
    if (sh.fly) {
      const k = clamp((now - sh.fly.t0) / 900, 0, 1), e = ease(k);
      if (k <= 0) { sh.g.visible = false; return; }
      tmpV.copy(sh.fly.from).lerp(sh.home, e); tmpV.y += Math.sin(e * Math.PI) * 0.7;
      sh.g.position.copy(tmpV); sh.g.rotation.y = sh.homeRot + (1 - e) * 2.4;
      sh.g.visible = true; sh.mat.opacity = 1;
      if (k >= 1) sh.fly = null;
      return;
    }
    sh.g.position.set(pos.x, pos.y + sh.lift * 0.06, pos.z);
    sh.g.rotation.y = sh.homeRot;
    sh.g.rotation.x = Math.min(sh.lift, 1) * -0.08;
    const dim = lens === "parts" && partOn && partOn !== sh.it.part ? 0.25 : 1;
    sh.mat.opacity = sh.vis * dim;
    sh.g.visible = sh.vis > 0.02;
    const bWant = lens === "parts" ? (partOn && partOn !== sh.it.part ? 0.15 : 0.95) : 0;
    sh.bmat.opacity += (bWant * sh.vis - sh.bmat.opacity) * Math.min(1, dt * 6);
    sh.bmat.visible = sh.bmat.opacity > 0.01;
  });

  // stacks grow with the weeks
  STACKS.forEach((st) => {
    st.s += (st.sT - st.s) * Math.min(1, dt * 4);
    const h = Math.max(0.0001, st.h * st.s);
    st.m.scale.y = h; st.m.position.y = TOP_Y + h / 2; st.m.visible = st.s > 0.01;
  });

  // threads
  THREADS.forEach((th) => {
    th.a += (th.aT - th.a) * Math.min(1, dt * 5);
    th.mat.opacity = th.a * 0.9;
    th.pmat.opacity = th.a > 0.3 ? th.a : 0;
    th.pulse.visible = th.mat.opacity > 0.02;
    th.mat.visible = th.mat.opacity > 0.01;
    if (th.pulse.visible) { th.curve.getPoint((t * 0.28 + th.off) % 1, tmpV); th.pulse.position.copy(tmpV); }
  });
}

function loop() {
  cancelAnimationFrame(rafId);
  const tick = (now) => {
    if (!visible) return;
    const dt = Math.min(0.05, clock.getDelta());
    update(now, dt);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ start */
async function fontsReady() {
  if (!document.fonts) return;
  const want = [`400 40px Literata`, `500 40px "Instrument Sans"`, `400 30px "JetBrains Mono"`, `500 30px "JetBrains Mono"`];
  await Promise.race([Promise.all(want.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]);
}
(async () => {
  // textures above were drawn before the fonts arrived; redraw text-bearing ones once they are ready
  await fontsReady();
  SHEETS.forEach((sh) => { sh.mat.map.dispose(); sh.mat.map = paperTexture(sh.it); sh.mat.needsUpdate = true; });
  Object.values(SEAT).forEach((s) => {
    const sub = s.side === "F" ? (s.answeredBy.length ? `${s.answeredBy.length} answered` : s.role) : `${s.items.length} ${s.items.length === 1 ? "entry" : "entries"}`;
    s.card.material.map = nameCardTexture(s.name, sub); s.card.material.needsUpdate = true;
  });
  STACKS.forEach((st) => { st.m.material[2].map = stackTopTexture(st.wk); st.m.material[2].needsUpdate = true; });
  Object.values(READ).forEach((r) => { const m = r.g.children[2].material; m.map = packetTexture(r.rd); m.needsUpdate = true; });
  screen.material.map = screenTexture(); screen.material.needsUpdate = true;

  setWeek(10, false);
  const o = overviewPose();
  const hashSeat = (location.hash.match(/^#seat-(.+)$/) || [])[1];
  const target = hashSeat && Object.keys(SEAT).find((n) => slugName(n) === decodeURIComponent(hashSeat));
  camera.position.set(-0.4, 13.5, 0.01); camera.lookAt(-0.4, 0, 0); baseFov = isNarrow() ? 62 : 44; applyView();
  $("veil").classList.add("is-off");
  room.classList.add("is-ready");
  loop();
  if (target) { mode = "orbit"; sit(target); return; }
  if (reduceMotion) { camera.position.copy(o.pos); baseFov = o.fov; applyView(); controls.target.copy(o.look); mode = "orbit"; controls.update(); return; }
  startFly(o.pos, o.look, o.fov, 2800, () => { mode = "orbit"; controls.target.copy(o.look); controls.enabled = true; });
})();

addEventListener("hashchange", () => {
  const m = location.hash.match(/^#seat-(.+)$/);
  if (!m) return;
  const n = Object.keys(SEAT).find((k) => slugName(k) === decodeURIComponent(m[1]));
  if (n && (!current || current.name !== n)) { room.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); sit(n); }
});

// for the conversation section below
window.WL = {
  sit: (n) => { room.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); setTimeout(() => sit(n), reduceMotion ? 0 : 450); },
  read: openReader,
  seats: Object.keys(SEAT),
};
document.dispatchEvent(new CustomEvent("wl-ready"));
