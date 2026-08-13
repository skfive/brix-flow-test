const HEX_FULL_PATTERN = /^#?[0-9a-fA-F]{6}$/;
const HEX_SHORT_PATTERN = /^#?[0-9a-fA-F]{3}$/;

function hexToRgb(hex) {
  const raw = hex.replace(/^#/, '');
  let full;
  if (HEX_SHORT_PATTERN.test(hex) && raw.length === 3) {
    full = raw
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (HEX_FULL_PATTERN.test(hex) && raw.length === 6) {
    full = raw;
  } else {
    throw new Error('유효한 HEX 색상 코드를 입력해주세요');
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, l };
}

function hslToHex({ h, s, l }) {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

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

  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rotateHue(hex, degrees) {
  const rgb = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(rgb);
  const rotated = ((h + degrees) % 360 + 360) % 360;
  return hslToHex({ h: rotated, s, l });
}

function linearizeChannel(c) {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const R = linearizeChannel(r / 255);
  const G = linearizeChannel(g / 255);
  const B = linearizeChannel(b / 255);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const PALETTE_ROTATIONS = [
  { label: '기준색', angle: 0 },
  { label: '유사색(−30°)', angle: -30 },
  { label: '유사색(+30°)', angle: 30 },
  { label: '보색', angle: 180 },
  { label: '보색의 유사색', angle: 150 },
];

function recommendedTextColor(hex) {
  const whiteRatio = contrastRatio(hex, '#FFFFFF');
  const blackRatio = contrastRatio(hex, '#000000');
  return blackRatio > whiteRatio
    ? { color: '#000000', label: '검정' }
    : { color: '#FFFFFF', label: '흰색' };
}

function buildPalette(hex) {
  return PALETTE_ROTATIONS.map(({ label, angle }) => {
    const swatchHex = angle === 0 ? hexToRgbToHex(hex) : rotateHue(hex, angle);
    const textColor = recommendedTextColor(swatchHex);
    return { label, angle, hex: swatchHex, textColor };
  });
}

function hexToRgbToHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (v) => v.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function initPaletteUI() {
  const app = document.getElementById('palette-app');
  const hexInput = document.getElementById('hex-input');
  const colorPicker = document.getElementById('color-picker');
  const generateBtn = document.getElementById('generate-btn');
  const resetBtn = document.getElementById('reset-btn');
  const swatchList = document.getElementById('swatch-list');
  const statusMessage = document.getElementById('status-message');

  const DEFAULT_COLOR = '#2563eb';

  function setState(state) {
    app.setAttribute('data-state', state);
  }

  function setStatusMessage(text) {
    statusMessage.textContent = text;
  }

  function syncColorPicker(hex) {
    try {
      colorPicker.value = hexToRgbToHex(hex).toLowerCase();
    } catch (_e) {
      // 동기화 실패는 무시 — hex-input 값이 아직 완성되지 않은 입력 중일 수 있음
    }
  }

  function renderSwatches(entries) {
    swatchList.innerHTML = '';
    entries.forEach(({ hex, textColor }) => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = hex;

      const hexLabel = document.createElement('span');
      hexLabel.className = 'swatch__hex';
      hexLabel.textContent = hex;

      const contrastLabel = document.createElement('span');
      contrastLabel.className = 'swatch__contrast-label';
      contrastLabel.textContent = `권장 텍스트: ${textColor.label}`;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'swatch__copy-btn';
      copyBtn.textContent = '복사';
      copyBtn.setAttribute('aria-label', `HEX ${hex} 복사`);

      const copyFeedback = document.createElement('span');
      copyFeedback.className = 'swatch__copy-feedback';
      copyFeedback.hidden = true;

      copyBtn.addEventListener('click', () => {
        const finish = (text) => {
          copyFeedback.textContent = text;
          copyFeedback.hidden = false;
          if (copyBtn._copiedTimer) clearTimeout(copyBtn._copiedTimer);
          copyBtn._copiedTimer = setTimeout(() => {
            copyFeedback.hidden = true;
            copyBtn._copiedTimer = null;
          }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(hex)
            .then(() => finish('복사됨'))
            .catch(() => finish('복사 실패'));
        } else {
          finish('복사 실패');
        }
      });

      swatch.appendChild(hexLabel);
      swatch.appendChild(contrastLabel);
      swatch.appendChild(copyBtn);
      swatch.appendChild(copyFeedback);
      swatchList.appendChild(swatch);
    });
  }

  function generate() {
    const value = hexInput.value.trim();
    setState('generating');
    generateBtn.disabled = true;

    try {
      const palette = buildPalette(value);
      renderSwatches(palette);
      syncColorPicker(value);
      setStatusMessage(`${palette.length}개 색상 팔레트가 생성되었습니다.`);
      setState('success');
    } catch (_e) {
      setStatusMessage('유효한 HEX 색상 코드를 입력해주세요.');
      setState('error');
    } finally {
      generateBtn.disabled = false;
    }
  }

  function handleHexInput() {
    if (app.getAttribute('data-state') === 'error') {
      setState('idle');
      setStatusMessage('');
      generateBtn.disabled = false;
    }
    syncColorPicker(hexInput.value.trim());
  }

  function handleColorPickerInput() {
    hexInput.value = colorPicker.value;
    if (app.getAttribute('data-state') === 'error') {
      setState('idle');
      setStatusMessage('');
      generateBtn.disabled = false;
    }
  }

  function handleReset() {
    hexInput.value = '';
    colorPicker.value = DEFAULT_COLOR;
    swatchList.innerHTML = '';
    setStatusMessage('');
    setState('idle');
    generateBtn.disabled = false;
    hexInput.disabled = false;
  }

  generateBtn.addEventListener('click', generate);
  hexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generate();
  });
  hexInput.addEventListener('input', handleHexInput);
  colorPicker.addEventListener('input', handleColorPickerInput);
  resetBtn.addEventListener('click', handleReset);

  setState('idle');
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initPaletteUI);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hexToRgb, rotateHue, contrastRatio, buildPalette };
}
