const $ = id => document.getElementById(id);

let showGuides = true;

function toggleGuides() {
  showGuides = !showGuides;
  $('guidesBtn').textContent = `Guides: ${showGuides ? 'on' : 'off'}`;
  $('guidesBtn').style.color = showGuides ? '#5fdf5f' : '#888';
  render();
}

function drawGuides(canvas, W, H) {
  const ctx = canvas.getContext('2d');
  const lw = Math.max(2, Math.round(W / 960));

  function hline(y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, Math.round(y), W, lw);
  }
  function vline(x, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), 0, lw, H);
  }

  // center cross
  vline(W / 2, 'rgba(255,255,255,0.3)');
  hline(H / 2, 'rgba(255,255,255,0.3)');

  // rule of thirds
  [1/3, 2/3].forEach(t => {
    vline(W * t, 'rgba(255,255,255,0.12)');
    hline(H * t, 'rgba(255,255,255,0.12)');
  });
}

function stepFont(delta) {
  const el = $('fsize');
  el.value = Math.min(120, Math.max(1, parseInt(el.value) + delta));
  $('fsizeOut').textContent = el.value + 'px';
  render();
}

let taFontSize = 12;

function stepTextarea(delta) {
  taFontSize = Math.min(48, Math.max(1, taFontSize + delta));
  $('ascii').style.fontSize = taFontSize + 'px';
  $('taSize').textContent = taFontSize + 'px';
}

// pinch on textarea controls textarea font size
let pinchDist0 = null;
let taSize0 = null;
document.addEventListener('DOMContentLoaded', () => {
  // SV canvas drag
  const svCv = $('cpSV');
  let svDown = false;
  function cpSVInteract(e) {
    const r = svCv.getBoundingClientRect();
    cpS = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    cpV = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    cpDrawSV(); cpUpdateUI(); cpApply();
  }
  svCv.addEventListener('mousedown', e => { svDown = true; cpSVInteract(e); });
  document.addEventListener('mousemove', e => { if (svDown) cpSVInteract(e); });
  document.addEventListener('mouseup', () => { svDown = false; });

  // Hue slider drag
  const hueCv = $('cpHue');
  let hueDown = false;
  function cpHueInteract(e) {
    const r = hueCv.getBoundingClientRect();
    cpH = Math.max(0, Math.min(360, (e.clientX - r.left) / r.width * 360));
    cpDrawSV(); cpUpdateUI(); cpApply();
  }
  hueCv.addEventListener('mousedown', e => { hueDown = true; cpHueInteract(e); });
  document.addEventListener('mousemove', e => { if (hueDown) cpHueInteract(e); });
  document.addEventListener('mouseup', () => { hueDown = false; });

  // Hex input
  $('cpHex').addEventListener('input', e => {
    if (e.target.value.length === 6) {
      const [r, g, b] = hexToRgb('#' + e.target.value);
      [cpH, cpS, cpV] = rgbToHsv(r, g, b);
      cpDrawSV(); cpUpdateUI(); cpApply();
    }
  });
  $('cpHex').addEventListener('click', e => e.stopPropagation());

  $('ascii').addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist0 = Math.hypot(dx, dy);
      taSize0 = taFontSize;
    }
  }, { passive: true });
  $('ascii').addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinchDist0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      taFontSize = Math.min(48, Math.max(1, Math.round(taSize0 * dist / pinchDist0)));
      $('ascii').style.fontSize = taFontSize + 'px';
      $('taSize').textContent = taFontSize + 'px';
    }
  }, { passive: true });
  $('ascii').addEventListener('touchend', () => { pinchDist0 = null; });
});

$('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    $('ascii').value = ev.target.result;
    render();
  };
  reader.readAsText(file);
  e.target.value = '';
});

function clearAscii() {
  $('ascii').value = '';
  render();
}

async function pasteAscii() {
  try {
    const text = await navigator.clipboard.readText();
    $('ascii').value = text;
    render();
  } catch {
    $('ascii').focus();
    document.execCommand('paste');
    render();
  }
}

let bgImage = null;

$('bgImgInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    bgImage = img;
    $('bgImgName').textContent = file.name;
    $('bgImgClear').style.display = '';
    ['bgFitCol','bgScaleCol','bgPosXCol','bgPosYCol','bgBlurCol','bgDimCol']
      .forEach(id => $(id).style.display = '');
    render();
  };
  img.src = url;
  e.target.value = '';
});

