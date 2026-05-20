/**
 * 520 情人节 · ASCII 终端打印 + 命运转盘
 * 密码默认：520
 */

const PASSWORD = "520";
const PRIZES = [520, 666, 888, 999, 1314];
const AVATAR_SRC = "assets/avatar.png";

const IS_WECHAT = /MicroMessenger/i.test(navigator.userAgent);
const IS_MOBILE = /Mobile|Android|iPhone|iPad|HarmonyOS/i.test(navigator.userAgent);
const FONT_WHEEL_SM = 'bold 13px "DIN Alternate", "PingFang SC", sans-serif';

let wheelLogicalSize = 320;
let wheelDpr = 1;
let simplePixelDraw = IS_WECHAT;

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
// 星空背景
// ═══════════════════════════════════════
function initStarfield() {
  const ctx = starfieldCanvas.getContext("2d");
  const stars = [];
  const count = IS_WECHAT ? 80 : IS_MOBILE ? 120 : 160;

  function resize() {
    starfieldCanvas.width = window.innerWidth;
    starfieldCanvas.height = window.innerHeight;
  }

  function seed() {
    stars.length = 0;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * starfieldCanvas.width,
        y: Math.random() * starfieldCanvas.height,
        r: Math.random() * 1.5 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
      });
    }
  }

  function draw(t) {
    ctx.fillStyle = "rgba(5, 5, 16, 0.25)";
    ctx.fillRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);

    for (const s of stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 255, ${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  seed();
  window.addEventListener("resize", () => {
    resize();
    seed();
  });
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
// ASCII 终端打印（亮度 → 字符密度，黑白裁剪）
// ═══════════════════════════════════════
const ASCII_RAMP = " .'`#░▒▓█";
const ASCII_ALPHA_MIN = IS_WECHAT ? 88 : 72;
const ASCII_LUM_FLOOR = 0.14;
const ASCII_FONT =
  '"SF Mono", "Menlo", "Consolas", "Courier New", monospace';

function asciiLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 高分辨率采样 → 主体包围盒（透明/低 alpha 不计入） */
function computeSubjectBounds(data, w, h, alphaMin) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < alphaMin) continue;
      const lum = asciiLuminance(data[i], data[i + 1], data[i + 2]) / 255;
      if (lum < ASCII_LUM_FLOOR) continue;
      if (minX > x) minX = x;
      if (minY > y) minY = y;
      if (maxX < x) maxX = x;
      if (maxY < y) maxY = y;
    }
  }

  if (maxX < minX) return null;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const pad = Math.max(1, Math.round(Math.min(bw, bh) * 0.03));
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const ex = Math.min(w - 1, maxX + pad);
  const ey = Math.min(h - 1, maxY + pad);
  return {
    sx,
    sy,
    sw: ex - sx + 1,
    sh: ey - sy + 1,
  };
}

function sampleAsciiGrid(img, bounds, gridW, gridH) {
  const off = document.createElement("canvas");
  off.width = gridW;
  off.height = gridH;
  const offCtx = off.getContext("2d");
  offCtx.fillStyle = "#000";
  offCtx.fillRect(0, 0, gridW, gridH);
  offCtx.drawImage(
    img,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    0,
    0,
    gridW,
    gridH
  );
  return offCtx.getImageData(0, 0, gridW, gridH).data;
}

function asciiCharFromPixel(data, i) {
  const a = data[i + 3];
  if (a < ASCII_ALPHA_MIN) return " ";
  const lum = asciiLuminance(data[i], data[i + 1], data[i + 2]) / 255;
  if (lum < ASCII_LUM_FLOOR) return " ";
  const edge = a / 255;
  const boosted = Math.min(1, lum * (0.72 + edge * 0.28));
  const idx = Math.min(
    ASCII_RAMP.length - 1,
    Math.floor(boosted * (ASCII_RAMP.length - 1))
  );
  return idx <= 0 ? " " : ASCII_RAMP[idx];
}

function buildAsciiPrintOrder(data, gridW, gridH) {
  const printOrder = [];
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const i = (gy * gridW + gx) * 4;
      const ch = asciiCharFromPixel(data, i);
      if (ch === " ") continue;
      printOrder.push({ gx, gy, ch });
    }
  }
  return printOrder;
}

