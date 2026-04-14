/**
 * High-resolution in-browser export: composites poster JPEG + wormhole canvases + astronaut
 * into the 27×40 poster region only (no page chrome), records with MediaRecorder.
 *
 * WebM (VP9/VP8) is tried first — canvas + MediaRecorder is most reliable there in Chromium/Firefox.
 * MP4 follows for Safari and browsers that do not record WebM.
 */

const DESCENT_MS = 16000;
const IDLE_MS = 10000;
const TOTAL_MS = DESCENT_MS + IDLE_MS;

/** Tries widest first (~8K poster width); falls back if the browser cannot allocate the canvas. */
const EXPORT_WIDTH_CANDIDATES = [8192, 6144, 4096, 3072, 2560, 2048];

const POSTER_BG_SRC = "assets/Ad-Astra-Blank.jpg";

/** Very high bitrates can cause silent encoder failure with large canvases; cap for stability. */
const MAX_VIDEO_BITRATE = 50_000_000;

/**
 * Canvas captureStream is video-only. Prefer WebM first (reliable). MP4 H.264 without AAC before
 * combined A/V strings (video-only stream can fail with avc1+mp4a).
 */
function pickMimeType() {
  const opts = [
    "video/webm; codecs=vp9",
    "video/webm; codecs=vp8",
    "video/webm",
    "video/mp4; codecs=avc1.42E01E",
    "video/mp4; codecs=avc1.640028",
    "video/mp4; codecs=avc1.4d002a",
    "video/mp4",
    "video/mp4; codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4; codecs=avc1,mp4a.40.2",
  ];
  for (const o of opts) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(o)) return o;
  }
  return "";
}

function isMp4Mime(mimeType) {
  return mimeType.startsWith("video/mp4");
}

function fileExtensionForMime(mimeType) {
  return isMp4Mime(mimeType) ? "mp4" : "webm";
}

function drawCover(ctx, img, dw, dh) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const ir = iw / ih;
  const dr = dw / dh;
  let sx;
  let sy;
  let sw;
  let sh;
  if (ir > dr) {
    sh = ih;
    sw = sh * dr;
    sx = (iw - sw) / 2;
    sy = 0;
  } else {
    sw = iw;
    sh = sw / dr;
    sx = 0;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
}

/**
 * Renders only the poster sheet (figure.poster): same pixels as the one-sheet, no page background.
 */
function compositeFrame(ctx, exportW, exportH, bgImg, posterEl, canvasBack, canvasFront, astroImg) {
  const posterRect = posterEl.getBoundingClientRect();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, exportW, exportH);
  drawCover(ctx, bgImg, exportW, exportH);

  const scale = exportW / posterRect.width;
  const stage = document.querySelector(".poster__stage");
  const blackHole = document.querySelector("black-hole");
  if (!stage || !blackHole) return;

  const sr = stage.getBoundingClientRect();
  const sx = (sr.left - posterRect.left) * scale;
  const sy = (sr.top - posterRect.top) * scale;
  const sw = sr.width * scale;
  const sh = sr.height * scale;

  ctx.drawImage(canvasBack, 0, 0, canvasBack.width, canvasBack.height, sx, sy, sw, sh);
  ctx.drawImage(canvasFront, 0, 0, canvasFront.width, canvasFront.height, sx, sy, sw, sh);

  const ir = astroImg.getBoundingClientRect();
  const ix = (ir.left - posterRect.left) * scale;
  const iy = (ir.top - posterRect.top) * scale;
  const iw = ir.width * scale;
  const ih = ir.height * scale;
  ctx.drawImage(astroImg, ix, iy, iw, ih);
}

function tryCreateCanvas(exportW, exportH) {
  try {
    const c = document.createElement("canvas");
    c.width = exportW;
    c.height = exportH;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillRect(0, 0, Math.min(8, exportW), Math.min(8, exportH));
    return c;
  } catch {
    return null;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load poster JPEG"));
    img.src = src;
  });
}