function clearBgImage() {
  bgImage = null;
  $('bgImgName').textContent = '';
  $('bgImgClear').style.display = 'none';
  ['bgFitCol','bgScaleCol','bgPosXCol','bgPosYCol','bgBlurCol','bgDimCol']
    .forEach(id => $(id).style.display = 'none');
  render();
}

const RESOLUTIONS = {
  'fhd-l': [1920, 1080], 'fhd-p': [1080, 1920],
  'wuxga-l': [1920, 1200], 'wuxga-p': [1200, 1920],
  '2k-l':  [2560, 1440], '2k-p':  [1440, 2560],
  '4k-l':  [3840, 2160], '4k-p':  [2160, 3840],
  'sq-512': [512, 512], 'sq-1024': [1024, 1024], 'sq-1920': [1920, 1920],
};

function getConfig() {
  const [W, H] = RESOLUTIONS[$('orient').value];
  return {
    W, H,
    text: $('ascii').value,
    font: $('fontfam').value,
    fsize: parseInt($('fsize').value),
    txtColor: $('txtColor').value,
    bgColor: $('bgColor').value,
    align: $('align').value,
    lheight: parseFloat($('lheight').value),
    scanlines: parseInt($('scanlines').value),
    glow: parseInt($('glow').value),
    offsetX: parseInt($('offsetX').value),
    offsetY: parseInt($('offsetY').value),
    bgFit: $('bgFit').value,
    bgScale: parseInt($('bgScale').value) / 100,
    bgPosX: parseInt($('bgPosX').value),
    bgPosY: parseInt($('bgPosY').value),
    bgBlur: parseInt($('bgBlur').value),
    bgDim: parseInt($('bgDim').value) / 100,
    grain: parseInt($('grain').value),
    aberration: parseInt($('aberration').value),
    shadow: parseInt($('shadow').value),
  };
}

function drawToCanvas(canvas, cfg) {
  const { W, H, text, font, fsize, txtColor, bgColor, align, lheight, scanlines, glow, offsetX, offsetY, bgFit, bgScale, bgPosX, bgPosY, bgBlur, bgDim, grain, aberration, shadow } = cfg;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  if (bgImage) {
    const imgAspect = bgImage.naturalWidth / bgImage.naturalHeight;
    const canvasAspect = W / H;
    let drawW, drawH;
    if (bgFit === 'stretch') {
      drawW = W; drawH = H;
    } else if (bgFit === 'cover') {
      if (imgAspect > canvasAspect) { drawH = H; drawW = H * imgAspect; }
      else { drawW = W; drawH = W / imgAspect; }
    } else {
      if (imgAspect > canvasAspect) { drawW = W; drawH = W / imgAspect; }
      else { drawH = H; drawW = H * imgAspect; }
    }
    drawW *= bgScale;
    drawH *= bgScale;
    const drawX = (W - drawW) / 2 + bgPosX;
    const drawY = (H - drawH) / 2 + bgPosY;
    const pad = bgBlur * 2;
    ctx.filter = `blur(${bgBlur}px)`;
    ctx.drawImage(bgImage, drawX - pad, drawY - pad, drawW + pad * 2, drawH + pad * 2);
    ctx.filter = 'none';
    ctx.fillStyle = `rgba(0,0,0,${bgDim})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (scanlines > 0) {
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = `rgba(255,255,255,${scanlines / 2000})`;
      ctx.fillRect(0, y, W, 2);
    }
  }

  ctx.font = `${fsize}px ${font}`;
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  const lineH = fsize * lheight;
  const totalH = lines.length * lineH;
  const startY = (H - totalH) / 2 + offsetY;

  function drawLines(alpha, color = txtColor, xShift = 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    lines.forEach((line, i) => {
      const y = startY + i * lineH;
      const lw = ctx.measureText(line).width;
      let x;
      if (align === 'center') x = (W - lw) / 2;
      else if (align === 'right') x = W - lw - 60;
      else x = 60;
      ctx.fillText(line, x + offsetX + xShift, y);
    });
  }


  if (shadow > 0) {
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = Math.min(4 + shadow * 1.5, 48);
    const sPasses = shadow <= 8 ? 1 : shadow <= 18 ? 2 : 3;
    for (let i = 0; i < sPasses; i++) drawLines(1, '#000000');
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  if (glow > 0) {
    ctx.shadowColor = txtColor;
    ctx.shadowBlur = glow * 2.5;
    drawLines(0.6);
    ctx.shadowBlur = glow;
    drawLines(0.4);
  }
  ctx.shadowBlur = 0;

  if (aberration > 0) {
    ctx.globalCompositeOperation = 'screen';
    drawLines(0.75, `rgb(255,0,0)`, -aberration);
    drawLines(0.75, `rgb(0,255,0)`, 0);
    drawLines(0.75, `rgb(0,0,255)`, aberration);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.globalAlpha = 1;
    drawLines(1);
  }

  ctx.globalAlpha = 1;

  if (grain > 0) {
    const count = Math.floor(W * H * (grain / 100) * 0.15);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const alpha = Math.random() * 0.35;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(255,255,255,${alpha})`
        : `rgba(0,0,0,${alpha})`;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }
}

