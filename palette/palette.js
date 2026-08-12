const HEX_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function hexToHsl(hex) {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error('올바른 hex 코드를 입력하세요 (예: #ff0000)');
  }
  const raw = hex.replace(/^#/, '');
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  h = Math.round(h) % 360;
  if (h < 0) h += 360;

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex({ h, s, l }) {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const light = Math.min(100, Math.max(0, l)) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c; g = x; b = 0;
  } else if (hue < 120) {
    r = x; g = c; b = 0;
  } else if (hue < 180) {
    r = 0; g = c; b = x;
  } else if (hue < 240) {
    r = 0; g = x; b = c;
  } else if (hue < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildPalette(hex) {
  const { h, s, l } = hexToHsl(hex);

  const derived = [
    { role: 'complementary', h: (h + 180) % 360, s, l },
    { role: 'analogous-30', h: (h - 30 + 360) % 360, s, l },
    { role: 'analogous+30', h: (h + 30) % 360, s, l },
    { role: 'lighter', h, s, l: Math.min(l + 20, 95) },
    { role: 'darker', h, s, l: Math.max(l - 20, 5) },
  ];

  return derived.map(({ role, h: dh, s: ds, l: dl }) => ({
    hex: hslToHex({ h: dh, s: ds, l: dl }),
    role,
  }));
}

const DEFAULT_HEX = '#3b82f6';
const COPIED_DURATION_MS = 1500;
const ERROR_TEXT = '올바른 hex 코드를 입력하세요 (예: #ff0000)';

function initPaletteUI() {
  const hexInput = document.getElementById('hex-input');
  const colorPicker = document.getElementById('color-picker');
  const randomBtn = document.getElementById('random-btn');
  const swatchesContainer = document.getElementById('palette-swatches');
  const errorMessage = document.getElementById('error-message');

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function clearError() {
    errorMessage.textContent = '';
    errorMessage.hidden = true;
  }

  function showCopied(btn, badge) {
    badge.hidden = false;
    if (btn._copiedTimer) clearTimeout(btn._copiedTimer);
    btn._copiedTimer = setTimeout(() => {
      badge.hidden = true;
      btn._copiedTimer = null;
    }, COPIED_DURATION_MS);
  }

  function handleSwatchClick(btn, badge, hex) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard
      .writeText(hex)
      .then(() => showCopied(btn, badge))
      .catch(() => {});
  }

  function renderPalette(paletteEntries) {
    swatchesContainer.innerHTML = '';
    paletteEntries.forEach(({ hex }) => {
      const hexUpper = hex.toUpperCase();

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'palette__swatch';
      btn.style.backgroundColor = hex;
      btn.setAttribute('aria-label', `${hexUpper} 복사`);

      const hexSpan = document.createElement('span');
      hexSpan.className = 'palette__swatch-hex';
      hexSpan.textContent = hexUpper;

      const badge = document.createElement('span');
      badge.className = 'palette__copied-badge';
      badge.textContent = '복사됨';
      badge.hidden = true;

      btn.appendChild(hexSpan);
      btn.appendChild(badge);
      btn.addEventListener('click', () => handleSwatchClick(btn, badge, hex));

      swatchesContainer.appendChild(btn);
    });
  }

  function generateFrom(hex) {
    randomBtn.setAttribute('aria-busy', 'true');
    randomBtn.disabled = true;
    try {
      renderPalette(buildPalette(hex));
      clearError();
    } catch (_e) {
      showError(ERROR_TEXT);
    } finally {
      randomBtn.removeAttribute('aria-busy');
      randomBtn.disabled = false;
    }
  }

  function handleHexInput() {
    const value = hexInput.value.trim();
    if (!HEX_PATTERN.test(value)) {
      showError(ERROR_TEXT);
      return;
    }
    const normalized = value.startsWith('#') ? value : `#${value}`;
    colorPicker.value = normalized;
    generateFrom(normalized);
  }

  function handleColorPickerInput() {
    const value = colorPicker.value;
    hexInput.value = value;
    generateFrom(value);
  }

  function randomHex() {
    const n = Math.floor(Math.random() * 0xffffff);
    return `#${n.toString(16).padStart(6, '0')}`;
  }

  function handleRandomClick() {
    const hex = randomHex();
    hexInput.value = hex;
    colorPicker.value = hex;
    generateFrom(hex);
  }

  hexInput.addEventListener('input', handleHexInput);
  colorPicker.addEventListener('input', handleColorPickerInput);
  randomBtn.addEventListener('click', handleRandomClick);

  generateFrom(DEFAULT_HEX);
}

if (typeof document !== 'undefined') {
  initPaletteUI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hexToHsl, hslToHex, buildPalette };
}
