/**
 * Six-slide deck: poster (0) + five process slides. Drives --slide-index on .app-carousel.
 */

const TOTAL_SLIDES = 6;
/** Match one-shot poster animation cycle timing (see app.js ASTRONAUT_CYCLE_MS). */
const POSTER_ANIM_COMPLETE_MS = 16000;
const POSTER_PEEK_DELAY_MS = POSTER_ANIM_COMPLETE_MS + 600;

/** iOS: viewport.clientHeight often ≠ each slide’s offsetHeight (toolbar/svh); use slide height for snap math. */
function getMobileCarouselSlideHeight(viewport) {
  const slide = viewport?.querySelector("#carousel-track .carousel-slide");
  const h = slide?.offsetHeight;
  if (h && h > 0) return h;
  return viewport?.clientHeight || 0;
}

/**
 * Smoothly return viewport to top without scroll-snap fighting the animation.
 * @param {HTMLElement} viewport
 * @param {HTMLElement} root
 * @param {() => void} [onDone]
 */
function smoothScrollViewportToTop(viewport, root, onDone) {
  const startTop = viewport.scrollTop;
  if (startTop <= 1) {
    viewport.scrollTop = 0;
    if (onDone) onDone();
    return;
  }

  const startedAt = performance.now();
  const maxMs = 900;
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    viewport.classList.remove("is-programmatic-scroll");
    root.dataset.carouselScrollLock = "";
    viewport.scrollTop = 0;
    if (onDone) onDone();
  };

  root.dataset.carouselScrollLock = "1";
  viewport.classList.add("is-programmatic-scroll");
  viewport.scrollTo({ top: 0, behavior: "smooth" });

  const poll = () => {
    if (done) return;
    const elapsed = performance.now() - startedAt;
    if (viewport.scrollTop <= 1 || elapsed >= maxMs) {
      finish();
      return;
    }
    requestAnimationFrame(poll);
  };

  requestAnimationFrame(poll);
}

/**
 * Poster hint: after poster animation completes, nudge slide 0 upward and back.
 * Repeats every 15s until user actually moves to another slide.
 * @param {HTMLElement} root
 * @param {() => number} getSlide
 */
function initPosterAutoPeekHint(root, getSlide) {
  const viewport = document.getElementById("carousel-viewport");
  if (!viewport) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let animating = false;
  let stopped = false;
  let loopTimer = null;

  const animate = (from, to, durationMs, done) => {
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      viewport.scrollTop = from + (to - from) * ease(t);
      if (t < 1) requestAnimationFrame(tick);
      else if (done) done();
    }
    requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    stopped = true;
    if (loopTimer) {
      clearInterval(loopTimer);
      loopTimer = null;
    }
  };

  const maybeRunPeek = () => {
    if (stopped || animating) return;
    if (getSlide() !== 0) {
      stopLoop();
      return;
    }
    const unit = Math.max(1, getMobileCarouselSlideHeight(viewport));
    const peekDistance = Math.min(220, Math.max(84, unit * 0.16));
    const startTop = viewport.scrollTop;
    if (startTop > 4) return;
    const targetTop = startTop + peekDistance;

    animating = true;
    root.dataset.carouselScrollLock = "1";
    viewport.classList.add("is-programmatic-scroll");

    animate(startTop, targetTop, 420, () => {
      animate(targetTop, startTop, 520, () => {
        viewport.classList.remove("is-programmatic-scroll");
        root.dataset.carouselScrollLock = "";
        viewport.scrollTop = 0;
        if (typeof applySlide === "function") {
          applySlide(root, 0, { skipScroll: true });
        }
        animating = false;
      });
    });
  };

  const onRealNavigation = () => {
    if (getSlide() !== 0) {
      stopLoop();
    }
  };

  viewport.addEventListener("scroll", onRealNavigation, { passive: true });
  window.addEventListener("keydown", onRealNavigation, { passive: true });

  window.setTimeout(() => {
    if (stopped) return;
    maybeRunPeek();
    loopTimer = window.setInterval(maybeRunPeek, 15000);
  }, POSTER_PEEK_DELAY_MS);
}

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

/**
 * Black-hole canvases size from layout; off-screen or freshly mounted nodes can read 0×0 until layout settles.
 * @param {HTMLElement | null} mount
 */
function layoutBlackHoleInMount(mount) {
  if (!mount) return;
  const bh = mount.querySelector("black-hole");
  const flush = () => {
    if (bh && typeof bh.resize === "function") {
      bh.resize();
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flush();
    });
  });
}