function asciiCharStyle(ch) {
  if (ch === " ") return null;
  const idx = ASCII_RAMP.indexOf(ch);
  if (idx <= 0) return null;
  const t = idx / (ASCII_RAMP.length - 1);
  const gray = Math.round(118 + t * 137);
  const alpha = 0.42 + t * 0.58;
  return `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
}

function drawAsciiCell(ctx, cell, charW, lineH) {
  if (cell.ch === " ") return;
  const style = asciiCharStyle(cell.ch);
  if (!style) return;
  ctx.fillStyle = style;
  ctx.fillText(cell.ch, cell.gx * charW, (cell.gy + 1) * lineH);
}

function drawPrintScanline(ctx, canvasW, rowY, lineH, elapsed) {
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 12);
  const lineY = Math.floor(rowY + lineH / 2) + 0.5;

  ctx.save();
  if (!simplePixelDraw) {
    const grad = ctx.createLinearGradient(0, rowY, 0, rowY + lineH);
    grad.addColorStop(0, "rgba(255, 255, 255, 0)");
    grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.06 * pulse})`);
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, rowY, canvasW, lineH);
  }

  ctx.strokeStyle = `rgba(220, 220, 220, ${0.22 + 0.18 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, lineY);
  ctx.lineTo(canvasW, lineY);
  ctx.stroke();
  ctx.restore();
}

function drawPrintCursor(ctx, cell, charW, lineH, elapsed, fontSize) {
  const blink = Math.sin(elapsed * 10) > 0 ? 1 : 0.4;
  const x = cell.gx * charW;
  const y = cell.gy * lineH;
  ctx.save();
  ctx.fillStyle = `rgba(245, 245, 245, ${0.75 * blink})`;
  ctx.font = `bold ${fontSize}px ${ASCII_FONT}`;
  ctx.fillText("▌", x, y + lineH);
  ctx.restore();
}

function formatPrintProgress(elapsed, duration) {
  if (elapsed <= 0) return 0;
  if (elapsed >= duration) return 100;
  return Math.min(99, Math.max(0, Math.round((elapsed / duration) * 100)));
}

function startPixelAssembly() {
  const img = new Image();
  img.src = AVATAR_SRC;

  img.onload = () => {
    const probeW = IS_WECHAT ? 100 : 140;
    const probeH = Math.max(1, Math.round(probeW * (img.height / img.width)));
    const probe = document.createElement("canvas");
    probe.width = probeW;
    probe.height = probeH;
    const probeCtx = probe.getContext("2d");
    probeCtx.drawImage(img, 0, 0, probeW, probeH);
    const probeData = probeCtx.getImageData(0, 0, probeW, probeH).data;
    const bounds =
      computeSubjectBounds(probeData, probeW, probeH, ASCII_ALPHA_MIN) ||
      { sx: 0, sy: 0, sw: probeW, sh: probeH };

    const cropAspect = bounds.sh / bounds.sw;
    const GRID_W = IS_WECHAT ? 48 : IS_MOBILE ? 56 : 64;
    const GRID_H = Math.max(8, Math.round(GRID_W * cropAspect));
    const fontSize = IS_WECHAT ? 5 : IS_MOBILE ? 6 : 7;
    const lineH = fontSize + 1;
    const ctx = pixelCanvas.getContext("2d");
    ctx.font = `${fontSize}px ${ASCII_FONT}`;
    const charW = Math.max(fontSize * 0.58, ctx.measureText("█").width);
    const canvasW = Math.ceil(GRID_W * charW);
    const canvasH = Math.ceil(GRID_H * lineH);

    pixelCanvas.width = canvasW;
    pixelCanvas.height = canvasH;

    const scaleX = img.width / probeW;
    const scaleY = img.height / probeH;
    const srcBounds = {
      sx: bounds.sx * scaleX,
      sy: bounds.sy * scaleY,
      sw: bounds.sw * scaleX,
      sh: bounds.sh * scaleY,
    };

    const data = sampleAsciiGrid(img, srcBounds, GRID_W, GRID_H);
    const printOrder = buildAsciiPrintOrder(data, GRID_W, GRID_H);
    const totalCells = printOrder.length;
    let startTime = null;
    const duration = 5.5;
    const printDuration = 4.85;

    ctx.textBaseline = "bottom";
    ctx.textAlign = "left";

    function frame(now) {
      if (startTime == null) startTime = now;
      const elapsed = Math.max(0, (now - startTime) / 1000);
      pixelProgress.textContent = `${formatPrintProgress(elapsed, duration)}%`;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.font = `${fontSize}px ${ASCII_FONT}`;

      const printT = Math.min(1, elapsed / printDuration);
      const eased = 1 - Math.pow(1 - printT, 2.2);
      const visibleCount = Math.min(
        totalCells,
        Math.floor(eased * totalCells)
      );

      for (let i = 0; i < visibleCount; i++) {
        drawAsciiCell(ctx, printOrder[i], charW, lineH);
      }

      const printing = totalCells > 0 && visibleCount < totalCells;
      if (printing) {
        const head = printOrder[visibleCount];
        drawPrintScanline(ctx, canvasW, head.gy * lineH, lineH, elapsed);
        drawPrintCursor(ctx, head, charW, lineH, elapsed, fontSize);
      } else if (totalCells > 0 && elapsed < printDuration + 0.15) {
        const tail = printOrder[totalCells - 1];
        drawPrintScanline(
          ctx,
          canvasW,
          (tail.gy + 1) * lineH,
          lineH,
          elapsed
        );
      }

      if (elapsed < duration || printing) {
        requestAnimationFrame(frame);
      } else {
        for (let i = 0; i < totalCells; i++) {
          drawAsciiCell(ctx, printOrder[i], charW, lineH);
        }

        ctx.strokeStyle = "rgba(180, 180, 180, 0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, canvasW - 1, canvasH - 1);
        if (!simplePixelDraw) {
          ctx.strokeStyle = "rgba(80, 80, 80, 0.2)";
          ctx.strokeRect(2.5, 2.5, canvasW - 5, canvasH - 5);
        }

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
initStarfield();
initPassword();
initWheel();
