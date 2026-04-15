/**
 * Six-slide deck: poster (0) + five process slides. Drives --slide-index on .app-carousel.
 */

const TOTAL_SLIDES = 6;
const CODEPEN_EMBED_SRC =
  "https://codepen.io/wodniack/embed/XJbYWXx?default-tab=result&theme-id=dark";

const HOLE_MARKUP = `
<black-hole class="found-asset-hole" data-text-scale="0.8">
  <canvas class="js-canvas-back" aria-hidden="true"></canvas>
  <canvas class="js-canvas-front" aria-hidden="true"></canvas>
</black-hole>
`.trim();

const POSTER_LIVE_MARKUP = `
<div class="poster-page poster-page--embed">
  <div class="poster-frame">
    <figure class="poster" aria-label="Ad Astra one-sheet">
      <div class="poster__bg" role="presentation"></div>
      <div class="poster__tear" role="presentation" aria-hidden="true">
        <div class="poster__tear-inner"></div>
      </div>
      <div class="poster__stage">
        <black-hole>
          <canvas class="js-canvas-back" aria-hidden="true"></canvas>
          <canvas class="js-canvas-front" aria-hidden="true"></canvas>
        </black-hole>
        <div class="astronaut-float" aria-hidden="true">
          <div class="astronaut-float__depth">
            <img
              class="astronaut-float__img"
              src="images/astronaut.png"
              alt=""
              decoding="async"
              width="378"
              height="426"
              onerror="this.onerror=null;this.src='images/astronaut.svg'"
            />
          </div>
        </div>
      </div>
    </figure>
  </div>
</div>
`.trim();

const TRANSFORM_TUNER_MARKUP = `
<div class="transform-tuner" id="transform-tuner-root">
  <div class="transform-tuner__visual">
    <div class="wormhole-tuner-frame">
      <figure class="poster poster--wormhole-only">
        <div class="poster__stage">
          <black-hole data-tuner>
            <canvas class="js-canvas-back" aria-hidden="true"></canvas>
            <canvas class="js-canvas-front" aria-hidden="true"></canvas>
          </black-hole>
          <div class="astronaut-float" aria-hidden="true">
            <div class="astronaut-float__depth">
              <img
                class="astronaut-float__img"
                src="images/astronaut.png"
                alt=""
                decoding="async"
                width="378"
                height="426"
                onerror="this.onerror=null;this.src='images/astronaut.svg'"
              />
            </div>
          </div>
        </div>
      </figure>
    </div>
  </div>
  <div class="transform-tuner__panel" role="group" aria-label="Wormhole parameters">
    <div class="tuner-field">
      <label class="tuner-field__label" for="tuner-slider-type">Type size</label>
      <input id="tuner-slider-type" class="tuner-field__range" type="range" min="0.35" max="2.4" step="0.01" value="1" />
      <span class="tuner-field__value" data-tuner-value-for="tuner-slider-type">1</span>
    </div>
    <div class="tuner-field">
      <label class="tuner-field__label" for="tuner-slider-motion">Wormhole speed</label>
      <input id="tuner-slider-motion" class="tuner-field__range" type="range" min="0.15" max="3.5" step="0.01" value="1" />
      <span class="tuner-field__value" data-tuner-value-for="tuner-slider-motion">1</span>
    </div>
    <div class="tuner-field">
      <label class="tuner-field__label" for="tuner-slider-hole">Hole size</label>
      <input id="tuner-slider-hole" class="tuner-field__range" type="range" min="0.82" max="3" step="0.01" value="1" />
      <span class="tuner-field__value" data-tuner-value-for="tuner-slider-hole">1</span>
    </div>
    <div class="tuner-field tuner-field--astro">
      <span class="tuner-field__label">Astronaut vertical offset</span>
      <div class="tuner-field__astro-row">
        <label class="tuner-field__switch">
          <input type="checkbox" id="tuner-toggle-astro" checked aria-label="Show astronaut" />
          <span class="tuner-field__switch-track" aria-hidden="true"></span>
        </label>
        <input id="tuner-slider-astro" class="tuner-field__range" type="range" min="-140" max="140" step="1" value="0" />
        <span class="tuner-field__value" data-tuner-value-for="tuner-slider-astro">0</span>
      </div>
    </div>
  </div>
</div>
`.trim();