function layoutFinalCompositionMount() {
  const mount = document.getElementById("final-composition-mount");
  if (!mount) return;
  const flush = () => {
    mount.querySelectorAll("black-hole").forEach((el) => {
      if (typeof el.resize === "function") {
        el.resize();
      }
    });
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flush();
    });
  });
}

/**
 * Mobile reliability without preloading every heavy slide:
 * mount only active slide's interactive content, plus one-slide lookahead.
 * @param {number} index
 */
function ensureInteractiveSlideContent(index) {
  if (index === 2) {
    mountFoundAssetDemo();
    const mount = document.getElementById("found-asset-mount");
    if (needsBlackHoleLayout(mount)) {
      layoutBlackHoleInMount(mount);
    }
    return;
  }
  if (index === 3) {
    const mount = document.getElementById("transform-tuner-mount");
    const wasMounted = mount?.dataset.mounted === "1";
    mountTransformTuner();
    enforceMobileTransformLayout();
    wireTunerControls();
    if (!wasMounted || needsBlackHoleLayout(mount)) {
      layoutBlackHoleInMount(mount);
    }
    return;
  }
  if (index === 5) {
    const mount = document.getElementById("final-composition-mount");
    const wasMounted = mount?.dataset.mounted === "1";
    mountFinalComposition();
    if (!wasMounted) {
      layoutFinalCompositionMount();
    }
  }
}

/**
 * Rebuild wormhole layout only when canvas render size is missing/stale.
 * @param {HTMLElement | null} mount
 */
function needsBlackHoleLayout(mount) {
  const bh = mount?.querySelector("black-hole");
  if (!bh || typeof bh.resize !== "function") return false;
  if (!bh.render) return true;
  const r = bh.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return true;
  return (
    Math.abs((bh.render.width || 0) - r.width) > 1 ||
    Math.abs((bh.render.height || 0) - r.height) > 1
  );
}

/** Apply hard layout constraints so mobile transform controls stay below visual. */
function enforceMobileTransformLayout() {
  const root = document.getElementById("transform-tuner-root");
  if (!root) return;
  const isMobileLike =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;
  if (!isMobileLike) return;

  const visual = root.querySelector(".transform-tuner__visual");
  const panel = root.querySelector(".transform-tuner__panel");

  root.style.flexDirection = "column";
  root.style.alignItems = "stretch";
  root.style.justifyContent = "flex-start";
  root.style.gap = "9px";

  if (visual) {
    visual.style.order = "1";
    visual.style.width = "100%";
    visual.style.maxWidth = "100%";
    visual.style.flex = "0 0 auto";
  }

  if (panel) {
    panel.style.order = "2";
    panel.style.width = "100%";
    panel.style.maxWidth = "100%";
    panel.style.flex = "0 0 auto";
    panel.style.maxHeight = "none";
    panel.style.overflowY = "visible";
  }
}

/**
 * Resize only visible black holes within the current viewport to avoid scroll jank.
 * @param {HTMLElement} viewport
 */
function flushVisibleCarouselBlackHoles(viewport) {
  const vr = viewport.getBoundingClientRect();
  document.querySelectorAll("#app-carousel black-hole").forEach((el) => {
    const r = el.getBoundingClientRect();
    const overlap = Math.max(0, Math.min(r.bottom, vr.bottom) - Math.max(r.top, vr.top));
    if (overlap <= 0) return;
    const needs =
      !el.render ||
      Math.abs((el.render.width || 0) - r.width) > 1 ||
      Math.abs((el.render.height || 0) - r.height) > 1;
    if (!needs) return;
    if (typeof el.resize === "function") {
      el.resize();
    }
  });
}

/**
 * After scroll-snap settles, canvases often need another resize (off-screen layout was 0×0).
 * @param {HTMLElement} root
 */
function initMobileCarouselLayoutHealing(root) {
  const viewport = document.getElementById("carousel-viewport");
  if (!viewport) return;

  const mq = window.matchMedia("(max-width: 768px)");
  let scrollTimer;

  let healRaf = 0;
  function heal() {
    if (!mq.matches) return;
    cancelAnimationFrame(healRaf);
    healRaf = requestAnimationFrame(() => {
      flushVisibleCarouselBlackHoles(viewport);
    });
  }

  viewport.addEventListener(
    "scroll",
    () => {
      if (!mq.matches) return;
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(heal, 140);
    },
    { passive: true }
  );

  try {
    viewport.addEventListener("scrollend", heal, { passive: true });
  } catch {
    /* scrollend not supported */
  }

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (!mq.matches) return;
      heal();
    });
    ro.observe(viewport);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", heal, { passive: true });
  }
}

