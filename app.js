const PHRASE = "LOSS OF SIGNAL ";
const MAX_DPR = 2;
const DISC_COUNT = 96;
/** Discs with index < split = “back”; >= split = “closer” (drawn above astronaut). */
const DISC_SPLIT = Math.floor(DISC_COUNT / 2);
const PARTICLE_COUNT = 3328;
const FONT_PREFIX = '400 ';
const FONT_SUFFIX = 'px "IBM Plex Mono", monospace';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInExpo = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));

/** One-shot descent duration (ms); then holds at bottom until page refresh. */
const ASTRONAUT_CYCLE_MS = 16000;
/** Barely visible idle bob: peak amplitude (px), period (ms), ramp-in duration (ms). */
const ASTRONAUT_IDLE_FLOAT_PX = 1.9;
const ASTRONAUT_IDLE_FLOAT_PERIOD_MS = 5600;
const ASTRONAUT_IDLE_FLOAT_RAMP_MS = 1200;
/** Start the descent path higher on screen (negative translateY offset at u=0). */
const ASTRONAUT_START_OFFSET_Y_PX = -110;
/** Base scale factor before descent shrink (end state still derived from this). */
const ASTRONAUT_SCALE_MAX = 0.8;
/** Starting size is this × ASTRONAUT_SCALE_MAX (20% smaller start ⇒ 0.8 → 0.64 at u=0). */
const ASTRONAUT_SCALE_START_FACTOR = 0.8;
/** Gap between astronaut feet and the top of the “FROM DIRECTOR JAMES GRAY” line (px). */
const ASTRONAUT_GAP_ABOVE_DIRECTOR_PX = 12;
/** Nudge end position slightly lower (px); same cycle length / easing. */
const ASTRONAUT_END_EXTRA_DOWN_PX = 22;
/** How much scale drops over u=0→1 (higher = smaller at end). Was 0.44. */
const ASTRONAUT_SCALE_SHRINK = 0.52;

/** Reference poster height (px) for 27×40 at ~810px width — used to scale stage offset so layout matches desktop at any size. */
const REF_POSTER_HEIGHT_PX = 1200;
const STAGE_HALF_OFFSET_BASE_PX = 242.5; /* --poster-stage-h-base / 2 */

/** Matches former --tune-stage-bottom; used in resize() for --poster-stage-bottom offset. */
const STAGE_BOTTOM_MUL = 0.5;
/** Scales extra distance from poster bottom to stage bottom (see resize()). */
const TUNE_STAGE_Y_BOTTOM_FRAC = 0.08;
/** Desktop wormhole type scale (canvas). */
const TYPE_DESKTOP = 1.18;
/** Legacy ratio vs TYPE_DESKTOP_RATIO_REF for mobile glyph size. */
const TYPE_RATIO_MOBILE = 0.77;
const TYPE_DESKTOP_RATIO_REF = 1.22;
/** Extra multiplier on mobile wormhole type (smaller on phones). */
const MOBILE_TYPE_EXTRA_FACTOR = 0.88;
/**
 * Paper tear begins sliding down after this fraction of linear descent time (0–1).
 * Movement completes by t=1 (aligned with end of easeInOutCubic descent).
 */
const TEAR_SLIDE_DESCENT_START_T = 0.66;

/** Narrow viewports only: added to end translateY (px; negative raises the astronaut). */
const ASTRONAUT_MOBILE_REST_DOWN_PX = -9;
/** Desktop astronaut end nudge (px), added after geometry + ASTRONAUT_END_EXTRA_DOWN_PX. */
const ASTRONAUT_DESKTOP_NUDGE_PX = 0;

function wormholeTypeScale(compact) {
  if (!compact) return TYPE_DESKTOP;
  return TYPE_RATIO_MOBILE * (TYPE_DESKTOP / TYPE_DESKTOP_RATIO_REF) * MOBILE_TYPE_EXTRA_FACTOR;
}

/** Top “full phrase” band: fewer labels, longer runs only (less clutter). */
const TOP_FULL_FRAC = 0.028;
const TOP_FULL_MIN = 28;
const TOP_LEN_MIN = 8;
const TOP_LEN_MAX = 14;

