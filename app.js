/**
 * 520 情人节 · 肖像揭示 + 命运转盘
 * 密码默认：5201314
 */

const PASSWORD = "5201314";
const PRIZES = [520, 666, 888, 999, 1314];
const AVATAR_SRC = "assets/0e548e063fdc00928a08868435e5eb56.jpg";

const IS_WECHAT = /MicroMessenger/i.test(navigator.userAgent);
const IS_MOBILE = /Mobile|Android|iPhone|iPad|HarmonyOS/i.test(navigator.userAgent);
const FONT_WHEEL_SM = 'bold 13px "DIN Alternate", "PingFang SC", sans-serif';

let wheelLogicalSize = 320;
let wheelDpr = 1;
// —— DOM ——
const screens = {
  password: document.getElementById("screen-password"),
  pixel: document.getElementById("screen-pixel"),
  wheel: document.getElementById("screen-wheel"),
};
const passwordInput = document.getElementById("password-input");
const passwordHint = document.getElementById("password-hint");
const pixelCanvas = document.getElementById("pixel-canvas");
const pixelProgress = document.getElementById("pixel-progress");
const pixelDoneMsg = document.getElementById("pixel-done-msg");
const wheelCanvas = document.getElementById("wheel-canvas");
const spinBtn = document.getElementById("spin-btn");
const surpriseModal = document.getElementById("surprise-modal");
const finalModal = document.getElementById("final-modal");
const starfieldCanvas = document.getElementById("starfield");

// —— 状态 ——
let wheelRotation = 0;
let isSpinning = false;
let spinPhase = 0;

// ═══════════════════════════════════════
// 微信 / 移动端环境
// ═══════════════════════════════════════
function initMobileEnv() {
  const setVH = () => {
    const h = window.innerHeight;
    document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);
  };

  setVH();
  window.addEventListener("resize", setVH);
  window.addEventListener("orientationchange", () => {
    setTimeout(setVH, 120);
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) setVH();
  });

  if (IS_WECHAT) {
    document.documentElement.classList.add("wechat");
  }

  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.target.closest("input, textarea, label")) return;
      const wheelScreen = screens.wheel;
      if (wheelScreen?.classList.contains("active") && wheelScreen.scrollHeight > wheelScreen.clientHeight + 2) {
        return;
      }
      e.preventDefault();
    },
    { passive: false }
  );
}

function setupWheelCanvas() {
  const wrap = document.querySelector(".wheel-wrap");
  if (!wrap) return;
  wheelLogicalSize = Math.floor(wrap.clientWidth || Math.min(window.innerWidth * 0.78, 320));
  wheelDpr = Math.min(window.devicePixelRatio || 1, 2);
  wheelCanvas.width = Math.max(1, wheelLogicalSize * wheelDpr);
  wheelCanvas.height = Math.max(1, wheelLogicalSize * wheelDpr);
}

// ═══════════════════════════════════════
// 矩阵雨背景（520 霓虹配色）
// ═══════════════════════════════════════
const MATRIX_CHARS =
  "5201314♥愛アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01";

