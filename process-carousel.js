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
    <div class="poster-page poster-page--embed">
      <div class="poster-frame poster-frame--tuner" style="--tuner-frame-scale: 0.58">
        <figure class="poster">
          <div class="poster__bg" role="presentation"></div>
          <div class="poster__tear" role="presentation" aria-hidden="true">
            <div class="poster__tear-inner"></div>
          </div>
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
      <label class="tuner-field__label" for="tuner-slider-descent">Astronaut descent speed</label>
      <input id="tuner-slider-descent" class="tuner-field__range" type="range" min="0.2" max="3.2" step="0.01" value="1" />
      <span class="tuner-field__value" data-tuner-value-for="tuner-slider-descent">1</span>
    </div>
    <div class="tuner-field">
      <label class="tuner-field__label" for="tuner-slider-astro">Astronaut vertical offset</label>
      <input id="tuner-slider-astro" class="tuner-field__range" type="range" min="-140" max="140" step="1" value="0" />
      <span class="tuner-field__value" data-tuner-value-for="tuner-slider-astro">0</span>
    </div>
    <div class="tuner-field">
      <label class="tuner-field__label" for="tuner-slider-frame">Poster frame size</label>
      <input id="tuner-slider-frame" class="tuner-field__range" type="range" min="0.28" max="1" step="0.01" value="0.58" />
      <span class="tuner-field__value" data-tuner-value-for="tuner-slider-frame">0.58</span>
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
  const frame = root?.querySelector(".poster-frame--tuner");
  if (!root || !bh || !frame || bh.dataset.tunerWired === "1") return;

  const type = document.getElementById("tuner-slider-type");
  const motion = document.getElementById("tuner-slider-motion");
  const descent = document.getElementById("tuner-slider-descent");
  const astro = document.getElementById("tuner-slider-astro");
  const frameR = document.getElementById("tuner-slider-frame");

  const sync = () => {
    bh._tunerTypeScaleMul = Number.parseFloat(type?.value || "1");
    bh._tunerMotionSpeedMul = Number.parseFloat(motion?.value || "1");
    bh._tunerDescentSpeedMul = Number.parseFloat(descent?.value || "1");
    bh._tunerAstronautYOffsetPx = Number.parseFloat(astro?.value || "0");
    const fs = Number.parseFloat(frameR?.value || "0.58");
    frame.style.setProperty("--tuner-frame-scale", String(fs));
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

  [type, motion, descent, astro, frameR].forEach((el) => {
    el?.addEventListener("input", sync);
  });
  bh.dataset.tunerWired = "1";
  sync();
}

/**
 * @param {HTMLElement} root
 * @param {number} index
 */
function applySlide(root, index) {
  const i = Math.max(0, Math.min(TOTAL_SLIDES - 1, index));
  root.dataset.carouselSlide = String(i);
  root.style.setProperty("--slide-index", String(i));

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

function init() {
  const root = document.getElementById("app-carousel");
  if (!root) return;

  let slide = 0;

  const goTo = (next) => {
    slide = ((next % TOTAL_SLIDES) + TOTAL_SLIDES) % TOTAL_SLIDES;
    applySlide(root, slide);
  };

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