function mountFoundAssetDemo() {
  const mount = document.getElementById("found-asset-mount");
  if (!mount || mount.dataset.mounted === "1") return;
  mount.innerHTML = HOLE_MARKUP;
  mount.dataset.mounted = "1";
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function mountTransformTuner() {
  const mount = document.getElementById("transform-tuner-mount");
  if (!mount || mount.dataset.mounted === "1") return;
  mount.innerHTML = TRANSFORM_TUNER_MARKUP;
  mount.dataset.mounted = "1";
  requestAnimationFrame(() => {
    wireTunerControls();
    window.dispatchEvent(new Event("resize"));
  });
}

function mountFinalComposition() {
  const mount = document.getElementById("final-composition-mount");
  if (!mount || mount.dataset.mounted === "1") return;
  mount.innerHTML = POSTER_LIVE_MARKUP;
  mount.dataset.mounted = "1";
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function wireTunerControls() {
  const root = document.getElementById("transform-tuner-root");
  const bh = root?.querySelector("black-hole[data-tuner]");
  const frame = root?.querySelector(".wormhole-tuner-frame");
  if (!root || !bh || !frame || bh.dataset.tunerWired === "1") return;

  const type = document.getElementById("tuner-slider-type");
  const motion = document.getElementById("tuner-slider-motion");
  const hole = document.getElementById("tuner-slider-hole");
  const astro = document.getElementById("tuner-slider-astro");
  const astroToggle = document.getElementById("tuner-toggle-astro");

  const sync = () => {
    bh._tunerTypeScaleMul = Number.parseFloat(type?.value || "1");
    bh._tunerMotionSpeedMul = Number.parseFloat(motion?.value || "1");
    bh._tunerHoleSizeMul = Number.parseFloat(hole?.value || "1");
    bh._tunerAstronautYOffsetPx = Number.parseFloat(astro?.value || "0");
    bh._tunerAstronautHidden = astroToggle ? !astroToggle.checked : false;
    root.querySelectorAll("[data-tuner-value-for]").forEach((el) => {
      const id = el.getAttribute("data-tuner-value-for");
      const input = id && document.getElementById(id);
      if (input) el.textContent = input.value;
    });
    if (bh.render) {
      bh.astronautTranslateYEnd = null;
      bh.cacheAstronautDescentEnd();
    }
    window.dispatchEvent(new Event("resize"));
  };

  [type, motion, hole, astro].forEach((el) => {
    el?.addEventListener("input", sync);
  });
  astroToggle?.addEventListener("change", sync);
  bh.dataset.tunerWired = "1";
  sync();
}

/**
 * @param {HTMLElement} root
 * @param {number} index
 * @param {{ skipScroll?: boolean }} [opts]
 */
function applySlide(root, index, opts = {}) {
  const i = Math.max(0, Math.min(TOTAL_SLIDES - 1, index));
  const skipScroll = opts.skipScroll === true;
  root.dataset.carouselSlide = String(i);
  root.style.setProperty("--slide-index", String(i));

  const viewport = document.getElementById("carousel-viewport");
  if (!skipScroll && viewport && window.matchMedia("(max-width: 768px)").matches) {
    const h = viewport.clientHeight;
    if (h > 0) {
      root.dataset.carouselScrollLock = "1";
      viewport.scrollTo({ top: i * h, behavior: "auto" });
      window.setTimeout(() => {
        root.dataset.carouselScrollLock = "";
      }, 100);
    }
  }

  const dots = root.querySelectorAll(".carousel-dot");
  dots.forEach((dot, di) => {
    const on = di === i;
    dot.classList.toggle("is-active", on);
    dot.setAttribute("aria-current", on ? "true" : "false");
  });

  const fabs = document.getElementById("carousel-fabs");
  if (fabs) {
    fabs.setAttribute("aria-hidden", i === 0 ? "true" : "false");
  }

  if (i === 2) {
    mountFoundAssetDemo();
  }
  if (i === 3) {
    mountTransformTuner();
  }
  if (i === 5) {
    mountFinalComposition();
  }
}

/**
 * Mobile: sync slide index from scroll-snap viewport (desktop unchanged).
 * @param {HTMLElement} root
 * @param {{ getSlide: () => number; setSlide: (n: number) => void }} api
 */
function initMobileScrollSnapSync(root, api) {
  const viewport = document.getElementById("carousel-viewport");
  if (!viewport) return;

  const mq = window.matchMedia("(max-width: 768px)");

  function syncFromScroll() {
    if (!mq.matches || root.dataset.carouselScrollLock === "1") return;
    const h = viewport.clientHeight;
    if (h < 1) return;
    const idx = Math.round(viewport.scrollTop / h);
    const clamped = Math.min(TOTAL_SLIDES - 1, Math.max(0, idx));
    if (clamped !== api.getSlide()) {
      api.setSlide(clamped);
      applySlide(root, clamped, { skipScroll: true });
    }
  }

  viewport.addEventListener("scroll", syncFromScroll, { passive: true });

  window.addEventListener("resize", () => {
    if (!mq.matches) return;
    const si = api.getSlide();
    root.dataset.carouselScrollLock = "1";
    viewport.scrollTo({ top: si * viewport.clientHeight, behavior: "auto" });
    window.setTimeout(() => {
      root.dataset.carouselScrollLock = "";
    }, 120);
  });
}

/**
 * @param {HTMLElement} root
 */
function initImageLightbox(root) {
  const box = document.getElementById("image-lightbox");
  const backdrop = box?.querySelector(".image-lightbox__backdrop");
  const closeBtn = box?.querySelector(".image-lightbox__close");
  const scroller = box?.querySelector(".image-lightbox__scroller");
  const panzoom = box?.querySelector(".image-lightbox__panzoom");
  const imgEl = box?.querySelector(".image-lightbox__img");
  const capEl = box?.querySelector(".image-lightbox__cap");
  const prevBtn = box?.querySelector(".image-lightbox__nav--prev");
  const nextBtn = box?.querySelector(".image-lightbox__nav--next");
  if (!box || !imgEl || !scroller || !panzoom) return;

  function isLightboxZoomDisabled() {
    return (
      window.matchMedia("(max-width: 768px)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    );
  }

  function updateZoomClass() {
    box.classList.toggle("image-lightbox--no-zoom", isLightboxZoomDisabled());
  }

  const ZOOM_MAX = 2;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let compareIndex = 0;
  /** @type {HTMLElement[]} */
  let thumbs = [];
  /** @type {HTMLElement | null} */
  let lastFocus = null;

  function refreshThumbs() {
    thumbs = Array.from(root.querySelectorAll(".process-card__compare .process-figure__img"));
  }

  function clampPan() {
    const vw = scroller.clientWidth;
    const vh = scroller.clientHeight;
    const iw = imgEl.offsetWidth;
    const ih = imgEl.offsetHeight;
    if (iw < 1 || ih < 1 || vw < 1 || vh < 1) return;
    const sw = iw * scale;
    const sh = ih * scale;
    const maxPanX = Math.max(0, (sw - vw) / 2);
    const maxPanY = Math.max(0, (sh - vh) / 2);
    panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
    panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
  }

  function applyPanZoom() {
    panzoom.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    scroller.dataset.zoom = scale > 1 ? "zoomed" : "fit";
  }

  function showAt(index) {
    refreshThumbs();
    const n = thumbs.length;
    if (n === 0) return;
    compareIndex = ((index % n) + n) % n;
    const fromImg = thumbs[compareIndex];
    imgEl.src = fromImg.getAttribute("src") || "";
    imgEl.alt = fromImg.getAttribute("alt") || "";
    const fig = fromImg.closest("figure");
    const cap = fig?.querySelector(".process-figure__cap");
    if (capEl) {
      capEl.textContent = cap ? cap.textContent.trim() : "";
    }
    scale = 1;
    panX = 0;
    panY = 0;
    panzoom.classList.add("is-dragging");
    updateZoomClass();
    applyPanZoom();
    const syncAfterLayout = () => {
      clampPan();
      applyPanZoom();
      requestAnimationFrame(() => {
        panzoom.classList.remove("is-dragging");
      });
    };
    if (imgEl.complete) {
      requestAnimationFrame(syncAfterLayout);
    } else {
      imgEl.addEventListener("load", syncAfterLayout, { once: true });
    }
  }

  function goPrev() {
    refreshThumbs();
    if (thumbs.length === 0) return;
    showAt(compareIndex - 1);
  }

  function goNext() {
    refreshThumbs();
    if (thumbs.length === 0) return;
    showAt(compareIndex + 1);
  }

  function open(fromImg) {
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    refreshThumbs();
    const i = thumbs.indexOf(fromImg);
    compareIndex = i >= 0 ? i : 0;
    box.hidden = false;
    document.body.style.overflow = "hidden";
    showAt(compareIndex);
    closeBtn?.focus();
  }

  function close() {
    box.hidden = true;
    document.body.style.overflow = "";
    imgEl.removeAttribute("src");
    imgEl.alt = "";
    if (capEl) capEl.textContent = "";
    scale = 1;
    panX = 0;
    panY = 0;
    panzoom.classList.remove("is-dragging");
    applyPanZoom();
    lastFocus?.focus();
    lastFocus = null;
  }

  root.querySelectorAll(".process-card__compare .process-figure__img").forEach((img) => {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    const cap = img.closest("figure")?.querySelector(".process-figure__cap");
    if (cap) {
      img.setAttribute("aria-label", `View enlarged: ${cap.textContent.trim()}`);
    }
  });

  root.addEventListener("click", (e) => {
    const img = e.target.closest(".process-card__compare .process-figure__img");
    if (!img || !root.contains(img)) return;
    e.preventDefault();
    open(img);
  });

  root.addEventListener("keydown", (e) => {
    const img = e.target.closest(".process-card__compare .process-figure__img");
    if (!img || !root.contains(img)) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(img);
    }
  });

  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);

  prevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    goPrev();
  });
  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    goNext();
  });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
      return;
    }
  });

  function toggleZoom() {
    if (isLightboxZoomDisabled()) return;
    panzoom.classList.remove("is-dragging");
    scale = scale > 1 ? 1 : ZOOM_MAX;
    if (scale === 1) {
      panX = 0;
      panY = 0;
    }
    clampPan();
    applyPanZoom();
  }

  const TAP_THRESHOLD = 6;
  const TAP_SLOP = 14;

  /** @type {"tap" | null} */
  let dragMode = null;
  /** True once movement exceeds threshold while zoomed — then we pan instead of tap-to-zoom-out. */
  let panCommitted = false;
  let downPointerId = null;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;

  function onResizeWhileOpen() {
    if (box.hidden) return;
    clampPan();
    applyPanZoom();
  }
  window.addEventListener("resize", onResizeWhileOpen);

  scroller.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (!panzoom.contains(e.target)) return;
    if (isLightboxZoomDisabled()) return;

    if (scale > 1) {
      e.preventDefault();
      panCommitted = false;
      downPointerId = e.pointerId;
      downX = lastX = e.clientX;
      downY = lastY = e.clientY;
      return;
    }

    if (e.pointerType === "touch") return;
    dragMode = "tap";
    downPointerId = e.pointerId;
    downX = e.clientX;
    downY = e.clientY;
  });

  scroller.addEventListener("pointermove", (e) => {
    if (e.pointerId !== downPointerId) return;

    if (scale > 1) {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (!panCommitted && moved > TAP_THRESHOLD) {
        panCommitted = true;
        panzoom.classList.add("is-dragging");
        scroller.setPointerCapture(e.pointerId);
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      if (panCommitted) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        panX += dx;
        panY += dy;
        clampPan();
        applyPanZoom();
      }
      return;
    }

    if (dragMode === "tap") {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > TAP_THRESHOLD) {
        dragMode = null;
      }
    }
  });

  scroller.addEventListener("pointerup", (e) => {
    if (e.pointerId !== downPointerId) return;
    if (typeof scroller.hasPointerCapture === "function" && scroller.hasPointerCapture(e.pointerId)) {
      scroller.releasePointerCapture(e.pointerId);
    }

    if (scale > 1) {
      panzoom.classList.remove("is-dragging");
      const travel = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (!panCommitted && travel <= TAP_SLOP) {
        toggleZoom();
      }
      panCommitted = false;
      downPointerId = null;
      return;
    }

    if (dragMode === "tap") {
      const travel = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (travel <= TAP_SLOP && e.pointerType !== "touch") {
        toggleZoom();
      }
    }
    dragMode = null;
    downPointerId = null;
  });

  scroller.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== downPointerId) return;
    if (typeof scroller.hasPointerCapture === "function" && scroller.hasPointerCapture(e.pointerId)) {
      scroller.releasePointerCapture(e.pointerId);
    }
    panzoom.classList.remove("is-dragging");
    dragMode = null;
    panCommitted = false;
    downPointerId = null;
  });
}