function initMatrixRain() {
  const ctx = starfieldCanvas.getContext("2d");
  let columns = [];
  let fontSize = 16;
  let columnCount = 0;
  let frameSkip = 0;

  function matrixColors(tone) {
    if (tone < 0.33) {
      return { head: "#00f0ff", trail: "rgba(0, 240, 255, 0.28)" };
    }
    if (tone < 0.66) {
      return { head: "#ff6b9d", trail: "rgba(255, 45, 122, 0.25)" };
    }
    return { head: "#b8ffb8", trail: "rgba(120, 255, 160, 0.22)" };
  }

  function resize() {
    starfieldCanvas.width = window.innerWidth;
    starfieldCanvas.height = window.innerHeight;
    fontSize = IS_WECHAT ? 15 : IS_MOBILE ? 16 : 18;
    columnCount = Math.ceil(starfieldCanvas.width / fontSize);
    columns = Array.from({ length: columnCount }, (_, i) => ({
      y: Math.random() * -starfieldCanvas.height,
      speed: (IS_WECHAT ? 2.5 : 3) + Math.random() * (IS_WECHAT ? 4 : 6),
      tone: (i % 3) / 3 + Math.random() * 0.2,
      char: MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
    }));
  }

  function draw() {
    frameSkip = (frameSkip + 1) % (IS_WECHAT ? 2 : 1);
    if (frameSkip === 0) {
      ctx.fillStyle = "rgba(5, 5, 16, 0.12)";
      ctx.fillRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);
      ctx.font = `${fontSize}px "SF Mono", Menlo, Consolas, monospace`;
      ctx.textBaseline = "top";

      for (let i = 0; i < columnCount; i++) {
        const col = columns[i];
        const x = i * fontSize;
        const headY = col.y;
        const colors = matrixColors(col.tone);

        if (headY > fontSize) {
          ctx.fillStyle = colors.trail;
          ctx.fillText(
            MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)],
            x,
            headY - fontSize
          );
        }

        ctx.fillStyle = colors.head;
        if (!IS_WECHAT) {
          ctx.shadowColor = colors.head;
          ctx.shadowBlur = 8;
        }
        ctx.fillText(col.char, x, headY);
        ctx.shadowBlur = 0;

        col.char =
          MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        col.y += col.speed;

        if (col.y > starfieldCanvas.height + fontSize * 4) {
          col.y = -fontSize * (2 + Math.random() * 12);
          col.speed = (IS_WECHAT ? 2.5 : 3) + Math.random() * (IS_WECHAT ? 4 : 6);
          col.tone = Math.random();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

// ═══════════════════════════════════════
// 屏幕切换
// ═══════════════════════════════════════
function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("active"));
  screens[name].classList.add("active");
}

// ═══════════════════════════════════════
// 密码验证
// ═══════════════════════════════════════
function initPassword() {
  const unlockBtn = document.getElementById("unlock-btn");
  const terminalBox = document.getElementById("terminal-box");

  function tryUnlock() {
    const val = passwordInput.value.replace(/\s/g, "");
    if (val === PASSWORD) {
      passwordHint.hidden = true;
      passwordInput.blur();
      showScreen("pixel");
      startPixelAssembly();
    } else if (val.length >= 3) {
      passwordHint.hidden = false;
      passwordInput.classList.add("shake");
      setTimeout(() => passwordInput.classList.remove("shake"), 400);
    }
  }

  terminalBox?.addEventListener("click", () => {
    passwordInput.focus();
  });

  unlockBtn?.addEventListener("click", tryUnlock);

  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });
  passwordInput.addEventListener("input", () => {
    const val = passwordInput.value.replace(/\s/g, "");
    if (val === PASSWORD) tryUnlock();
  });

  if (!IS_WECHAT) {
    setTimeout(() => passwordInput.focus(), 300);
  }
}

// ═══════════════════════════════════════
// 真实肖像 · 扫描揭示
// ═══════════════════════════════════════
function fitPortraitCanvas(img) {
  const vw = window.innerWidth || 375;
  const vh = window.innerHeight || 600;
  const maxW = IS_WECHAT ? Math.min(vw * 0.88, 340) : vw * 0.9;
  const maxH = IS_WECHAT
    ? Math.min(vh * 0.68, vh - 100)
    : IS_MOBILE
      ? vh * 0.72
      : vh * 0.75;
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  return {
    w: Math.round(img.width * scale),
    h: Math.round(img.height * scale),
  };
}

function drawPortraitGlitch(ctx, w, h, elapsed) {
  if (IS_WECHAT || Math.sin(elapsed * 27.3) < 0.82) return;
  const bands = 2 + Math.floor(Math.random() * 2);
  for (let n = 0; n < bands; n++) {
    const y = Math.random() * h;
    const bandH = 2 + Math.random() * 4;
    const shift = (Math.random() - 0.5) * 8;
    ctx.fillStyle = `rgba(255, 45, 122, ${0.06 + Math.random() * 0.07})`;
    ctx.fillRect(shift, y, w, bandH);
    ctx.fillStyle = `rgba(0, 240, 255, ${0.04 + Math.random() * 0.05})`;
    ctx.fillRect(-shift * 0.5, y + 1, w, bandH);
  }
}