let previewZoom = 0.5;

function getFitScale(cfg) {
  const maxW = $('cvs').parentElement.clientWidth - 16;
  return Math.min(maxW / cfg.W, 1);
}

function stepZoom(dir) {
  const cfg = getConfig();
  const fit = getFitScale(cfg);
  if (previewZoom === null) previewZoom = fit;
  const steps = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2];
  const idx = steps.findIndex(s => s > previewZoom + 0.01);
  if (dir > 0) previewZoom = steps[Math.min(idx === -1 ? steps.length - 1 : idx, steps.length - 1)];
  else previewZoom = steps[Math.max((idx === -1 ? steps.length : idx) - 2, 0)];
  render();
}

function resetZoom() {
  previewZoom = null;
  render();
}

function render() {
  const cfg = getConfig();
  const preview = $('cvs');
  drawToCanvas(preview, cfg);
  if (showGuides) drawGuides(preview, cfg.W, cfg.H);
  const scale = previewZoom !== null ? previewZoom : getFitScale(cfg);
  preview.style.width = Math.round(cfg.W * scale) + 'px';
  preview.style.height = Math.round(cfg.H * scale) + 'px';
  $('zoomOut').textContent = Math.round(scale * 100) + '%';
  $('sizeBadge').textContent = `${cfg.W} × ${cfg.H} px`;
}

function openModal() {
  const cfg = getConfig();
  const c = document.createElement('canvas');
  drawToCanvas(c, cfg);
  $('modalImg').src = c.toDataURL('image/png');
  $('modal').classList.add('open');
}

function closeModal() {
  $('modal').classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

$('cvs').addEventListener('click', e => {
  if (!pickMode) return;
  const rect = $('cvs').getBoundingClientRect();
  const scaleX = $('cvs').width / rect.width;
  const scaleY = $('cvs').height / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  const [r, g, b] = $('cvs').getContext('2d').getImageData(x, y, 1, 1).data;
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  $(pickMode).value = hex;
  document.querySelector(`.cp-swatch[data-for="${pickMode}"]`).style.background = hex;
  pickMode = null;
  $('cvs').style.cursor = '';
  document.querySelectorAll('.eyedrop-btn').forEach(b => {
    b.style.color = ''; b.style.borderColor = '';
  });
  render();
});

function download() {
  const cfg = getConfig();
  const c = document.createElement('canvas');
  drawToCanvas(c, cfg);
  const a = document.createElement('a');
  a.download = `wallpaper_${cfg.W}x${cfg.H}.png`;
  a.href = c.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Color picker ─────────────────────────────────────────────
let cpTarget = null, cpH = 120, cpS = 0.8, cpV = 0.7;

function hsvToRgb(h, s, v) {
  const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/../g);
  return m ? m.map(x => parseInt(x, 16)) : [0, 255, 0];
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, max ? d / max : 0, max];
}

function cpDrawSV() {
  const cv = $('cpSV'), ctx = cv.getContext('2d');
  const gH = ctx.createLinearGradient(0, 0, cv.width, 0);
  gH.addColorStop(0, '#fff');
  gH.addColorStop(1, `hsl(${cpH},100%,50%)`);
  ctx.fillStyle = gH; ctx.fillRect(0, 0, cv.width, cv.height);
  const gV = ctx.createLinearGradient(0, 0, 0, cv.height);
  gV.addColorStop(0, 'rgba(0,0,0,0)');
  gV.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = gV; ctx.fillRect(0, 0, cv.width, cv.height);
}
function cpDrawHue() {
  const cv = $('cpHue'), ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, cv.width, 0);
  for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
}
function cpUpdateUI() {
  const [r, g, b] = hsvToRgb(cpH, cpS, cpV);
  const hex = rgbToHex(r, g, b);
  $('cpHex').value = hex.slice(1).toUpperCase();
  $('cpPreview').style.background = hex;
  const sv = $('cpSV');
  $('cpCursor').style.left = (cpS * sv.width) + 'px';
  $('cpCursor').style.top = ((1 - cpV) * sv.height) + 'px';
  $('cpHueCursor').style.left = (cpH / 360 * $('cpHue').width) + 'px';
}
function cpApply() {
  if (!cpTarget) return;
  const [r, g, b] = hsvToRgb(cpH, cpS, cpV);
  const hex = rgbToHex(r, g, b);
  $(cpTarget).value = hex;
  document.querySelector(`.cp-swatch[data-for="${cpTarget}"]`).style.background = hex;
  render();
}