/**
 * Mount interactive slide content when those slides actually enter the viewport.
 * Helps when mobile slide-index sync is momentarily off during snap/toolbar changes.
 * @param {HTMLElement} root
 */
function initInteractiveSlideObserver(root) {
  const viewport = document.getElementById("carousel-viewport");
  if (!viewport || typeof IntersectionObserver === "undefined") return;

  const slides = Array.from(root.querySelectorAll("#carousel-track > .carousel-slide"));
  const watched = [
    { index: 2, el: slides[2] },
    { index: 3, el: slides[3] },
    { index: 5, el: slides[5] },
  ].filter((x) => x.el);

  if (watched.length === 0) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hit = watched.find((w) => w.el === entry.target);
        if (!hit) return;
        ensureInteractiveSlideContent(hit.index);
      });
    },
    {
      root: viewport,
      threshold: 0.35,
    }
  );

  watched.forEach((w) => io.observe(w.el));
}

function mountFoundAssetDemo() {
  const mount = document.getElementById("found-asset-mount");
  if (!mount || mount.dataset.mounted === "1") return;
  mount.innerHTML = HOLE_MARKUP;
  mount.dataset.mounted = "1";
}

function mountTransformTuner() {
  const mount = document.getElementById("transform-tuner-mount");
  if (!mount || mount.dataset.mounted === "1") return;
  mount.innerHTML = TRANSFORM_TUNER_MARKUP;
  mount.dataset.mounted = "1";
  requestAnimationFrame(() => {
    enforceMobileTransformLayout();
    wireTunerControls();
    layoutBlackHoleInMount(mount);
  });
}

function mountFinalComposition() {
  const mount = document.getElementById("final-composition-mount");
  if (!mount || mount.dataset.mounted === "1") return;
  mount.innerHTML = POSTER_LIVE_MARKUP;
  mount.dataset.mounted = "1";
  layoutFinalCompositionMount();
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
  const astroSwitchTrack = root.querySelector(".tuner-field__switch-track");

  const sync = () => {
    bh._tunerTypeScaleMul = Number.parseFloat(type?.value || "1");
    bh._tunerMotionSpeedMul = Number.parseFloat(motion?.value || "1");
    bh._tunerHoleSizeMul = Number.parseFloat(hole?.value || "1");
    bh._tunerAstronautYOffsetPx = Number.parseFloat(astro?.value || "0");
    bh._tunerAstronautHidden = astroToggle ? !astroToggle.checked : false;
    const astroLayer = root.querySelector(".astronaut-float__depth");
    if (astroLayer) {
      astroLayer.style.opacity = bh._tunerAstronautHidden ? "0" : "1";
      astroLayer.style.visibility = bh._tunerAstronautHidden ? "hidden" : "visible";
    }
    root.querySelectorAll("[data-tuner-value-for]").forEach((el) => {
      const id = el.getAttribute("data-tuner-value-for");
      const input = id && document.getElementById(id);
      if (input) el.textContent = input.value;
    });
    if (bh.render) {
      bh.astronautTranslateYEnd = null;
      bh.cacheAstronautDescentEnd();
      bh.resize();
    }
  };

  [type, motion, hole, astro].forEach((el) => {
    el?.addEventListener("input", sync);
  });
  astroToggle?.addEventListener("input", sync);
  astroToggle?.addEventListener("change", sync);
  const touchLike =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 900px)").matches;
  if (touchLike && astroSwitchTrack && astroToggle) {
    astroSwitchTrack.addEventListener("pointerup", (e) => {
      e.preventDefault();
      e.stopPropagation();
      astroToggle.checked = !astroToggle.checked;
      sync();
    });
    astroSwitchTrack.addEventListener("touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      astroToggle.checked = !astroToggle.checked;
      sync();
    });
  } else {
    astroSwitchTrack?.addEventListener("click", () => {
      requestAnimationFrame(sync);
    });
    astroSwitchTrack?.addEventListener(
      "touchend",
      () => {
        requestAnimationFrame(sync);
      },
      { passive: true }
    );
  }
  bh.dataset.tunerWired = "1";
  sync();
}

/**
 * @param {HTMLElement} root
 * @param {number} index
 * @param {{ skipScroll?: boolean; scrollBehavior?: ScrollBehavior }} [opts]
 */
