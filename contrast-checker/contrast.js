// BF-1977: 색상 대비 검사기 — 상대 휘도·대비비 순수 함수 및 DOM 바인딩.
// frozen 계약: docs/plans/BF-1975/implementation-plan.md §5, §6.
//
// [리뷰 수정 — file:// CORS 회귀 대응]
// `<script type="module">` 로 로드하면 Chrome 계열 브라우저가 file:// origin
// 에서 module script fetch 를 CORS 정책상 차단해 AC1(file:// 에서도 정상 렌더)
// 을 깨뜨린다. 이를 피하기 위해 이 파일은 import/export 구문을 전혀 쓰지 않는
// classic script 로 작성한다 — 브라우저는 <script src="contrast.js"> (비-module)
// 로 그대로 로드하고, 전역 함수 선언만으로 동작한다.
// node --test 쪽은 옆의 contrast-checker/package.json 에서 이 서브트리를
// "type": "commonjs" 로 고정했으므로, 아래 module.exports 를 통해 동일 파일을
// require() 로 그대로 불러와 순수 함수를 검증한다. 브라우저에는 `module` 전역이
// 없으므로 typeof 가드로 안전하게 건너뛴다.

const HEX_PATTERN = /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/;

function isValidHex(value) {
  return typeof value === 'string' && HEX_PATTERN.test(value.trim());
}

function normalizeHex(value) {
  const stripped = value.trim().replace(/^#/, '').toLowerCase();
  if (stripped.length === 3) {
    return stripped
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return stripped;
}

function hexToRgb(hex6) {
  return {
    r: parseInt(hex6.slice(0, 2), 16),
    g: parseInt(hex6.slice(2, 4), 16),
    b: parseInt(hex6.slice(4, 6), 16),
  };
}

// §5.1 sRGB 채널 선형화
function channelToLinear(channel255) {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// §5.2 상대 휘도
function relativeLuminance(rgb) {
  return (
    0.2126 * channelToLinear(rgb.r) +
    0.7152 * channelToLinear(rgb.g) +
    0.0722 * channelToLinear(rgb.b)
  );
}

// §5.3 대비비 — L1(밝은 쪽) >= L2(어두운 쪽) 로 정렬
function contrastRatio(fgHex, bgHex) {
  const lA = relativeLuminance(hexToRgb(normalizeHex(fgHex)));
  const lB = relativeLuminance(hexToRgb(normalizeHex(bgHex)));
  const l1 = Math.max(lA, lB);
  const l2 = Math.min(lA, lB);
  return (l1 + 0.05) / (l2 + 0.05);
}

// §6 판정 기준 — 임계값과 정확히 일치하는 경우도 통과로 판정한다.
function evaluateThresholds(ratio) {
  return {
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
  };
}

// §4 상태 모델 — idle / valid / error.
// 두 입력 모두 공백이면 idle, 둘 다 유효한 hex 이면 valid, 그 외(한쪽이라도
// 무효하거나 한쪽만 채워진 경우 포함)는 error 로 판정하고 계산을 중단한다.
function evaluateContrast(foregroundRaw, backgroundRaw) {
  const fg = typeof foregroundRaw === 'string' ? foregroundRaw.trim() : '';
  const bg = typeof backgroundRaw === 'string' ? backgroundRaw.trim() : '';

  if (fg === '' && bg === '') {
    return {
      state: 'idle',
      ratio: null,
      aa: null,
      aaa: null,
      aaLarge: null,
      errorMessage: null,
      foregroundHex: null,
      backgroundHex: null,
    };
  }

  const fgValid = isValidHex(fg);
  const bgValid = isValidHex(bg);

  if (!fgValid || !bgValid) {
    const invalidFields = [];
    if (!fgValid) invalidFields.push('전경색');
    if (!bgValid) invalidFields.push('배경색');
    return {
      state: 'error',
      ratio: null,
      aa: null,
      aaa: null,
      aaLarge: null,
      errorMessage:
        invalidFields.join(', ') +
        ' 값이 올바른 hex 형식이 아닙니다. #RGB 또는 #RRGGBB 형식으로 입력하세요.',
      foregroundHex: null,
      backgroundHex: null,
    };
  }

  const ratio = contrastRatio(fg, bg);
  const thresholds = evaluateThresholds(ratio);

  return {
    state: 'valid',
    ratio,
    aa: thresholds.aa,
    aaa: thresholds.aaa,
    aaLarge: thresholds.aaLarge,
    errorMessage: null,
    foregroundHex: '#' + normalizeHex(fg),
    backgroundHex: '#' + normalizeHex(bg),
  };
}

function formatRatio(ratio) {
  return ratio.toFixed(2) + ':1';
}

function formatPass(passed) {
  return passed ? '통과' : '실패';
}

function render(elements, result) {
  const { ratioEl, aaEl, aaaEl, aaLargeEl, previewEl, errorEl } = elements;

  if (result.state === 'valid') {
    errorEl.textContent = '';
    ratioEl.textContent = formatRatio(result.ratio);
    aaEl.textContent = formatPass(result.aa);
    aaaEl.textContent = formatPass(result.aaa);
    aaLargeEl.textContent = formatPass(result.aaLarge);
    previewEl.style.color = result.foregroundHex;
    previewEl.style.backgroundColor = result.backgroundHex;
    return;
  }

  // idle / error 는 결과 영역을 동일하게 비운다(구현 설계 §4).
  ratioEl.textContent = '–';
  aaEl.textContent = '미입력';
  aaaEl.textContent = '미입력';
  aaLargeEl.textContent = '미입력';
  previewEl.style.color = '';
  previewEl.style.backgroundColor = '';
  errorEl.textContent = result.state === 'error' ? result.errorMessage : '';
}

function initApp() {
  const fgInput = document.getElementById('contrast-foreground-input');
  const bgInput = document.getElementById('contrast-background-input');
  const elements = {
    ratioEl: document.getElementById('contrast-ratio-value'),
    aaEl: document.getElementById('contrast-aa-result'),
    aaaEl: document.getElementById('contrast-aaa-result'),
    aaLargeEl: document.getElementById('contrast-aa-large-result'),
    previewEl: document.getElementById('contrast-preview'),
    errorEl: document.getElementById('contrast-error'),
  };

  function recalculate() {
    render(elements, evaluateContrast(fgInput.value, bgInput.value));
  }

  // 두 입력 control 은 error 상태에서도 disabled 되지 않고 계속 편집 가능해야
  // 하므로(구현 설계 §4 후조건), 여기서는 disabled 를 전혀 다루지 않는다.
  fgInput.addEventListener('input', recalculate);
  bgInput.addEventListener('input', recalculate);

  recalculate();
}

// node --test 는 document 가 없으므로 DOM 바인딩을 건너뛰고 순수 함수만 검증한다.
if (typeof document !== 'undefined' && document && typeof document.getElementById === 'function') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

// node --test 전용 export. 브라우저 classic script 컨텍스트에는 `module` 전역이
// 없으므로 typeof 가드로 안전하게 건너뛴다(§ 파일 상단 주석 참고).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isValidHex,
    normalizeHex,
    hexToRgb,
    channelToLinear,
    relativeLuminance,
    contrastRatio,
    evaluateThresholds,
    evaluateContrast,
  };
}
