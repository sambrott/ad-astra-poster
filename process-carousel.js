/**
 * Six-slide deck: poster (0) + five process slides. Drives --slide-index on .app-carousel.
 */

const TOTAL_SLIDES = 6;

const HOLE_MARKUP = `
<black-hole class="found-asset-hole">
  <canvas class="js-canvas-back" aria-hidden="true"></canvas>
  <canvas class="js-canvas-front" aria-hidden="true"></canvas>
</black-hole>
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