function applySlide(root, index, opts = {}) {
  const i = Math.max(0, Math.min(TOTAL_SLIDES - 1, index));
  const skipScroll = opts.skipScroll === true;
  const scrollBehavior = opts.scrollBehavior || "auto";
  root.dataset.carouselSlide = String(i);
  root.style.setProperty("--slide-index", String(i));

  const viewport = document.getElementById("carousel-viewport");
  if (!skipScroll && viewport) {
    const unit = getMobileCarouselSlideHeight(viewport);
    if (unit > 0) {
      root.dataset.carouselScrollLock = "1";
      viewport.scrollTo({ top: i * unit, behavior: scrollBehavior });
      const unlockDelay = scrollBehavior === "smooth" ? 520 : 220;
      window.setTimeout(() => {
        root.dataset.carouselScrollLock = "";
      }, unlockDelay);
    }
  }

  const fabs = document.getElementById("carousel-fabs");
  if (fabs) {
    fabs.setAttribute("aria-hidden", i === 0 ? "true" : "false");
  }

  ensureInteractiveSlideContent(i);
  ensureInteractiveSlideContent(i + 1);
}

/**
 * Mobile: sync slide index from scroll-snap viewport (desktop unchanged).
 * @param {HTMLElement} root
 * @param {{ getSlide: () => number; setSlide: (n: number) => void }} api
 */
function initMobileScrollSnapSync(root, api) {
  const viewport = document.getElementById("carousel-viewport");
  if (!viewport) return;

  const slides = Array.from(root.querySelectorAll("#carousel-track > .carousel-slide"));

  let syncRaf = 0;
  /**
   * iOS: scrollTop/clientHeight can disagree with slide offsetHeights. Pick the slide that
   * overlaps the viewport most (same coordinate space as BlackHole.getBoundingClientRect).
   */
  function syncFromScroll() {
    if (root.dataset.carouselScrollLock === "1") return;
    cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      const vr = viewport.getBoundingClientRect();
      let bestI = 0;
      let bestScore = 0;
      slides.forEach((slide, i) => {
        const r = slide.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(r.bottom, vr.bottom) - Math.max(r.top, vr.top));
        const score = overlap / Math.max(1, r.height);
        if (score > bestScore) {
          bestScore = score;
          bestI = i;
        }
      });

      const unit = Math.max(1, getMobileCarouselSlideHeight(viewport));
      const idxFromScroll = Math.min(
        TOTAL_SLIDES - 1,
        Math.max(0, Math.round(viewport.scrollTop / unit))
      );

      const idx = bestScore > 0.32 ? bestI : idxFromScroll;

      if (idx !== api.getSlide()) {
        api.setSlide(idx);
        applySlide(root, idx, { skipScroll: true });
      } else {
        ensureInteractiveSlideContent(idx);
      }
    });
  }

  viewport.addEventListener("scroll", syncFromScroll, { passive: true });

  window.addEventListener("resize", () => {
    enforceMobileTransformLayout();
    const si = api.getSlide();
    const unit = Math.max(1, getMobileCarouselSlideHeight(viewport));
    root.dataset.carouselScrollLock = "1";
    viewport.scrollTo({ top: si * unit, behavior: "auto" });
    window.setTimeout(() => {
      root.dataset.carouselScrollLock = "";
    }, 220);
  });

  window.addEventListener(
    "pageshow",
    () => {
      requestAnimationFrame(() => {
        ensureInteractiveSlideContent(api.getSlide());
      });
    },
    { passive: true }
  );
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

  const goTo = (next, opts = {}) => {
    slide = ((next % TOTAL_SLIDES) + TOTAL_SLIDES) % TOTAL_SLIDES;
    const viewport = document.getElementById("carousel-viewport");

    if (opts.forceSmoothMobileTop && viewport) {
      applySlide(root, slide, { skipScroll: true });
      smoothScrollViewportToTop(viewport, root, () => {
        slide = 0;
        applySlide(root, 0, { skipScroll: true });
      });
      return;
    }

    applySlide(root, slide, opts);
  };

  initMobileScrollSnapSync(root, {
    getSlide: () => slide,
    setSlide: (n) => {
      slide = n;
    },
  });

  initInteractiveSlideObserver(root);
  initMobileCarouselLayoutHealing(root);

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

  root.querySelectorAll("[data-carousel-go]").forEach((el) => {
    el.addEventListener("click", () => {
      const n = Number.parseInt(el.getAttribute("data-carousel-go") || "0", 10);
      if (Number.isNaN(n)) return;
      if (n === 0) {
        goTo(0, { forceSmoothMobileTop: true });
      } else {
        goTo(n);
      }
    });
  });

  document.getElementById("carousel-back-to-top")?.addEventListener("click", () => {
    goTo(0, { forceSmoothMobileTop: true });
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
  initPosterAutoPeekHint(root, () => slide);

  if (window.matchMedia("(max-width: 768px)").matches) {
    ensureInteractiveSlideContent(1);
    ensureInteractiveSlideContent(2);
    ensureInteractiveSlideContent(3);
  }
}

init();
