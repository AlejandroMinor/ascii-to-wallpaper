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
    $('bgBlurCol').style.display = '';
    $('bgDimCol').style.display = '';
    render();
  };
  img.src = url;
  e.target.value = '';
});

function clearBgImage() {
  bgImage = null;
  $('bgImgName').textContent = '';
  $('bgImgClear').style.display = 'none';
  $('bgBlurCol').style.display = 'none';
  $('bgDimCol').style.display = 'none';
  render();
}

const RESOLUTIONS = {
  'fhd-l': [1920, 1080], 'fhd-p': [1080, 1920],
  '2k-l':  [2560, 1440], '2k-p':  [1440, 2560],
  '4k-l':  [3840, 2160], '4k-p':  [2160, 3840],
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
    bgBlur: parseInt($('bgBlur').value),
    bgDim: parseInt($('bgDim').value) / 100,
    grain: parseInt($('grain').value),
    aberration: parseInt($('aberration').value),
  };
}

function drawToCanvas(canvas, cfg) {
  const { W, H, text, font, fsize, txtColor, bgColor, align, lheight, scanlines, glow, offsetX, offsetY, bgBlur, bgDim, grain, aberration } = cfg;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  if (bgImage) {
    const pad = bgBlur * 2;
    ctx.filter = `blur(${bgBlur}px)`;
    ctx.drawImage(bgImage, -pad, -pad, W + pad * 2, H + pad * 2);
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
$('bgBlur').addEventListener('input', () => {
  $('bgBlurOut').textContent = $('bgBlur').value + 'px';
  render();
});
$('bgDim').addEventListener('input', () => {
  $('bgDimOut').textContent = $('bgDim').value + '%';
  render();
});

document.fonts.ready.then(() => { syncTextareaFont(); render(); });