function openCP(targetId, triggerEl) {
  if (cpTarget === targetId && $('cpPopup').style.display !== 'none') {
    closeCP(); return;
  }
  cpTarget = targetId;
  const [r, g, b] = hexToRgb($(targetId).value);
  [cpH, cpS, cpV] = rgbToHsv(r, g, b);
  const popup = $('cpPopup');
  popup.style.display = 'flex';
  cpDrawSV(); cpDrawHue(); cpUpdateUI();
  const rect = triggerEl.getBoundingClientRect();
  let left = rect.left, top = rect.bottom + 6;
  if (left + 220 > window.innerWidth) left = window.innerWidth - 224;
  if (top + 250 > window.innerHeight) top = rect.top - 256;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
}
function closeCP() {
  $('cpPopup').style.display = 'none';
  cpTarget = null;
}

document.addEventListener('click', e => {
  const popup = $('cpPopup');
  if (popup && popup.style.display !== 'none'
    && !popup.contains(e.target)
    && !e.target.classList.contains('cp-swatch')) closeCP();
});

// ── Canvas eyedropper ─────────────────────────────────────────
let pickMode = null;

function startPick(targetId) {
  closeCP();
  pickMode = targetId;
  $('cvs').style.cursor = 'crosshair';
  document.querySelectorAll('.eyedrop-btn').forEach(b => {
    b.style.color = b.dataset.target === targetId ? 'var(--green)' : '';
    b.style.borderColor = b.dataset.target === targetId ? 'var(--green-dim)' : '';
  });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && pickMode) {
    pickMode = null;
    $('cvs').style.cursor = '';
    document.querySelectorAll('.eyedrop-btn').forEach(b => {
      b.style.color = ''; b.style.borderColor = '';
    });
  }
});

function syncTextareaFont() {
  $('ascii').style.fontFamily = $('fontfam').value;
}

['ascii','orient','fontfam','txtColor','bgColor','align'].forEach(id => {
  $(id).addEventListener('change', () => {
    if (id === 'fontfam') {
      syncTextareaFont();
      document.fonts.load(`16px ${$('fontfam').value}`).then(render);
    } else render();
  });
  $(id).addEventListener('input', render);
});

$('fsize').addEventListener('input', () => {
  $('fsizeOut').textContent = $('fsize').value + 'px';
  render();
});
$('lheight').addEventListener('input', () => {
  $('lhOut').textContent = parseFloat($('lheight').value).toFixed(2) + '×';
  render();
});
$('scanlines').addEventListener('input', () => {
  $('slOut').textContent = $('scanlines').value + '%';
  render();
});
$('glow').addEventListener('input', () => {
  $('glowOut').textContent = $('glow').value;
  render();
});
$('offsetX').addEventListener('input', () => {
  $('offsetXOut').textContent = $('offsetX').value + 'px';
  render();
});
$('offsetY').addEventListener('input', () => {
  $('offsetYOut').textContent = $('offsetY').value + 'px';
  render();
});

$('grain').addEventListener('input', () => {
  $('grainOut').textContent = $('grain').value + '%';
  render();
});
$('aberration').addEventListener('input', () => {
  $('aberrationOut').textContent = $('aberration').value + 'px';
  render();
});
$('shadow').addEventListener('input', () => {
  $('shadowOut').textContent = $('shadow').value;
  render();
});
$('bgFit').addEventListener('change', render);
$('bgScale').addEventListener('input', () => {
  $('bgScaleOut').textContent = $('bgScale').value + '%';
  render();
});
$('bgPosX').addEventListener('input', () => {
  $('bgPosXOut').textContent = $('bgPosX').value + 'px';
  render();
});
$('bgPosY').addEventListener('input', () => {
  $('bgPosYOut').textContent = $('bgPosY').value + 'px';
  render();
});
$('bgBlur').addEventListener('input', () => {
  $('bgBlurOut').textContent = $('bgBlur').value + 'px';
  render();
});
$('bgDim').addEventListener('input', () => {
  $('bgDimOut').textContent = $('bgDim').value + '%';
  render();
});

document.fonts.ready.then(() => { syncTextareaFont(); render(); });