function drawPortraitScanline(ctx, w, h, scanY, elapsed) {
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 12);
  const y = Math.min(h, Math.max(0, scanY));

  ctx.save();
  const beamH = Math.min(80, h * 0.18);
  const top = Math.max(0, y - beamH * 0.4);
  const grad = ctx.createLinearGradient(0, top, 0, top + beamH);
  grad.addColorStop(0, "rgba(178, 77, 255, 0)");
  grad.addColorStop(0.35, `rgba(255, 45, 122, ${0.12 * pulse})`);
  grad.addColorStop(0.5, `rgba(0, 240, 255, ${0.28 * pulse})`);
  grad.addColorStop(0.65, `rgba(255, 45, 122, ${0.1 * pulse})`);
  grad.addColorStop(1, "rgba(178, 77, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, w, beamH);

  if (!IS_WECHAT) {
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 14;
  }
  ctx.strokeStyle = `rgba(0, 240, 255, ${0.65 + 0.35 * pulse})`;
  ctx.lineWidth = IS_WECHAT ? 1 : 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPortraitVignette(ctx, w, h) {
  const vg = ctx.createRadialGradient(
    w / 2,
    h / 2,
    h * 0.25,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.72
  );
  vg.addColorStop(0, "rgba(0, 0, 0, 0)");
  vg.addColorStop(0.75, "rgba(0, 0, 0, 0)");
  vg.addColorStop(1, "rgba(5, 5, 16, 0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function drawPortraitReveal(ctx, img, w, h, progress, elapsed, done) {
  ctx.fillStyle = "#030308";
  ctx.fillRect(0, 0, w, h);

  const eased = done ? 1 : 1 - Math.pow(1 - progress, 2.2);
  const revealH = h * eased;
  const pop = 0.92 + eased * 0.08;
  const fade = Math.min(1, progress * 2.8);

  ctx.save();
  ctx.globalAlpha = fade;
  const cx = w / 2;
  const cy = h / 2;
  ctx.translate(cx, cy);
  ctx.scale(pop, pop);
  ctx.translate(-cx, -cy);

  if (!done) {
    ctx.beginPath();
    ctx.rect(0, 0, w, revealH);
    ctx.clip();
  }

  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();

  if (!done && revealH < h) {
    drawPortraitScanline(ctx, w, h, revealH, elapsed);
  }
  drawPortraitVignette(ctx, w, h);
  if (!IS_WECHAT) drawPortraitGlitch(ctx, w, h, elapsed);
}

function formatRevealProgress(elapsed, duration) {
  if (elapsed <= 0) return 0;
  if (elapsed >= duration) return 100;
  return Math.min(99, Math.max(0, Math.round((elapsed / duration) * 100)));
}

function startPixelAssembly() {
  const img = new Image();
  img.src = AVATAR_SRC;

  img.onload = () => {
    const { w: canvasW, h: canvasH } = fitPortraitCanvas(img);
    pixelCanvas.width = canvasW;
    pixelCanvas.height = canvasH;
    const ctx = pixelCanvas.getContext("2d");
    let startTime = null;
    const duration = 4.5;
    const revealDuration = 3.6;

    function frame(now) {
      if (startTime == null) startTime = now;
      const elapsed = Math.max(0, (now - startTime) / 1000);
      pixelProgress.textContent = `${formatRevealProgress(elapsed, duration)}%`;

      const progress = Math.min(1, elapsed / revealDuration);
      const done = progress >= 1;

      drawPortraitReveal(ctx, img, canvasW, canvasH, progress, elapsed, done);

      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        drawPortraitReveal(ctx, img, canvasW, canvasH, 1, elapsed, true);
        pixelProgress.textContent = "100%";
        pixelDoneMsg.hidden = false;

        setTimeout(() => {
          showScreen("wheel");
          setupWheelCanvas();
          drawWheel();
        }, 2200);
      }
    }

    requestAnimationFrame(frame);
  };

  img.onerror = () => {
    pixelProgress.textContent = "图像加载失败";
  };
}

// ═══════════════════════════════════════
// 转盘绘制与旋转
// ═══════════════════════════════════════
const WHEEL_COLORS = [
  "#ff2d7a",
  "#b24dff",
  "#00f0ff",
  "#ffd700",
  "#ff6b9d",
];

function drawWheel() {
  const ctx = wheelCanvas.getContext("2d");
  const w = wheelLogicalSize;
  const h = wheelLogicalSize;
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2 - 8;

  ctx.setTransform(wheelDpr, 0, 0, wheelDpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const seg = (Math.PI * 2) / PRIZES.length;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wheelRotation);

  const fontSize = Math.max(18, Math.floor(w * 0.068));

  PRIZES.forEach((prize, i) => {
    const start = i * seg - Math.PI / 2;
    const end = start + seg;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, start, end);
    ctx.closePath();
    ctx.fillStyle = WHEEL_COLORS[i];
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + seg / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${fontSize}px "DIN Alternate", "PingFang SC", sans-serif`;
    if (!IS_WECHAT) {
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;
    }
    ctx.fillText(String(prize), r * 0.62, fontSize * 0.35);
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  const hubR = Math.max(20, w * 0.067);
  ctx.beginPath();
  ctx.arc(0, 0, hubR, 0, Math.PI * 2);
  ctx.fillStyle = "#050510";
  ctx.fill();
  ctx.strokeStyle = varGold();
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = varGold();
  ctx.font = FONT_WHEEL_SM;
  ctx.textAlign = "center";
  ctx.fillText("520", 0, 4);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function varGold() {
  return "#ffd700";
}

/** 让 index 号奖项停在顶部指针处 */
function rotationForIndex(index, extraTurns) {
  const seg = 360 / PRIZES.length;
  const segmentCenter = index * seg + seg / 2;
  return extraTurns * 360 + (360 - segmentCenter);
}

function animateWheel(fromDeg, toDeg, durationMs, easing, onComplete) {
  const start = performance.now();
  const delta = toDeg - fromDeg;

  function tick(now) {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = easing(t);
    wheelRotation = ((fromDeg + delta * eased) * Math.PI) / 180;
    drawWheel();

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      wheelRotation = (toDeg * Math.PI) / 180;
      drawWheel();
      onComplete?.();
    }
  }
  requestAnimationFrame(tick);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getCurrentDeg() {
  return (wheelRotation * 180) / Math.PI;
}

function initWheel() {
  setupWheelCanvas();
  drawWheel();

  let lastTap = 0;
  function handleSpin() {
    const now = Date.now();
    if (now - lastTap < 400 || isSpinning) return;
    lastTap = now;
    if (spinPhase !== 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    runFirstSpin();
  }

  spinBtn.addEventListener("click", handleSpin);
  spinBtn.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      handleSpin();
    },
    { passive: false }
  );
}

function runFirstSpin() {
  const idx520 = PRIZES.indexOf(520);
  const from = getCurrentDeg();
  const to = rotationForIndex(idx520, 6);

  animateWheel(from, to, 5200, easeOutQuart, () => {
    spinPhase = 1;
    setTimeout(() => {
      surpriseModal.hidden = false;
      setTimeout(() => {
        surpriseModal.hidden = true;
        runSecondSpin();
      }, 2400);
    }, 600);
  });
}

function runSecondSpin() {
  const idx1314 = PRIZES.indexOf(1314);
  const from = getCurrentDeg();
  const targetMod = rotationForIndex(idx1314, 0) % 360;
  const currentMod = ((from % 360) + 360) % 360;
  let align = (targetMod - currentMod + 360) % 360;
  if (align < 90) align += 360;
  const to = from + 1080 + align;

  animateWheel(from, to, 1800, (t) => {
    if (t < 0.25) return easeInOutCubic(t / 0.25) * 0.45;
    return 0.45 + easeOutCubic((t - 0.25) / 0.75) * 0.55;
  }, () => {
    spinPhase = 2;
    isSpinning = false;
    finalModal.hidden = false;

    const resultEl = document.getElementById("wheel-result");
    resultEl.hidden = false;
    resultEl.textContent = "🎉 1314 · 一生一世";
  });
}

// ═══════════════════════════════════════
// 启动
// ═══════════════════════════════════════
initMobileEnv();
initMatrixRain();
initPassword();
initWheel();