class BlackHole extends HTMLElement {
  connectedCallback() {
    this.canvasBack = this.querySelector(".js-canvas-back");
    this.canvasFront = this.querySelector(".js-canvas-front");
    this.ctxBack =
      this.canvasBack.getContext("2d", { alpha: false }) || this.canvasBack.getContext("2d");
    this.ctxFront = this.canvasFront.getContext("2d", { alpha: true }) || this.canvasFront.getContext("2d");
    this.tick = this.tick.bind(this);
    this.onResize = this.onResize.bind(this);
    this.bins = Array.from({ length: 27 }, () => []);
    this.astronautDepthEl =
      this.closest(".poster__stage")?.querySelector(".astronaut-float__depth") ||
      this.querySelector(".astronaut-float__depth");
    this.posterTearEl = this.closest(".poster")?.querySelector(".poster__tear") || null;
    this._tearReduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /** @type {number | null} Cached translateY (px) at u=1 — stop just above director line */
    this.astronautTranslateYEnd = null;
    /** @type {number | null} performance.now() when descent began; null until first frame */
    this.astronautDescentStartMs = null;
    /** @type {number | null} when idle float phase starts (sin=0) — avoids jitter at handoff */
    this.astronautIdleStartMs = null;
    this.ready();
  }

  async ready() {
    await document.fonts.ready;
    this.resize();
    window.addEventListener("resize", this.onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", this.onResize);
      window.visualViewport.addEventListener("scroll", this.onResize);
    }
    requestAnimationFrame(this.tick);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.onResize);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener("resize", this.onResize);
      window.visualViewport.removeEventListener("scroll", this.onResize);
    }
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
  }

  onResize() {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.resize(), 100);
  }

  /**
   * Narrow viewports: smaller wormhole type; stage CSS unchanged.
   */
  layoutHints() {
    const compact =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches;
    return {
      compact,
      topYFrac: 0.36,
      topFullFrac: TOP_FULL_FRAC,
      topFullMin: TOP_FULL_MIN,
      astronautEndExtraDown: ASTRONAUT_END_EXTRA_DOWN_PX,
      directorStageCapFrac: 1,
    };
  }

  resize() {
    const now = performance.now();
    const prevStart = this.astronautDescentStartMs;
    const preservedElapsed = prevStart != null ? now - prevStart : 0;
    const descentWasComplete = preservedElapsed >= ASTRONAUT_CYCLE_MS;

    const poster = this.closest(".poster");
    if (poster) {
      const ph = poster.getBoundingClientRect().height;
      const gb = STAGE_BOTTOM_MUL;
      const baseBottom = ph * (0.5 - STAGE_HALF_OFFSET_BASE_PX / REF_POSTER_HEIGHT_PX);
      const bottomExtra = (gb - 1) * ph * TUNE_STAGE_Y_BOTTOM_FRAC;
      poster.style.setProperty("--poster-stage-bottom", `${Math.max(0, baseBottom + bottomExtra)}px`);
    }

    const rect = this.getBoundingClientRect();
    const dpi = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    this.render = {
      width: rect.width,
      height: rect.height,
      dpi,
      x: rect.width * 0.5,
      y: 0,
      w: rect.width,
      h: rect.height,
    };
    this._layoutHints = this.layoutHints();
    const cw = Math.max(1, Math.floor(rect.width * dpi));
    const ch = Math.max(1, Math.floor(rect.height * dpi));
    this.canvasBack.width = cw;
    this.canvasBack.height = ch;
    this.canvasFront.width = cw;
    this.canvasFront.height = ch;
    this.makeDiscs();
    this.makeParticles();
    this.astronautTranslateYEnd = null;
    this.cacheAstronautDescentEnd();

    if (descentWasComplete) {
      this.astronautDescentStartMs = now - ASTRONAUT_CYCLE_MS;
      this.astronautIdleStartMs = now;
    } else if (prevStart != null) {
      this.astronautDescentStartMs = now - Math.min(preservedElapsed, ASTRONAUT_CYCLE_MS);
      this.astronautIdleStartMs = null;
    }
  }

  /**
   * End of descent: astronaut sits just above the director credit line on the poster JPEG.
   * Uses `--poster-director-from-bottom` on `.poster` (see styles.css).
   */
  cacheAstronautDescentEnd() {
    const el = this.astronautDepthEl;
    const poster = this.closest(".poster");
    const stage = this.closest(".poster__stage");
    if (!el || !this.render || !poster || !stage) {
      this.astronautTranslateYEnd = null;
      return;
    }
    const pr = poster.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const h = this.render.height;
    const raw = getComputedStyle(poster).getPropertyValue("--poster-director-from-bottom").trim() || "18%";
    const pct = parseFloat(raw);
    const frac = Number.isFinite(pct) ? pct / 100 : 0.18;
    const directorTopFromPosterTop = pr.height * (1 - frac);
    let directorTopInStage = directorTopFromPosterTop - (sr.top - pr.top);
    directorTopInStage = Math.max(0, directorTopInStage);
    const hints = this._layoutHints ?? this.layoutHints();
    const img = el.querySelector("img");
    const imgH = img?.offsetHeight || h * 0.22;
    const scaleAtEnd = (1 - ASTRONAUT_SCALE_SHRINK) * ASTRONAUT_SCALE_MAX;
    const halfImgScaled = (imgH * scaleAtEnd) / 2;
    let yEnd =
      directorTopInStage -
      ASTRONAUT_GAP_ABOVE_DIRECTOR_PX -
      halfImgScaled -
      h / 2 +
      hints.astronautEndExtraDown;
    yEnd += ASTRONAUT_DESKTOP_NUDGE_PX;
    if (hints.compact) yEnd += ASTRONAUT_MOBILE_REST_DOWN_PX;
    this.astronautTranslateYEnd = yEnd;
  }

  makeDiscs() {
    const discs = [];
    for (let i = 0; i < DISC_COUNT; i++) {
      const disc = this.mapDisc({ p: i / DISC_COUNT });
      disc.discIndex = i;
      discs.push(disc);
    }
    this.discs = discs;
  }

  slicePhrase(start, len) {
    let out = "";
    for (let i = 0; i < len; i++) out += PHRASE[(start + i) % PHRASE.length];
    return out;
  }

  breakText(input, strength) {
    const out = [];
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      const r = Math.random();
      if (ch === " ") {
        out.push(r < strength * 0.35 ? "  " : " ");
        continue;
      }
      if (r < strength * 0.08) continue;
      if (r < strength * 0.2) out.push("_");
      else if (r < strength * 0.34) out.push(" ");
      else out.push(ch);
    }
    return out
      .join("")
      .replace(/\bLOSS\b/g, "LOS_S")
      .replace(/\bOF\b/g, "O_F")
      .replace(/\bSIGNAL\b/g, "SIG_NAL");
  }

  /** Same damage loop as `breakText`, without word-splitting regex (top band only). */
  breakTextLight(input, strength) {
    const out = [];
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      const r = Math.random();
      if (ch === " ") {
        out.push(r < strength * 0.35 ? "  " : " ");
        continue;
      }
      if (r < strength * 0.08) continue;
      if (r < strength * 0.2) out.push("_");
      else if (r < strength * 0.34) out.push(" ");
      else out.push(ch);
    }
    return out.join("");
  }

  sampleParticle(discs) {
    const d = discs[(Math.random() * discs.length) | 0];
    const depth = d.sx * d.sy;
    const legibility = Math.pow(Math.max(0.0001, depth), 0.55);
    const len =
      legibility > 0.55 ? 4 + ((Math.random() * 5) | 0) :
      legibility > 0.25 ? 2 + ((Math.random() * 4) | 0) :
      1 + ((Math.random() * 3) | 0);
    const a = Math.random() * Math.PI * 2;
    const p = Math.random();
    const angle = a + Math.PI * 2 * p;
    const px = d.x + Math.cos(angle) * d.w;
    const py = d.y + Math.sin(angle) * d.h + d.h;
    return { d, a, p, depth, legibility, len, px, py };
  }

  makeParticles() {
    const { w, h } = this.render;
    const hints = this._layoutHints ?? this.layoutHints();
    const tape = PHRASE.length;
    const topY = h * hints.topYFrac;
    const maxTop = Math.max(hints.topFullMin, Math.floor(PARTICLE_COUNT * hints.topFullFrac));
    this.fullWordTarget = maxTop;
    this.topY = topY;
    const particles = [];
    const discs = this.discs;
    let guard = 0;

    while (particles.length < maxTop && guard++ < 120000) {
      const s = this.sampleParticle(discs);
      if (s.py >= topY) continue;
      if (Math.random() > 0.48) continue;
      const len = TOP_LEN_MIN + ((Math.random() * (TOP_LEN_MAX - TOP_LEN_MIN + 1)) | 0);
      const cx = Math.max(0, Math.min(w, s.px));
      const start =
        ((Math.floor((cx / w) * tape * 10) % (tape * 64)) + tape * 64) % (tape * 64);
      const tBand = s.py / topY;
      const subtle = 0.02 + tBand * tBand * 0.09;
      const text = this.breakTextLight(this.slicePhrase(start, len), subtle);
      particles.push({
        d: s.d,
        a: s.a,
        p: s.p,
        o: 0.35 + Math.random() * 0.65,
        full: true,
        len,
        text,
      });
    }

    guard = 0;
    while (particles.length < PARTICLE_COUNT && guard++ < 200000) {
      const s = this.sampleParticle(discs);
      if (s.py < topY) continue;
      const damage = 0.14 + (1 - s.legibility) * 0.78;
      const startR = (Math.random() * tape * 64) | 0;
      particles.push({
        d: s.d,
        a: s.a,
        p: s.p,
        o: 0.35 + Math.random() * 0.65,
        full: false,
        len: s.len,
        text: this.breakText(this.slicePhrase(startR, s.len), damage),
      });
    }

    let g3 = 0;
    while (particles.length < PARTICLE_COUNT && g3++ < 800000) {
      const s = this.sampleParticle(discs);
      if (s.py < topY) continue;
      const damage = 0.14 + (1 - s.legibility) * 0.78;
      const startR = (Math.random() * tape * 64) | 0;
      particles.push({
        d: s.d,
        a: s.a,
        p: s.p,
        o: 0.35 + Math.random() * 0.65,
        full: false,
        len: s.len,
        text: this.breakText(this.slicePhrase(startR, s.len), damage),
      });
    }
    while (particles.length < PARTICLE_COUNT) {
      const s = this.sampleParticle(discs);
      const damage = 0.14 + (1 - s.legibility) * 0.78;
      const startR = (Math.random() * tape * 64) | 0;
      particles.push({
        d: s.d,
        a: s.a,
        p: s.p,
        o: 0.35 + Math.random() * 0.65,
        full: false,
        len: s.len,
        text: this.breakText(this.slicePhrase(startR, s.len), damage),
      });
    }

    this.particles = particles;
  }

  mapDisc(d) {
    d.sx = 1 - easeOutCubic(d.p);
    d.sy = 1 - easeOutExpo(d.p);
    d.w = this.render.w * d.sx;
    d.h = this.render.h * d.sy;
    d.x = this.render.x;
    d.y = this.render.y + d.p * this.render.h;
    return d;
  }

  moveDiscs() {
    for (let i = 0; i < this.discs.length; i++) {
      const d = this.discs[i];
      d.p = (d.p + 0.0003) % 1;
      this.mapDisc(d);
      const p = d.sx * d.sy;
      d.a = p < 0.01 ? Math.pow(Math.min(p / 0.01, 1), 3) : p > 0.2 ? 1 - Math.min((p - 0.2) / 0.8, 1) : 1;
    }
  }

  moveParticles() {
    for (let i = 0; i < this.particles.length; i++) {
      const dot = this.particles[i];
      const depth = dot.d.sx * dot.d.sy;
      dot.p = (dot.p + 0.00045 * easeInExpo(1 - depth)) % 1;
    }
  }

  particleXY(dot) {
    const angle = dot.a + Math.PI * 2 * dot.p;
    return {
      px: dot.d.x + Math.cos(angle) * dot.d.w,
      py: dot.d.y + Math.sin(angle) * dot.d.h + dot.d.h,
    };
  }

  demoteParticle(dot) {
    const tape = PHRASE.length;
    const depth = dot.d.sx * dot.d.sy;
    const legibility = Math.pow(Math.max(0.0001, depth), 0.55);
    const len =
      legibility > 0.55 ? 4 + ((Math.random() * 5) | 0) :
      legibility > 0.25 ? 2 + ((Math.random() * 4) | 0) :
      1 + ((Math.random() * 3) | 0);
    const damage = 0.14 + (1 - legibility) * 0.78;
    const startR = (Math.random() * tape * 64) | 0;
    dot.len = len;
    dot.text = this.breakText(this.slicePhrase(startR, len), damage);
    dot.full = false;
  }

  promoteParticle(dot) {
    const { w, h } = this.render;
    const tape = PHRASE.length;
    const topY = this.topY;
    const { px, py } = this.particleXY(dot);
    const len = TOP_LEN_MIN + ((Math.random() * (TOP_LEN_MAX - TOP_LEN_MIN + 1)) | 0);
    const cx = Math.max(0, Math.min(w, px));
    const start =
      ((Math.floor((cx / w) * tape * 10) % (tape * 64)) + tape * 64) % (tape * 64);
    const tBand = Math.min(1, py / topY);
    const subtle = 0.02 + tBand * tBand * 0.09;
    dot.len = len;
    dot.text = this.breakTextLight(this.slicePhrase(start, len), subtle);
    dot.full = true;
  }

  /** Keep ~`fullWordTarget` full-word labels in the top band as motion moves particles. */
  replenishFullWords() {
    const { w, h } = this.render;
    const topY = this.topY;
    const target = this.fullWordTarget;
    const particles = this.particles;
    let fullInTop = 0;
    const promotePool = [];
    const demoteIdx = [];

    for (let i = 0; i < particles.length; i++) {
      const dot = particles[i];
      const { px, py } = this.particleXY(dot);
      if (dot.full) {
        if (py < topY) fullInTop++;
        else demoteIdx.push(i);
      } else if (py < topY) promotePool.push(i);
    }

    for (let j = 0; j < demoteIdx.length; j++) {
      this.demoteParticle(particles[demoteIdx[j]]);
    }

    let need = target - fullInTop;
    if (need <= 0 || !promotePool.length) return;
    const n = Math.min(need, promotePool.length, 8);
    for (let k = 0; k < n; k++) {
      const ri = (Math.random() * promotePool.length) | 0;
      const idx = promotePool.splice(ri, 1)[0];
      this.promoteParticle(particles[idx]);
    }
  }

  drawParticles(ctx, discPredicate) {
    const bins = this.bins;
    for (let i = 0; i < bins.length; i++) bins[i].length = 0;

    const topY = this.topY;
    const compact = this._layoutHints?.compact ?? false;
    const typeScale = wormholeTypeScale(compact);
    for (let i = 0; i < this.particles.length; i++) {
      const dot = this.particles[i];
      if (!discPredicate(dot.d.discIndex)) continue;
      const alpha = dot.d.a * dot.o;
      if (alpha < 0.02) continue;
      const depth = dot.d.sx * dot.d.sy;
      const fs = Math.max(4, Math.round((5 + depth * 26) * typeScale));
      const bin = Math.min(bins.length - 1, Math.max(0, fs - 5));
      const angle = dot.a + Math.PI * 2 * dot.p;
      const px = dot.d.x + Math.cos(angle) * dot.d.w;
      const py = dot.d.y + Math.sin(angle) * dot.d.h + dot.d.h;
      if (py < topY && !dot.full) continue;
      bins[bin].push({
        x: px,
        y: py,
        a: alpha,
        t: dot.text,
      });
    }

    ctx.fillStyle = "#f2f2f2";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    for (let i = 0; i < bins.length; i++) {
      const batch = bins[i];
      if (!batch.length) continue;
      const fontSize = Math.max(4, Math.round((i + 5) * typeScale));
      ctx.font = FONT_PREFIX + fontSize + FONT_SUFFIX;
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        ctx.globalAlpha = item.a;
        ctx.fillText(item.t, item.x, item.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  /**
   * One-shot descent, then idle at the bottom (subtle float) until refresh.
   */
  updateAstronautDescent() {
    const el = this.astronautDepthEl;
    if (!el || !this.render) return;
    const { height: h } = this.render;
    if (this.astronautTranslateYEnd == null) {
      this.cacheAstronautDescentEnd();
    }
    const y0 = ASTRONAUT_START_OFFSET_Y_PX;
    let y1 = this.astronautTranslateYEnd;
    if (y1 == null || Number.isNaN(y1)) {
      y1 = y0 + Math.min(h * 0.28, 260);
    }
    const endScale = (1 - ASTRONAUT_SCALE_SHRINK) * ASTRONAUT_SCALE_MAX;
    const startScale = ASTRONAUT_SCALE_MAX * ASTRONAUT_SCALE_START_FACTOR;

    if (this.astronautDescentStartMs == null) {
      this.astronautDescentStartMs = performance.now();
    }

    const now = performance.now();
    const elapsed = now - this.astronautDescentStartMs;
    const tLinear = Math.min(1, elapsed / ASTRONAUT_CYCLE_MS);
    const u = easeInOutCubic(tLinear);

    let translateY;
    let scale;
    if (tLinear >= 1) {
      if (this.astronautIdleStartMs == null) {
        this.astronautIdleStartMs = now;
      }
      const idleT = now - this.astronautIdleStartMs;
      const phase = (idleT / ASTRONAUT_IDLE_FLOAT_PERIOD_MS) * Math.PI * 2;
      let amp = ASTRONAUT_IDLE_FLOAT_PX;
      if (idleT < ASTRONAUT_IDLE_FLOAT_RAMP_MS) {
        amp *= easeInOutCubic(idleT / ASTRONAUT_IDLE_FLOAT_RAMP_MS);
      }
      const floatY = Math.sin(phase) * amp;
      translateY = y1 + floatY;
      scale = endScale;
    } else {
      this.astronautIdleStartMs = null;
      translateY = y0 + u * (y1 - y0);
      scale = startScale + u * (endScale - startScale);
    }

    el.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
    el.style.opacity = "1";
    el.style.visibility = "visible";

    const tear = this.posterTearEl;
    if (tear) {
      let tearT = 0;
      if (tLinear >= 1) {
        tearT = 1;
      } else if (tLinear > TEAR_SLIDE_DESCENT_START_T) {
        const span = 1 - TEAR_SLIDE_DESCENT_START_T;
        const raw = (tLinear - TEAR_SLIDE_DESCENT_START_T) / span;
        tearT = this._tearReduceMotion ? raw : easeOutCubic(raw);
      }
      tear.style.setProperty("--poster-tear-y", `${tearT * 100}%`);
    }
  }

  drawDiscs(ctx, iStart, iEnd) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = iStart; i < iEnd; i++) {
      const d = this.discs[i];
      ctx.globalAlpha = d.a * 0.9;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + d.h, d.w, d.h, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  tick() {
    if (!this.render) {
      requestAnimationFrame(this.tick);
      return;
    }
    const { ctxBack, ctxFront, canvasBack, canvasFront, render } = this;
    const split = DISC_SPLIT;

    this.moveDiscs();
    this.updateAstronautDescent();
    this.moveParticles();
    this.replenishFullWords();

    ctxBack.setTransform(1, 0, 0, 1, 0, 0);
    ctxBack.fillStyle = "#000";
    ctxBack.fillRect(0, 0, canvasBack.width, canvasBack.height);
    ctxBack.scale(render.dpi, render.dpi);
    this.drawDiscs(ctxBack, 0, split);
    this.drawParticles(ctxBack, (idx) => idx < split);
    ctxBack.setTransform(1, 0, 0, 1, 0, 0);

    ctxFront.setTransform(1, 0, 0, 1, 0, 0);
    ctxFront.clearRect(0, 0, canvasFront.width, canvasFront.height);
    ctxFront.scale(render.dpi, render.dpi);
    this.drawDiscs(ctxFront, split, DISC_COUNT);
    this.drawParticles(ctxFront, (idx) => idx >= split);
    ctxFront.setTransform(1, 0, 0, 1, 0, 0);

    requestAnimationFrame(this.tick);
  }
}

customElements.define("black-hole", BlackHole);
