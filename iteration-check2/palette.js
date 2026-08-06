// 브랜드 팔레트 페이지 런타임 (BF-1821)
// 브라우저가 <script type="module" src="palette.js">로 직접 import한다.
// frozen UI 계약(ui-contract@v1): DOM ID palette-root/palette-grid/palette-status,
// class palette__card/__swatch/__value/__copy, 상태 idle/copied/error, 4색 brand token.
// DOM 무의존 순수 함수(마크업 빌더 + 상태 전환)로 분리해 node --test에서 shim 없이 검증 가능하게 한다.

/** @typedef {{ name: string, hex: string, token: string }} PaletteItem */

/** frozen: 브랜드 4색 (순서·hex 대문자·대응 token 고정, §3.5) @type {PaletteItem[]} */
export const PALETTE_ITEMS = [
  { name: 'Primary', hex: '#2563EB', token: '--brand-primary' },
  { name: 'Secondary', hex: '#7C3AED', token: '--brand-secondary' },
  { name: 'Accent', hex: '#F59E0B', token: '--brand-accent' },
  { name: 'Neutral', hex: '#111827', token: '--brand-neutral' },
];

/** frozen: 상태별 화면 텍스트 (idle/copied/error) */
export const COPY_LABELS = { idle: '복사', copied: '복사됨', error: '복사 실패' };

/** 복사 후 idle 초기값으로 되돌리는 대기 시간(ms) */
export const COPY_RESET_MS = 1200;

/**
 * 복사 control의 명시적 aria-label — 색상 이름 + hex를 포함한다.
 * @param {PaletteItem} item
 * @returns {string}
 */
export function copyAriaLabel(item) {
  return `${item.name} ${item.hex} 복사`;
}

/**
 * 상태명 → 화면/접근성에 노출할 view (색상만이 아닌 텍스트로 구분).
 * idle은 control 재활성화(disabled=false)와 상태 텍스트 복원(빈 문자열)을 나타낸다.
 * @param {'idle'|'copied'|'error'} state
 */
export function viewForState(state) {
  switch (state) {
    case 'copied':
      return { buttonText: COPY_LABELS.copied, disabled: true, statusText: COPY_LABELS.copied };
    case 'error':
      return { buttonText: COPY_LABELS.error, disabled: true, statusText: COPY_LABELS.error };
    case 'idle':
    default:
      return { buttonText: COPY_LABELS.idle, disabled: false, statusText: '' };
  }
}

/**
 * 카드 1개의 HTML 문자열. swatch 배경은 대응 token, 이름 텍스트·hex·복사 버튼을 포함한다.
 * 카드는 tabindex=0으로 키보드 포커스 가능, 복사 버튼은 색상 이름을 포함한 aria-label을 가진다.
 * @param {PaletteItem} item
 * @returns {string}
 */
export function cardMarkup(item) {
  return [
    '<article class="palette__card" tabindex="0">',
    `<span class="palette__swatch" style="background-color: var(${item.token});" aria-hidden="true"></span>`,
    `<span class="palette__name">${item.name}</span>`,
    `<span class="palette__value">${item.hex}</span>`,
    `<button type="button" class="palette__copy"`,
    ` data-hex="${item.hex}" data-name="${item.name}"`,
    ` aria-label="${copyAriaLabel(item)}">${COPY_LABELS.idle}</button>`,
    '</article>',
  ].join('');
}

/**
 * 팔레트 그리드 전체 마크업(4개 카드).
 * @param {PaletteItem[]} items
 * @returns {string}
 */
export function paletteMarkup(items = PALETTE_ITEMS) {
  return items.map(cardMarkup).join('');
}

const defaultSchedule = (fn, ms) => {
  if (typeof setTimeout === 'function') return setTimeout(fn, ms);
  fn();
  return undefined;
};

/**
 * 복사 실행 상태 머신. 클립보드 쓰기 성공/실패를 onState로 알린 뒤,
 * resetMs 후 항상 idle로 복원한다(control 재활성화 + 상태 표시 초기화).
 * clipboard/schedule을 주입받아 DOM 없이 검증 가능하다.
 * @param {{ hex: string, clipboard?: { writeText?: (v: string) => Promise<unknown> } | undefined,
 *   onState: (state: 'copied'|'error'|'idle') => void,
 *   schedule?: (fn: () => void, ms: number) => unknown, resetMs?: number }} params
 * @returns {Promise<'copied'|'error'>}
 */
export async function performCopy({ hex, clipboard, onState, schedule = defaultSchedule, resetMs = COPY_RESET_MS }) {
  /** @type {'copied'|'error'} */
  let outcome;
  try {
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      throw new Error('clipboard-unavailable');
    }
    await clipboard.writeText(hex);
    outcome = 'copied';
  } catch (_err) {
    outcome = 'error';
  }
  onState(outcome);
  await new Promise((resolve) => {
    schedule(() => {
      onState('idle');
      resolve(undefined);
    }, resetMs);
  });
  return outcome;
}

// ── 브라우저 전용 DOM 배선 (node --test에서는 document 미정의라 실행되지 않음) ──

/** @param {'idle'|'copied'|'error'} state */
function applyStateToDom(btn, statusEl, state) {
  const view = viewForState(state);
  btn.textContent = view.buttonText;
  btn.disabled = view.disabled;
  if (statusEl) {
    statusEl.textContent = view.statusText;
    statusEl.dataset.state = state;
  }
}

function getClipboard() {
  return typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
}

/**
 * 팔레트를 grid에 렌더하고 복사 버튼을 배선한다.
 * @param {Document} doc
 */
export function init(doc, clipboard = getClipboard()) {
  const grid = doc.getElementById('palette-grid');
  const statusEl = doc.getElementById('palette-status');
  if (!grid) return;
  grid.innerHTML = paletteMarkup();
  grid.querySelectorAll('.palette__copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.disabled = true; // 연속 클릭 방지 — idle 복원 시 재활성화
      performCopy({
        hex: btn.getAttribute('data-hex') ?? '',
        clipboard,
        onState: (state) => applyStateToDom(btn, statusEl, state),
      });
    });
  });
}

if (typeof document !== 'undefined') {
  const start = () => init(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
