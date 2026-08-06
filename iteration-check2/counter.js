// 클릭 카운터 페이지 런타임 (BF-1827)
// 브라우저가 <script type="module" src="./counter.js">로 직접 import한다.
// frozen UI 계약(ui-contract@v1): DOM ID counter-root/counter-value/counter-increment/counter-reset,
// class counter/__value/__increment/__reset, 상태 초기/증가/초기화, token --color-action-primary 등.
// 카운트 로직은 DOM 무의존 순수 함수로 분리해 node --test에서 shim 없이 검증 가능하게 한다.

/** frozen: 초기 카운트 */
export const INITIAL_COUNT = 0;

/**
 * 화면/접근성에 노출할 카운트 텍스트 (색상만이 아닌 상태명을 텍스트로 노출).
 * @param {number} count
 * @returns {string}
 */
export function counterText(count) {
  return `클릭 횟수: ${count}`;
}

/**
 * 카운트 상태 전환 — 증가·초기화만 존재하며 감소는 계약에 없다(음수 불가).
 * @param {number} count 현재 카운트
 * @param {'increment'|'reset'} action
 * @returns {number} 다음 카운트
 */
export function reduce(count, action) {
  switch (action) {
    case 'increment':
      return count + 1;
    case 'reset':
      return INITIAL_COUNT;
    default:
      return count; // 미지정 action은 상태를 유지한다
  }
}

/**
 * frozen 마크업 골격(§4.1) — counter-root 컨테이너 + value + 증가/초기화 control.
 * 초기 텍스트는 '클릭 횟수: 0'으로 두어 JS 미실행 시에도 초기 상태가 보이게 한다.
 * @returns {string}
 */
export function counterMarkup() {
  return [
    '<div id="counter-root" class="counter">',
    `  <p id="counter-value" class="counter__value" aria-live="polite">${counterText(INITIAL_COUNT)}</p>`,
    '  <div class="counter__controls">',
    '    <button id="counter-increment" class="counter__increment" type="button" aria-label="카운트 증가">+1</button>',
    '    <button id="counter-reset" class="counter__reset" type="button" aria-label="카운트 초기화">초기화</button>',
    '  </div>',
    '</div>',
  ].join('\n');
}

// ── 브라우저 전용 DOM 배선 (node --test에서는 document 미정의라 실행되지 않음) ──

/**
 * counter-value 텍스트를 현재 카운트로 갱신한다.
 * @param {Element|null} valueEl
 * @param {number} count
 */
function render(valueEl, count) {
  if (valueEl) valueEl.textContent = counterText(count);
}

/**
 * 증가·초기화 control을 배선한다. 증가 control은 초기화 후에도 disabled 되지 않아
 * 언제든 다시 사용할 수 있다.
 * @param {Document} doc
 */
export function init(doc) {
  const valueEl = doc.getElementById('counter-value');
  const incrementBtn = doc.getElementById('counter-increment');
  const resetBtn = doc.getElementById('counter-reset');
  if (!valueEl || !incrementBtn || !resetBtn) return;

  let count = INITIAL_COUNT;
  render(valueEl, count);

  incrementBtn.addEventListener('click', () => {
    count = reduce(count, 'increment');
    render(valueEl, count);
  });
  resetBtn.addEventListener('click', () => {
    count = reduce(count, 'reset');
    render(valueEl, count);
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
