/* Header art: three trichomes (clear, milky, amber) that watch the pointer, blink, and react to the verdict.
   Decorative only: hidden from screen readers, no focus stops, and no idle motion when the visitor
   prefers reduced motion. Exposes window.HeaderArt.mood("clear" | "review" | "hold" | "idle")
   and window.HeaderArt.hat(true | false), which puts a cowboy hat on the tall clear trichome for Texas. */
(function () {
  "use strict";
  const root = document.getElementById("crew");
  if (!root) return;
  const svg = root.querySelector("svg");
  const eyes = [...root.querySelectorAll(".eye")].map(g => ({
    g, pupil: g.querySelector(".pupil"), x: +g.dataset.x, y: +g.dataset.y,
    reach: +g.querySelector(".sclera").getAttribute("rx") * 0.45,
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
      e.pupil.setAttribute("transform", `translate(${(dx / d * k).toFixed(2)} ${(dy / d * k).toFixed(2)})`);
    }
  }
  let queued = null;
  function onPointer(ev) {
    queued = [ev.clientX, ev.clientY];
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const p = toSvg(queued[0], queued[1]);
      if (p) look(p.x, p.y);
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
  const tris = [...root.querySelectorAll(".tri")];
  function blinkSoon() {
    if (reduce.matches) return;
    setTimeout(() => {
      const t = tris[Math.floor(Math.random() * tris.length)];
      t.classList.remove("blink"); void t.getBoundingClientRect(); t.classList.add("blink");
      blinkSoon();
    }, 2600 + Math.random() * 3800);
  }
  blinkSoon();

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
    for (const t of tris) {
      const x = +t.dataset.mx, y = +t.dataset.my, r = +t.dataset.r;
      t.querySelector(".mouth").setAttribute("d", MOUTH[m](x, y, r));
    }
    if (m !== "idle" && !reduce.matches) { root.classList.remove("react"); void root.getBoundingClientRect(); root.classList.add("react"); }
  }

  /* ---------- a cowboy hat for Texas ---------- */
  // drawn to fit the trichome's own size; fills are set here so no stylesheet is needed
  const NS = "http://www.w3.org/2000/svg";
  function drawHat(t) {
    const bulb = t.querySelector(".bulb");
    const x = +bulb.getAttribute("cx"), cy = +bulb.getAttribute("cy"), r = +bulb.getAttribute("r");
    const u = r / 26, y = cy - r * 0.84;               // u: one unit of the 64-unit favicon drawing
    const P = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, a, b) => `${(x + (+a - 32) * u).toFixed(1)} ${(y + (+b - 20) * u).toFixed(1)}`);
    const outer = document.createElementNS(NS, "g"), g = document.createElementNS(NS, "g");
    outer.setAttribute("class", "hat"); outer.append(g);   // outer moves when it drops on, inner holds the tilt
    for (const [d, fill, stroke] of [
      ["M2 14 Q4 29 32 28 Q60 29 62 14 Q58 23 32 23 Q6 23 2 14 Z", "#8a5a1e"],
      ["M17 25 C16 15 18 5 24 5 Q28 9 32 7 Q36 9 40 5 C46 5 48 15 47 25 Q32 27 17 25 Z", "#b8843a"],
      ["M32 8 Q31 14 32 19", "none", "#8a5a1e"],
      ["M16.6 20 Q32 22.5 47.4 20 L47.2 24.4 Q32 26.6 16.8 24.4 Z", "#3b2412"],
    ]) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", P(d)); path.setAttribute("fill", fill);
      if (stroke) { path.setAttribute("stroke", stroke); path.setAttribute("stroke-width", (1.6 * u).toFixed(1)); path.setAttribute("stroke-linecap", "round"); }
      g.append(path);
    }
    g.setAttribute("transform", `rotate(-7 ${x} ${cy})`);   // tipped back a little
    return outer;
  }
  function hat(on) {
    const t = root.querySelector(".tri.clear");
    if (!t) return;
    const head = t.querySelector(".head");
    let h = head.querySelector(".hat");
    if (on && !h) {
      h = drawHat(t); head.append(h);
      if (!reduce.matches && h.animate) h.animate([{ transform: "translateY(-40px)", opacity: 0 }, { transform: "translateY(3px)", opacity: 1, offset: .75 }, { transform: "none", opacity: 1 }],
        { duration: 420, easing: "ease-out" });
    } else if (!on && h) {
      if (!reduce.matches && h.animate) h.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-30px)", opacity: 0 }], { duration: 220, easing: "ease-in" }).onfinish = () => h.remove();
      else h.remove();
    }
  }

  mood("idle");
  if (root.dataset.hat === "always") hat(true);    // the Texas-only checker: the hat stays on
  window.HeaderArt = { mood, hat };
})();
