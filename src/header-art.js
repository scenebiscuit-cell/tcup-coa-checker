/* Header art: three trichomes (clear, milky, amber) that watch the pointer, blink, and react to the verdict.
   Decorative only: hidden from screen readers, no focus stops, and no idle motion when the visitor
   prefers reduced motion. Exposes window.HeaderArt.mood("clear" | "review" | "hold" | "idle")
   and window.HeaderArt.hat(kind | false), which dresses the tall clear trichome for the state:
   "cowboy" (Texas), "fedora" (federal hemp), "beanie" (Colorado), "captain" (Missouri riverboat cap),
   "bear" (a California grizzly cub on its head). hat(true) means "cowboy". */
(function () {
  "use strict";
  const root = document.getElementById("crew");
  if (!root) return;
  const svg = root.querySelector("svg");
  const eyes = [...root.querySelectorAll(".eye")].map(g => ({
    g, pupil: g.querySelector(".pupil"), x: +g.dataset.x, y: +g.dataset.y,
    reach: +g.dataset.reach || 3,
  }));
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  /* ---------- eyes follow the pointer ---------- */
  // pointer position in the SVG's own coordinates, so the math works at any size
  function toSvg(cx, cy) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(m.inverse());
  }
  function look(px, py) {
    for (const e of eyes) {
      const dx = px - e.x, dy = py - e.y, d = Math.hypot(dx, dy) || 1;
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
      const p = toSvg(queued[0], queued[1]);
      if (p) { last = p; look(p.x, p.y); }
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
      t.classList.remove("blink"); void t.getBoundingClientRect(); t.classList.add("blink");
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
    if (last) look(last.x, last.y);
    else for (const e of eyes) e.pupil.setAttribute("transform", `translate(0 ${m === "hold" ? (e.reach * 0.7).toFixed(2) : 0})`);
    for (const t of tris) {
      const x = +t.dataset.mx, y = +t.dataset.my, r = +t.dataset.r;
      t.querySelector(".mouth")?.setAttribute("d", MOUTH[m](x, y, r));   // eyes-only art has no mouth
    }
    if (m !== "idle" && !reduce.matches) { root.classList.remove("react"); void root.getBoundingClientRect(); root.classList.add("react"); }
  }

  /* ---------- hats: one per state, on the tall clear trichome ---------- */
  // each hat is drawn on the same 64-unit grid as the favicon: [path, fill, stroke]
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
    // Missouri: a riverboat captain's cap, for the Mississippi and Mark Twain
    captain: { tilt: -4, parts: [
      ["M9 12 Q32 3 55 12 Q53 17.5 46.5 19.5 L17.5 19.5 Q11 17.5 9 12 Z", "#f4f1e8", "#a9a496"],
      ["M17 19 L47 19 L47.6 25 Q32 26.6 16.4 25 Z", "#1b1d24"],
      ["M14.5 24.4 Q32 27 49.5 24.4 Q46.5 31 32 31 Q17.5 31 14.5 24.4 Z", "#0f1014"],
      ["M17.2 23.6 Q32 25.3 46.8 23.6", "none", "#d9a93b"],
      ["M28.6 12.6 L35.4 12.6 L36.4 16.2 L32 18 L27.6 16.2 Z", "#d9a93b"],
    ] },
    // California: a grizzly cub (the state animal, from the flag) hanging on to the top of the head
    bear: { tilt: 0, parts: [
      ["M19.6 8 Q18.6 1.4 24.4 1.6 Q28.4 2.8 26.8 7.6 Z", "#7a4b2a"],
      ["M44.4 8 Q45.4 1.4 39.6 1.6 Q35.6 2.8 37.2 7.6 Z", "#7a4b2a"],
      ["M21.4 6.4 Q21.2 3.2 24 3.5 Q25.8 4.5 25.1 6.6 Z", "#b9824f"],
      ["M42.6 6.4 Q42.8 3.2 40 3.5 Q38.2 4.5 38.9 6.6 Z", "#b9824f"],
      ["M19.5 15.5 Q19.5 4 32 4 Q44.5 4 44.5 15.5 Q44.5 26.5 32 26.5 Q19.5 26.5 19.5 15.5 Z", "#7a4b2a"],
      ["M26.4 19 Q26.4 15 32 15 Q37.6 15 37.6 19 Q37.6 23 32 23 Q26.4 23 26.4 19 Z", "#d4a26b"],
      ["M29.8 16.6 Q32 15.6 34.2 16.6 Q33.6 18.6 32 19 Q30.4 18.6 29.8 16.6 Z", "#2a1a12"],
      ["M30.2 20.6 Q32 22 33.8 20.6", "none", "#2a1a12"],
      ["M25.4 11.6 Q25.4 9.8 26.9 9.8 Q28.4 9.8 28.4 11.6 Q28.4 13.4 26.9 13.4 Q25.4 13.4 25.4 11.6 Z", "#1d1533"],
      ["M35.6 11.6 Q35.6 9.8 37.1 9.8 Q38.6 9.8 38.6 11.6 Q38.6 13.4 37.1 13.4 Q35.6 13.4 35.6 11.6 Z", "#1d1533"],
      ["M14.5 26.5 Q14 21.5 19 21.8 Q22.2 23.2 21.2 27.6 Q17.6 28.8 14.5 26.5 Z", "#6a3f22"],
      ["M49.5 26.5 Q50 21.5 45 21.8 Q41.8 23.2 42.8 27.6 Q46.4 28.8 49.5 26.5 Z", "#6a3f22"],
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
    for (const [d, fill, stroke] of HATS[kind].parts) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", P(d)); path.setAttribute("fill", fill);
      if (stroke) { path.setAttribute("stroke", stroke); path.setAttribute("stroke-width", ((fill === "none" ? 1.6 : 0.9) * u).toFixed(1)); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round"); }
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
      if (!reduce.matches && h.animate) h.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-30px)", opacity: 0 }], { duration: 220, easing: "ease-in" }).onfinish = () => h.remove();
      else h.remove();
    }
  }

  mood("idle");
  if (root.dataset.hat === "always") hat("cowboy");    // the Texas-only checker: the cowboy hat stays on
  window.HeaderArt = { mood, hat };
})();