function init() {
  const root = document.getElementById("app-carousel");
  if (!root) return;

  let slide = 0;

  initImageLightbox(root);

  const goTo = (next) => {
    slide = ((next % TOTAL_SLIDES) + TOTAL_SLIDES) % TOTAL_SLIDES;
    applySlide(root, slide);
  };

  initMobileScrollSnapSync(root, {
    getSlide: () => slide,
    setSlide: (n) => {
      slide = n;
    },
  });

  document.getElementById("carousel-enter")?.addEventListener("click", () => {
    goTo(1);
  });

  document.getElementById("carousel-prev")?.addEventListener("click", () => {
    goTo(slide - 1);
  });

  document.getElementById("carousel-next")?.addEventListener("click", () => {
    if (slide === TOTAL_SLIDES - 1) {
      goTo(0);
    } else {
      goTo(slide + 1);
    }
  });

  root.querySelectorAll(".carousel-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      const n = Number.parseInt(dot.getAttribute("data-slide") || "0", 10);
      if (!Number.isNaN(n)) goTo(n);
    });
  });

  root.querySelectorAll("[data-carousel-go]").forEach((el) => {
    el.addEventListener("click", () => {
      const n = Number.parseInt(el.getAttribute("data-carousel-go") || "0", 10);
      if (!Number.isNaN(n)) goTo(n);
    });
  });

  root.addEventListener("keydown", (e) => {
    const lb = document.getElementById("image-lightbox");
    if (lb && !lb.hidden) return;
    if (slide === 0) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(slide - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (slide === TOTAL_SLIDES - 1) goTo(0);
      else goTo(slide + 1);
    }
  });

  applySlide(root, 0);
}

init();
