// Current year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Staggered scroll-reveal
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${Math.min(i * 60, 180)}ms`;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
revealEls.forEach((el) => io.observe(el));

// Scroll progress bar + nav state
const progress = document.querySelector(".scroll-progress");
const nav = document.querySelector(".nav");
const onScroll = () => {
  const h = document.documentElement;
  const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
  if (progress) progress.style.width = `${scrolled * 100}%`;
  if (nav) nav.classList.toggle("is-scrolled", h.scrollTop > 20);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Pointer-tracked glow + subtle 3D tilt on cards
document.querySelectorAll(".card:not(.card--static)").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    card.style.setProperty("--mx", `${px}px`);
    card.style.setProperty("--my", `${py}px`);
    const rx = (py / r.height - 0.5) * -5;
    const ry = (px / r.width - 0.5) * 5;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  });
  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

/* ============================================================
   Neural network hero
   ============================================================ */
(function neuralNet() {
  const canvas = document.getElementById("neural");
  const hero = document.getElementById("hero");
  const coreEl = document.querySelector(".hero__core");
  if (!canvas || !hero || !coreEl) return;

  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, DPR = 1;
  let nodes = [], edges = [], pulses = [], core = null;
  let time = 0;
  const mouse = { x: -9999, y: -9999 };
  const TARGET_PULSES = 9;
  let clearX = 0, clearY = 0, clearR = 1;

  // Fade elements inside a clear zone around the face/headline (0 at center → 1 outside)
  function atten(x, y) {
    const d = Math.hypot(x - clearX, y - clearY);
    return d < clearR ? Math.max(0, d / clearR) : 1;
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const pulseColor = (h) => (h < 0.4 ? "87,214,255" : h < 0.75 ? "157,123,255" : "255,123,213");

  function resize() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function build() {
    nodes = []; edges = []; pulses = [];
    const cols = W < 640 ? 4 : W < 1000 ? 5 : 6;
    const marginX = W * 0.05;
    const usableW = W - marginX * 2;
    const bandTop = H * 0.07, bandBot = H * 0.82;
    const layers = [];

    // Clear zone around the face + headline so the net frames rather than crowds
    const cr = coreEl.getBoundingClientRect();
    const hr = hero.getBoundingClientRect();
    clearX = cr.left + cr.width / 2 - hr.left;
    clearY = cr.top + cr.height / 2 - hr.top + H * 0.06;
    clearR = Math.max(cr.width * 1.6, Math.min(W, H) * 0.22);

    for (let c = 0; c < cols; c++) {
      const n = 3 + Math.round(Math.random() * 2);
      const x = marginX + (cols === 1 ? usableW / 2 : (usableW * c) / (cols - 1));
      const arr = [];
      for (let i = 0; i < n; i++) {
        const y = bandTop + (bandBot - bandTop) * ((i + 0.5) / n) + (Math.random() - 0.5) * H * 0.05;
        const node = { x, y, bx: x, by: y, r: 1.5 + Math.random() * 1.5, e: 0, phase: Math.random() * Math.PI * 2, amp: 2 + Math.random() * 3.5 };
        arr.push(node); nodes.push(node);
      }
      layers.push(arr);
    }

    for (let c = 0; c < cols - 1; c++) {
      layers[c].forEach((a) => {
        const next = [...layers[c + 1]].sort((p, q) => Math.abs(p.y - a.y) - Math.abs(q.y - a.y));
        const k = 1 + Math.round(Math.random());
        for (let i = 0; i < Math.min(k, next.length); i++) edges.push({ a, b: next[i] });
      });
    }

    core = null;

    if (!reduce) for (let i = 0; i < Math.min(TARGET_PULSES, edges.length); i++) spawn();
  }

  function spawn(edge) {
    edge = edge || edges[(Math.random() * edges.length) | 0];
    if (!edge) return;
    pulses.push({ edge, t: 0, dir: Math.random() > 0.15 ? 1 : -1, speed: 0.006 + Math.random() * 0.013, hue: Math.random() });
  }

  function frame() {
    time += 0.016;
    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      n.x = n.bx;
      n.y = n.by + Math.sin(time * 0.6 + n.phase) * n.amp;
    }

    for (const e of edges) {
      const act = Math.max(e.a.e, e.b.e);
      const fade = atten((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2);
      if (fade <= 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = `rgba(120,190,255,${(0.05 + act * 0.3) * fade})`;
      ctx.stroke();
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += p.speed;
      const a = p.dir > 0 ? p.edge.a : p.edge.b;
      const b = p.dir > 0 ? p.edge.b : p.edge.a;
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;
      const col = pulseColor(p.hue);
      const fade = atten(x, y);
      if (fade > 0.01) {
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${fade})`;
        ctx.shadowColor = `rgba(${col},${fade})`;
        ctx.shadowBlur = 9;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (p.t >= 1) {
        b.e = 1;
        pulses.splice(i, 1);
        const outs = edges.filter((ed) => (ed.a === b || ed.b === b) && ed !== p.edge);
        if (outs.length && Math.random() > 0.25) {
          const ne = outs[(Math.random() * outs.length) | 0];
          pulses.push({ edge: ne, t: 0, dir: ne.a === b ? 1 : -1, speed: 0.006 + Math.random() * 0.013, hue: p.hue });
        } else spawn();
      }
    }
    while (pulses.length < Math.min(TARGET_PULSES, edges.length)) spawn();

    for (const n of nodes) {
      const fade = atten(n.x, n.y);
      if (fade <= 0.01) continue;
      const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
      const near = d < 130 ? 1 - d / 130 : 0;
      n.e = Math.max(n.e * 0.94, near * 0.85);
      const glow = n.e;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + glow * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${lerp(120, 157, glow) | 0},${lerp(190, 140, glow) | 0},255,${(0.28 + glow * 0.6) * fade})`;
      if (glow > 0.1) { ctx.shadowColor = "rgba(120,200,255,0.9)"; ctx.shadowBlur = 12 * glow; }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(frame);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (const e of edges) {
      const fade = atten((e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2);
      if (fade <= 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y);
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = `rgba(120,190,255,${0.07 * fade})`;
      ctx.stroke();
    }
    for (const n of nodes) {
      const fade = atten(n.x, n.y);
      if (fade <= 0.01) continue;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,190,255,${0.4 * fade})`;
      ctx.fill();
    }
  }

  let rz;
  const debouncedResize = () => { clearTimeout(rz); rz = setTimeout(resize, 180); };

  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener("resize", debouncedResize);
  window.addEventListener("load", resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  setTimeout(resize, 500);

  resize();
  if (reduce) drawStatic();
  else requestAnimationFrame(frame);
})();