async function startPosterVideoExport() {
  const btn = document.getElementById("export-video-btn");
  const status = document.getElementById("export-video-status");
  if (!window.MediaRecorder) {
    alert("MediaRecorder is not available in this browser. Try Chrome or Edge.");
    return;
  }
  const mimeType = pickMimeType();
  if (!mimeType) {
    alert(
      "No supported video MIME type for recording. Try Chrome 126+ or Edge (MP4), or Safari (MP4); Firefox may fall back to WebM."
    );
    return;
  }

  const posterEl = document.querySelector("figure.poster");
  const blackHole = document.querySelector("black-hole");
  const astroImg = document.querySelector(".astronaut-float__img");
  if (!posterEl || !blackHole || !astroImg) {
    alert("Poster elements not found.");
    return;
  }

  const canvasBack = blackHole.querySelector(".js-canvas-back");
  const canvasFront = blackHole.querySelector(".js-canvas-front");
  if (!canvasBack || !canvasFront) {
    alert("Canvas elements not found.");
    return;
  }

  let bgImg;
  try {
    bgImg = await loadImage(POSTER_BG_SRC);
  } catch (e) {
    alert(String(e.message || e));
    return;
  }

  const pr = posterEl.getBoundingClientRect();
  if (pr.width < 2 || pr.height < 2) {
    alert("Poster is not visible (size is zero). Resize the window so the poster is on screen, then export again.");
    return;
  }

  let exportW = 0;
  let exportH = 0;
  let exportCanvas = null;

  for (const w of EXPORT_WIDTH_CANDIDATES) {
    const h = Math.round((w * 40) / 27);
    const c = tryCreateCanvas(w, h);
    if (c) {
      exportCanvas = c;
      exportW = w;
      exportH = h;
      break;
    }
  }
  if (!exportCanvas) {
    alert("Could not allocate export canvas (try a smaller window or browser).");
    return;
  }

  const ctx = exportCanvas.getContext("2d", { alpha: false });
  if (!ctx) {
    alert("Could not get 2D context.");
    return;
  }

  const stream = exportCanvas.captureStream(60);
  const rawBitrate =
    exportW >= 7680 ? 50_000_000 : exportW >= 3840 ? 45_000_000 : exportW >= 2560 ? 40_000_000 : 30_000_000;
  const bitrate = Math.min(rawBitrate, MAX_VIDEO_BITRATE);
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  } catch {
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (e2) {
      alert(`Could not start MediaRecorder: ${e2}`);
      return;
    }
  }

  const effectiveMime = recorder.mimeType || mimeType;
  const ext = fileExtensionForMime(effectiveMime);

  const chunks = [];
  let recorderErrorMessage = "";
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const setStatus = (t) => {
    if (status) status.textContent = t;
  };

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Recording…";
  }
  document.querySelector(".poster-page")?.classList.add("is-exporting-poster-video");
  setStatus(
    `Recording ${exportW}×${exportH} @ 60fps (${ext.toUpperCase()}) — keep this tab in the foreground (~${Math.ceil(TOTAL_MS / 1000)}s)…`
  );

  try {
    blackHole.resetDescentForExport();
  } catch (e) {
    console.error(e);
    alert("Could not reset animation for export. Reload the page and try again.");
    return;
  }

  /** Stop recording; avoid deferred stop() — some builds never transition if stop is only queued in a timeout. */
  function stopRecordingSafely() {
    try {
      if (recorder.state === "recording") {
        recorder.requestData();
      }
    } catch {
      /* ignore */
    }
    try {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    } catch (e) {
      console.error(e);
    }
  }

  return new Promise((resolve) => {
    let exportSettled = false;
    function settleExport() {
      if (exportSettled) return;
      exportSettled = true;
      resolve();
    }

    function finishExportFromChunks() {
      if (exportSettled) return;
      if (!chunks.length) {
        const detail = recorderErrorMessage
          ? ` ${recorderErrorMessage}`
          : " The browser may not support recording this canvas size — try Chrome, or use a smaller browser window to lower export resolution.";
        alert(`Recording produced no video data.${detail}`);
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Export poster video (poster only)";
        }
        setStatus("Export failed — no encoded data.");
        settleExport();
        return;
      }
      const blobMime =
        (recorder.mimeType && recorder.mimeType.trim()) ||
        effectiveMime.split(";")[0].trim() ||
        (isMp4Mime(effectiveMime) ? "video/mp4" : "video/webm");
      const blob = new Blob(chunks, { type: blobMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ad-astra-poster-${exportW}w.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      const kind = isMp4Mime(effectiveMime) ? "MP4" : "WebM";
      setStatus(`Saved ${exportW}×${exportH} ${kind} (poster only, descent + ${IDLE_MS / 1000}s hover).`);
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Export poster video (poster only)";
      }
      settleExport();
    }

    recorder.addEventListener("error", (ev) => {
      recorderErrorMessage = (ev && ev.error && ev.error.message) || "MediaRecorder encoding error";
      console.error("MediaRecorder error", ev);
      document.querySelector(".poster-page")?.classList.remove("is-exporting-poster-video");
      if (chunks.length) {
        finishExportFromChunks();
        return;
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Export poster video (poster only)";
      }
      setStatus("Export failed — encoder error.");
      alert(`Recording failed: ${recorderErrorMessage}`);
      settleExport();
    });

    recorder.onstop = () => {
      document.querySelector(".poster-page")?.classList.remove("is-exporting-poster-video");
      const run = () => {
        if (!chunks.length) {
          setTimeout(() => finishExportFromChunks(), 50);
          return;
        }
        finishExportFromChunks();
      };
      queueMicrotask(run);
    };

    const start = performance.now();

    compositeFrame(ctx, exportW, exportH, bgImg, posterEl, canvasBack, canvasFront, astroImg);
    try {
      recorder.start(200);
    } catch (e) {
      document.querySelector(".poster-page")?.classList.remove("is-exporting-poster-video");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Export poster video (poster only)";
      }
      setStatus("Export failed.");
      alert(`Could not start recording: ${e}`);
      settleExport();
      return;
    }
    if (recorder.state !== "recording") {
      document.querySelector(".poster-page")?.classList.remove("is-exporting-poster-video");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Export poster video (poster only)";
      }
      setStatus("Export failed — recorder did not enter recording state.");
      alert("Recording did not start (MediaRecorder is not in the recording state). Try another browser.");
      settleExport();
      return;
    }

    function frame() {
      const elapsed = performance.now() - start;
      compositeFrame(ctx, exportW, exportH, bgImg, posterEl, canvasBack, canvasFront, astroImg);
      if (elapsed >= TOTAL_MS) {
        stopRecordingSafely();
        return;
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

document.getElementById("export-video-btn")?.addEventListener("click", () => {
  startPosterVideoExport().catch((e) => {
    console.error(e);
    alert(String(e));
    document.querySelector(".poster-page")?.classList.remove("is-exporting-poster-video");
    const btn = document.getElementById("export-video-btn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Export poster video (poster only)";
    }
  });
});
