/* Header art: three trichomes (clear, milky, amber) that watch the pointer, blink, and react to the verdict.
   Decorative only: hidden from screen readers, no focus stops, and no idle motion when the visitor
   prefers reduced motion. Exposes window.HeaderArt.mood("clear" | "review" | "hold" | "idle")
   and window.HeaderArt.hat(kind | false), which dresses the tall clear trichome for the state:
   "cowboy" (Texas), "fedora" (federal hemp), "beanie" (Colorado), "straw" (Missouri straw hat),
   "bush" (a wide-brimmed California bush hat). hat(true) means "cowboy".
   Once the header scrolls out of view, a small copy of the tall trichome (same face, same hat) appears
   in the sticky nav (#crewMini) or, on pages without one, in the bottom corner, so the reactions stay visible.
   window.HeaderArt.body(formClass) dresses that small copy as the product being checked: a trichome with the
   state's hat for concentrates, a leaf for flower, a dropper bottle for tinctures, a gummy for edibles, and a
   510 cartridge for vapes. Same eyes and expressions on every body. */
(function () {
  "use strict";
  const root = document.getElementById("crew");
  if (!root) return;
  const svg = root.querySelector("svg");
  const eyeOf = (g, owner) => ({
    g, owner, pupil: g.querySelector(".pupil"), x: +g.dataset.x, y: +g.dataset.y,
    reach: +g.dataset.reach || 3,
  });
  let eyes = [...root.querySelectorAll(".eye")].map(g => eyeOf(g, svg));
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  /* ---------- eyes follow the pointer ---------- */
  // pointer position in the SVG's own coordinates, so the math works at any size
  function toSvg(owner, cx, cy) {
    const m = owner.getScreenCTM();
    if (!m) return null;
    const p = owner.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(m.inverse());
  }
  // cx, cy: the pointer in page (client) coordinates; each eye converts it into its own drawing
  function look(cx, cy) {
    for (const e of eyes) {
      const q = toSvg(e.owner, cx, cy);
      if (!q) continue;
      const dx = q.x - e.x, dy = q.y - e.y, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 120) * e.reach;           // close to the eye: look less far
      const down = root.dataset.mood === "hold" ? e.reach * 0.7 : 0;   // sad eyes droop toward the floor
      e.pupil.setAttribute("transform", `translate(${(dx / d * k).toFixed(2)} ${(dy / d * k + down).toFixed(2)})`);
    }
  }
  let queued = null;
  let last = null;
  function onPointer(ev) {
    queued = [ev.clientX, ev.clientY];
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      last = queued; look(queued[0], queued[1]);
    });
  }
  let frame = 0;
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });   // touch: look where you tap
  // keyboard users: glance at whatever has focus
  document.addEventListener("focusin", (ev) => {
    const r = ev.target.getBoundingClientRect?.();
    if (r && r.width) onPointer({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  });

  /* ---------- blinking ---------- */
  const tris = [...root.querySelectorAll(".tri.fg")];   // only the ones with eyes blink
  function blinkSoon() {
    if (reduce.matches) return;
    setTimeout(() => {
      const t = tris[Math.floor(Math.random() * tris.length)];
      const twin = t.classList.contains("clear") && document.querySelector("#crewMini .tri");   // the mini copy blinks with it
      for (const el of [t, twin]) if (el) { el.classList.remove("blink"); void el.getBoundingClientRect(); el.classList.add("blink"); }
      blinkSoon();
    }, 2600 + Math.random() * 3800);
  }
  blinkSoon();

  /* ---------- eyelids: a skeptical squint for Review, sad eyes for Hold ---------- */
  // each eye gets a lid line and a clip that hides the eye above it, so the lid looks like it slid down
  const NS_ = "http://www.w3.org/2000/svg";
  const defs = svg.querySelector("defs") || svg.insertBefore(document.createElementNS(NS_, "defs"), svg.firstChild);
  const lids = [...root.querySelectorAll(".tri.fg .eye")].map((g, i) => {
    const sc = g.querySelector(".sclera"), x = +sc.getAttribute("cx"), y = +sc.getAttribute("cy"), r = +sc.getAttribute("r");
    const side = g.classList.contains("l") ? 1 : -1;     // +1: left eye, its inner corner is on the right
    const clip = document.createElementNS(NS_, "clipPath"), shape = document.createElementNS(NS_, "path");
    clip.id = "lidclip-" + i; clip.append(shape); defs.append(clip);
    g.querySelector(".open").setAttribute("clip-path", `url(#${clip.id})`);
    const line = document.createElementNS(NS_, "path");
    line.setAttribute("class", "lid"); line.setAttribute("stroke-width", (r * 0.42).toFixed(2)); g.append(line);
    // one tear under each trichome's left eye, at its outer corner; CSS shows it only for Hold
    if (side > 0) {
      const tear = document.createElementNS(NS_, "path"), tx = x - r * 0.55, ty = y + r * 1.45, s = r * 0.5;
      tear.setAttribute("class", "tear");
      tear.setAttribute("d", `M${tx} ${ty - s * 1.5} Q${tx + s * 1.05} ${ty - s * 0.1} ${tx} ${ty + s} Q${tx - s * 1.05} ${ty - s * 0.1} ${tx} ${ty - s * 1.5}Z`);
      g.append(tear);
    }
    // a rosy cheek under each eye's outer corner; CSS shows it only for Clear
    const blush = document.createElementNS(NS_, "ellipse");
    blush.setAttribute("class", "blush");
    blush.setAttribute("cx", (x - side * r * 0.45).toFixed(2)); blush.setAttribute("cy", (y + r * 1.35).toFixed(2));
    blush.setAttribute("rx", (r * 0.75).toFixed(2)); blush.setAttribute("ry", (r * 0.42).toFixed(2));
    g.parentNode.insertBefore(blush, g);
    return { x, y, r, side, shape, line };
  });
  function setLids(kind) {
    for (const l of lids) {
      const { x, y, r, side } = l, w = r * 1.05;
      if (kind === "sad") {
        // inner corner raised, outer corner drooping: the lid slopes down away from the nose
        const hi = y - r * 0.78, lo = y - r * 0.05;
        const x1 = x - w, x2 = x + w, y1 = side > 0 ? lo : hi, y2 = side > 0 ? hi : lo;
        const arc = `Q${x} ${((y1 + y2) / 2 - r * 0.08).toFixed(2)} ${x2} ${y2.toFixed(2)}`;
        l.shape.setAttribute("d", `M${x1} ${y1.toFixed(2)} ${arc} V${y + r * 2} H${x1} Z`);
        l.line.setAttribute("d", `M${x1} ${y1.toFixed(2)} ${arc}`);
        continue;
      }
      if (kind !== "squint") { l.shape.setAttribute("d", `M${x - w * 2} ${y - w * 2}h${w * 4}v${w * 4}h${-w * 4}Z`); l.line.removeAttribute("d"); continue; }
      // the lid sits a little above centre and slopes down toward the nose: a narrow, skeptical look
      const yo = y - r * 0.32 - side * r * 0.16, yi = y - r * 0.32 + side * r * 0.16;
      const x1 = x - w, x2 = x + w, y1 = side > 0 ? yo : yi, y2 = side > 0 ? yi : yo;
      const sag = `Q${x} ${((y1 + y2) / 2 + r * 0.1).toFixed(2)} ${x2} ${y2.toFixed(2)}`;
      l.shape.setAttribute("d", `M${x1} ${y1.toFixed(2)} ${sag} V${y + r * 2} H${x1} Z`);
      l.line.setAttribute("d", `M${x1} ${y1.toFixed(2)} ${sag}`);
    }
  }

  /* ---------- sparkles around each head for Clear ---------- */
  const STAR = (x, y, s) => `M${x} ${y - s} Q${x + s * .18} ${y - s * .18} ${x + s} ${y} Q${x + s * .18} ${y + s * .18} ${x} ${y + s} Q${x - s * .18} ${y + s * .18} ${x - s} ${y} Q${x - s * .18} ${y - s * .18} ${x} ${y - s}Z`;
  for (const t of tris) {
    const x = +t.dataset.hx, y = +t.dataset.hy, r = +t.dataset.hr;
    [[1.08, -0.62, 0.3], [-1.12, -0.2, 0.22], [0.98, 0.42, 0.17]].forEach(([dx, dy, s], i) => {
      const p = document.createElementNS(NS_, "path");
      p.setAttribute("class", "spark"); p.style.animationDelay = (i * 0.25) + "s";
      p.setAttribute("d", STAR(x + dx * r, y + dy * r, s * r));
      t.querySelector(".head").append(p);
    });
  }

  /* ---------- mood follows the verdict ---------- */
  // mouths are drawn relative to each trichome's own size
  const MOUTH = {
    idle:   (x, y, r) => `M${x - r * .16} ${y} Q${x} ${y + r * .12} ${x + r * .16} ${y}`,
    clear:  (x, y, r) => `M${x - r * .24} ${y - r * .03} Q${x} ${y + r * .26} ${x + r * .24} ${y - r * .03}`,
    review: (x, y, r) => `M${x - r * .15} ${y + r * .05} L${x + r * .15} ${y + r * .02}`,
    hold:   (x, y, r) => `M${x - r * .17} ${y + r * .1} Q${x} ${y - r * .06} ${x + r * .17} ${y + r * .1}`,
  };
  function mood(m) {
    if (!MOUTH[m]) m = "idle";
    root.dataset.mood = m;
    setLids(m === "review" ? "squint" : m === "hold" ? "sad" : null);
    // re-aim the pupils for the new mood; before the pointer has moved they look straight ahead
    if (last) look(last[0], last[1]);
    else for (const e of eyes) e.pupil.setAttribute("transform", `translate(0 ${m === "hold" ? (e.reach * 0.7).toFixed(2) : 0})`);
    for (const t of tris) {
      const x = +t.dataset.mx, y = +t.dataset.my, r = +t.dataset.r;
      t.querySelector(".mouth")?.setAttribute("d", MOUTH[m](x, y, r));   // eyes-only art has no mouth
    }
    syncMini?.();
    if (m !== "idle" && !reduce.matches) for (const el of [root, mini]) {
      if (!el) continue;
      el.classList.remove("react"); void el.getBoundingClientRect(); el.classList.add("react");
    }
  }

  /* ---------- hats: one per state, on the tall clear trichome ---------- */
  // each hat is drawn on the same 64-unit grid as the favicon: [path, fill, stroke, stroke width]
  const HATS = {
    cowboy: { tilt: -7, parts: [
      ["M2 14 Q4 29 32 28 Q60 29 62 14 Q58 23 32 23 Q6 23 2 14 Z", "#8a5a1e"],
      ["M17 25 C16 15 18 5 24 5 Q28 9 32 7 Q36 9 40 5 C46 5 48 15 47 25 Q32 27 17 25 Z", "#b8843a"],
      ["M32 8 Q31 14 32 19", "none", "#8a5a1e"],
      ["M16.6 20 Q32 22.5 47.4 20 L47.2 24.4 Q32 26.6 16.8 24.4 Z", "#3b2412"],
    ] },
    // charcoal rather than pure black, with a grey edge, so it still reads on the dark green band
    fedora: { tilt: -4, parts: [
      ["M5 23 Q7 29.5 32 28.5 Q57 29.5 59 23 Q55 26 32 26 Q9 26 5 23 Z", "#24272b", "#6b737c"],
      ["M15.5 24 C14.5 15 17 7.5 24 6.5 Q28 9.5 32 8.5 Q36 9.5 40 6.5 C47 7.5 49.5 15 48.5 24 Q32 26 15.5 24 Z", "#2e3237", "#6b737c"],
      ["M32 9.5 Q30.8 14 32 18.5", "none", "#14161a"],
      ["M15.3 19.5 Q32 22 48.7 19.5 L48.6 23.6 Q32 26 15.4 23.6 Z", "#101214"],
      ["M44 20.6 L46.6 20.3 L46.6 23.4 L44 23.7 Z", "#4a5059"],
    ] },
    // Colorado: a ski beanie in the flag's blue, white, red, and gold
    beanie: { tilt: -6, parts: [
      ["M14 24 C14 12 22 6 32 6 C42 6 50 12 50 24 Z", "#2456a6"],
      ["M15.2 16.5 Q32 12.6 48.8 16.5 L49.6 19.8 Q32 16.2 14.4 19.8 Z", "#f4f1e8"],
      ["M12.5 21 Q32 18 51.5 21 L51.5 28 Q32 25.5 12.5 28 Z", "#c8312f"],
      ["M18 20.6 L18 26.9 M25 19.8 L25 26.2 M32 19.6 L32 26 M39 19.8 L39 26.2 M46 20.6 L46 26.9", "none", "#9e2220"],
      ["M27 3.5 Q27 -1.5 32 -1.5 Q37 -1.5 37 3.5 Q37 8.5 32 8.5 Q27 8.5 27 3.5 Z", "#f3c12b"],
    ] },
    // Missouri: a farmer's straw hat with a woven brim and a red band
    straw: { tilt: -5, parts: [
      ["M0 23 Q4 31 32 31 Q60 31 64 23 Q58 27 32 27 Q6 27 0 23 Z", "#c99d45"],
      ["M0 23 Q8 19 32 19.5 Q56 19 64 23 Q58 27.5 32 27.5 Q6 27.5 0 23 Z", "#e8c36a"],
      ["M6 23.2 L8.6 25.8 M12.6 22.2 L14.6 26.4 M19 21.4 L20.2 26.9 M45 21.4 L43.8 26.9 M51.4 22.2 L49.4 26.4 M58 23.2 L55.4 25.8", "none", "#b8913f", 0.7],
      ["M17.5 23 Q16.5 13 19.5 9.5 Q32 6 44.5 9.5 Q47.5 13 46.5 23 Q32 25 17.5 23 Z", "#e3bb5d"],
      ["M18.2 14.5 Q32 12.4 45.8 14.5 M17.6 18 Q32 16.2 46.4 18", "none", "#b8913f", 0.7],
      ["M21 10.4 Q32 8 43 10.4", "none", "#f6dd98", 0.9],
      ["M17.3 19.6 Q32 21.8 46.7 19.6 L46.6 23.4 Q32 25.4 17.4 23.4 Z", "#b8322b"],
    ] },
    // California: a wide-brimmed khaki bush hat, brim dipping at the sides, with a pinched crown
    bush: { tilt: -5, parts: [
      ["M1 27 Q6 19.5 32 20 Q58 19.5 63 27 Q61 31.5 56 30 Q46 26 32 26.5 Q18 26 8 30 Q3 31.5 1 27 Z", "#9c8d5e"],
      ["M5 27.4 Q9 22.8 32 23.1 Q55 22.8 59 27.4", "none", "#7d7048", 0.6],
      ["M16 24 C15 14 18 7 25 6 Q28.5 8.6 32 7.6 Q35.5 8.6 39 6 C46 7 49 14 48 24 Q32 26 16 24 Z", "#b5a674"],
      ["M32 8.4 Q31 13.5 32 18.5", "none", "#8a7c52", 1.2],
      ["M20.6 14 Q20.6 12.9 21.7 12.9 Q22.8 12.9 22.8 14 Q22.8 15.1 21.7 15.1 Q20.6 15.1 20.6 14 Z", "#6b5f3c"],
      ["M41.2 14 Q41.2 12.9 42.3 12.9 Q43.4 12.9 43.4 14 Q43.4 15.1 42.3 15.1 Q41.2 15.1 41.2 14 Z", "#6b5f3c"],
      ["M15.6 19.4 Q32 22 48.4 19.4 L48.2 23.8 Q32 26.2 15.8 23.8 Z", "#4e5a32"],
    ] },
  };
  // drawn to fit the trichome's own size; fills are set here so no stylesheet is needed
  const NS = "http://www.w3.org/2000/svg";
  function drawHat(t, kind) {
    // the trichome says where its hat goes: centre x, a point near the top of the head, and the head's size
    const x = +t.dataset.hx, cy = +t.dataset.hy, r = +t.dataset.hr;
    const u = r / 26, y = cy - r * 0.84;               // u: one unit of the 64-unit favicon drawing
    const P = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, a, b) => `${(x + (+a - 32) * u).toFixed(1)} ${(y + (+b - 20) * u).toFixed(1)}`);
    const outer = document.createElementNS(NS, "g"), g = document.createElementNS(NS, "g");
    outer.setAttribute("class", "hat"); outer.dataset.kind = kind; outer.append(g);   // outer moves when it drops on, inner holds the tilt
    for (const [d, fill, stroke, width] of HATS[kind].parts) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", P(d)); path.setAttribute("fill", fill);
      if (stroke) { path.setAttribute("stroke", stroke); path.setAttribute("stroke-width", ((width ?? (fill === "none" ? 1.6 : 0.9)) * u).toFixed(2)); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round"); }
      g.append(path);
    }
    g.setAttribute("transform", `rotate(${HATS[kind].tilt} ${x} ${cy})`);   // tipped a little
    return outer;
  }
  function hat(kind) {
    if (kind === true) kind = "cowboy";
    if (!HATS[kind]) kind = false;
    if (kind) root.dataset.hat = kind; else delete root.dataset.hat;
    const t = root.querySelector(".tri.fg.clear") || root.querySelector(".tri.clear");
    if (!t) return;
    const head = t.querySelector(".head");
    let h = head.querySelector(".hat");
    if (h && h.dataset.kind !== kind) { h.remove(); h = null; }   // switching straight from one hat to another
    if (kind && !h) {
      h = drawHat(t, kind); head.append(h);
      if (!reduce.matches && h.animate) h.animate([{ transform: "translateY(-40px)", opacity: 0 }, { transform: "translateY(3px)", opacity: 1, offset: .75 }, { transform: "none", opacity: 1 }],
        { duration: 420, easing: "ease-out" });
    } else if (!kind && h) {
      if (!reduce.matches && h.animate) h.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-30px)", opacity: 0 }], { duration: 220, easing: "ease-in" }).onfinish = () => { h.remove(); syncMini(); };
      else h.remove();
    }
    syncMini();
  }

  /* ---------- a small copy for when the header has scrolled away ---------- */
  // the tall clear trichome's head, redrawn in a little badge; it reuses the header's gradients and eyelid clips
  const tall = root.querySelector(".tri.fg.clear");
  let mini = document.getElementById("crewMini"), miniSvg = null;
  if (tall && !mini) {                 // no slot in a sticky nav: float in the bottom corner instead
    mini = document.createElement("span"); mini.id = "crewMini"; mini.className = "corner";
    document.body.append(mini);
  }
  if (tall && mini) {
    mini.classList.add("band-art", "crew-mini"); mini.setAttribute("aria-hidden", "true");
    const x = +tall.dataset.hx, y = +tall.dataset.hy, r = +tall.dataset.hr;
    miniSvg = document.createElementNS(NS_, "svg");
    miniSvg.setAttribute("class", "crew"); miniSvg.setAttribute("focusable", "false");
    miniSvg.setAttribute("viewBox", `${x - r * 1.55} ${y - r * 1.75} ${r * 3.1} ${r * 3.1}`);
    mini.append(miniSvg);
    // phones: the nav is full, so it floats in the bottom corner instead (moved to <body>, because the
    // nav's frosted-glass filter would otherwise pin a fixed-position child to the nav)
    const slot = mini.parentNode, anchor = mini.nextSibling;
    const phone = window.matchMedia ? window.matchMedia("(max-width: 480px)") : { matches: false };
    const place = () => {
      if (slot === document.body) return;
      if (phone.matches) { mini.classList.add("corner"); document.body.append(mini); }
      else { mini.classList.remove("corner"); slot.insertBefore(mini, anchor); }
    };
    place(); phone.addEventListener?.("change", place);
    // show it once less than 15% of the header art is on screen. Measured on scroll (at most once a frame)
    // rather than with IntersectionObserver, which some browsers and embedded views don't report reliably.
    let ticking = false;
    const check = () => {
      ticking = false;
      const b = root.getBoundingClientRect();
      const seen = Math.max(0, Math.min(b.bottom, window.innerHeight) - Math.max(b.top, 0));
      mini.classList.toggle("show", seen < b.height * 0.15);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    check();
  }
  /* the small copy's bodies, drawn around the head's centre at the size of a 29-unit head.
     The eyes sit at about (±11.6, 2.9). Each part: [path, fill, { stroke, width, opacity }] */
  function lensLeaf(angle, len, wid) {     // one smooth, pointed leaflet growing from the leaf's base
    const a = angle * Math.PI / 180, bx = 0, by = 34, tx = bx + Math.sin(a) * len, ty = by - Math.cos(a) * len;
    const mx = (bx + tx) / 2, my = (by + ty) / 2, nx = Math.cos(a) * wid, ny = Math.sin(a) * wid;
    const f = (n) => n.toFixed(1);
    return `M${bx} ${by} Q${f(mx - nx)} ${f(my - ny)} ${f(tx)} ${f(ty)} Q${f(mx + nx)} ${f(my + ny)} ${bx} ${by} Z`;
  }
  function vein(angle, len) {
    const a = angle * Math.PI / 180;
    return `M0 34 L${(Math.sin(a) * len * 0.72).toFixed(1)} ${(34 - Math.cos(a) * len * 0.72).toFixed(1)}`;
  }
  const SIDE = [[110, 24, 11], [75, 42, 18], [40, 58, 24]];
  const BODIES = {
    // flower: a seven-leaflet cannabis leaf, the face on the centre leaflet
    leaf: [
      ["M0 33 L0 43", "none", { stroke: "#3f8a56", width: 3 }],
      ...SIDE.flatMap(([ang, len, wid]) => [[lensLeaf(-ang, len, wid), "#3f9659"], [lensLeaf(ang, len, wid), "#3f9659"]]),
      ...SIDE.flatMap(([ang, len]) => [[vein(-ang, len), "none", { stroke: "#8fd3a3", width: 1, opacity: .7 }], [vein(ang, len), "none", { stroke: "#8fd3a3", width: 1, opacity: .7 }]]),
      [lensLeaf(0, 74, 40), "#5cc07a"],
      ["M-9 -14 Q-6 -24 -2 -30", "none", { stroke: "#ffffff", width: 3, opacity: .55 }],
    ],
    // tincture: an amber glass dropper bottle with a black rubber bulb and a cream label
    dropper: [
      ["M-7 -30 V-40 Q-7 -50 0 -50 Q7 -50 7 -40 V-30 Z", "#3b3e44"],
      ["M-3.5 -44 Q-3 -47.5 0 -48", "none", { stroke: "#ffffff", width: 1.6, opacity: .45 }],
      ["M-11 -31 H11 V-21 H-11 Z", "#2b2d31"],
      ["M-11 -27.6 H11 M-11 -24.4 H11", "none", { stroke: "#4a4e55", width: 0.8 }],
      ["M-9 -22 H9 V-17 Q21 -15 21 -3 V27 Q21 36 12 36 H-12 Q-21 36 -21 27 V-3 Q-21 -15 -9 -17 Z", "#c46f1c"],
      ["M-21 16 H21 V29 H-21 Z", "#f3e6c8"],
      ["M-13 21 H13 M-9 24.6 H9", "none", { stroke: "#c9b68f", width: 1.2 }],
      ["M-15.5 -6 Q-16.5 4 -15.5 13", "none", { stroke: "#f2b468", width: 3, opacity: .75 }],
    ],
    // edibles: a sugared gumdrop
    gummy: [
      ["M-24 32 Q-27.5 31.5 -26 25 Q-20 -30 0 -32 Q20 -30 26 25 Q27.5 31.5 24 32 Q0 37 -24 32 Z", "#ff5d7a"],
      ["M-25 28 Q0 33.5 25 28 Q24 32 21 32.5 Q0 36 -21 32.5 Q-24 32 -25 28 Z", "#d9405f"],
      ["M-14 -14 Q-9 -25 1 -27", "none", { stroke: "#ffffff", width: 3.4, opacity: .6 }],
      ...[[-16, 16], [-6, 24], [9, 21], [17, 12], [14, -10], [-18, 1], [4, -20]].map(([x, y]) =>
        [`M${x - 1.2} ${y - 1.2} h2.4 v2.4 h-2.4 Z`, "#ffffff", { opacity: .7 }]),
    ],
    // vapes: a 510-thread cartridge, golden oil in a glass tank
    cart: [
      ["M-7 -48 H7 Q9 -48 9.5 -44 L11 -34 H-11 L-9.5 -44 Q-9 -48 -7 -48 Z", "#26282c"],
      ["M-13 -34 H13 V-29 H-13 Z", "#8a9098"],
      ["M-20 -25 Q-20 -29 -16 -29 H16 Q20 -29 20 -25 V22 Q20 26 16 26 H-16 Q-20 26 -20 22 Z", "#e6f2f2", { stroke: "#cfe0e0", width: 1 }],
      ["M-18 -17 H18 V21 Q18 24 15 24 H-15 Q-18 24 -18 21 Z", "#e5a53a"],
      ["M-16 -25 V20", "none", { stroke: "#ffffff", width: 2.4, opacity: .55 }],
      ["M-20 26 H20 V33 H-20 Z", "#a7aeb6"],
      ["M-20 29.5 H20", "none", { stroke: "#8a9098", width: 1 }],
      ["M-10 33 H10 V39 H-10 Z", "#8a9098"],
      ["M-10 34.8 H10 M-10 37 H10", "none", { stroke: "#5f656c", width: 0.9 }],
    ],
  };
  // which body goes with which product category (CORE.formClass)
  const BODY_OF = { concentrate: "trichome", smokable: "leaf", tincture: "dropper", edible: "gummy", capsule: "gummy", ode: "gummy", inhalation: "cart" };
  let miniBody = "trichome";
  function body(formClass) {
    const b = BODY_OF[formClass] || "trichome";
    if (b !== miniBody) { miniBody = b; syncMini(); }
  }
  function drawBody(name, x, y, r) {
    const g = document.createElementNS(NS_, "g");
    g.setAttribute("class", "body"); g.setAttribute("transform", `translate(${x} ${y}) scale(${(r / 29).toFixed(3)})`);
    for (const [d, fill, o = {}] of BODIES[name]) {
      const p = document.createElementNS(NS_, "path");
      p.setAttribute("d", d); p.setAttribute("fill", fill);
      if (o.stroke) { p.setAttribute("stroke", o.stroke); p.setAttribute("stroke-width", o.width || 1); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round"); }
      if (o.opacity) p.setAttribute("opacity", o.opacity);
      g.append(p);
    }
    return g;
  }
  function syncMini() {
    if (!miniSvg) return;
    const x = +tall.dataset.hx, y = +tall.dataset.hy, r = +tall.dataset.hr;
    const g = document.createElementNS(NS_, "g"); g.setAttribute("class", "tri fg clear");
    const bg = document.createElementNS(NS_, "circle");
    bg.setAttribute("class", "mini-bg"); bg.setAttribute("cx", x); bg.setAttribute("cy", y + r * 0.1); bg.setAttribute("r", (r * 1.32).toFixed(1));
    const head = tall.querySelector(".head").cloneNode(true);
    head.querySelectorAll(".spark").forEach(sp => sp.remove());   // too busy at this size
    if (miniBody !== "trichome") {     // swap the resin head (and its hat) for the product's body; keep the face
      head.querySelectorAll(".membrane, .gloss, .hat").forEach(el => el.remove());
      head.prepend(drawBody(miniBody, x, y, r));
    }
    g.append(head);
    miniSvg.replaceChildren(bg, g);
    mini.dataset.mood = root.dataset.mood;
    eyes = eyes.filter(e => e.owner === svg).concat([...head.querySelectorAll(".eye")].map(eg => eyeOf(eg, miniSvg)));
    if (last) look(last[0], last[1]);
  }

  mood("idle");
  if (root.dataset.hat === "always") hat("cowboy");    // the Texas-only checker: the cowboy hat stays on
  window.HeaderArt = { mood, hat, body };
})();
