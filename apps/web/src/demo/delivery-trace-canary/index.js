// delivery-trace-canary demo route entrypoint (BF-1235)
// 순수 로직(DeliveryTraceBoard.js)을 실제 DOM 에 바인딩하고 키보드/클릭 상호작용을 연결한다.
// 브라우저 전용. node --test 는 DeliveryTraceBoard.js 순수 함수를 직접 검증한다.

import { renderBoard } from './DeliveryTraceBoard.js';
import { defaultFixture } from './fixtures.js';

/**
 * 보드를 mount 지점에 렌더하고 상호작용을 연결한다.
 * @param {HTMLElement} mount
 * @param {object} [fixture]
 * @returns {{ reset: () => void }}
 */
export function mountBoard(mount, fixture = defaultFixture) {
  const doc = mount.ownerDocument;
  // 초기값(§4): 선택 없음(ready), 필터 all
  const view = { selectedId: null, filter: 'all' };

  function paint(focusSelector) {
    mount.innerHTML = renderBoard(fixture, view);
    wire();
    if (focusSelector) {
      const target = mount.querySelector(focusSelector);
      if (target) target.focus();
    }
  }

  /** 상세 패널을 닫고 상태·진행 표시를 초기값(ready)으로 복원, 필터 재활성(§4 후조건) */
  function reset() {
    view.selectedId = null;
    paint('#trace-stage-filter');
  }

  function selectCell(cellId) {
    view.selectedId = cellId;
    // 상세 패널로 포커스 이동(키보드 경로)
    paint('#trace-detail-panel');
  }

  function moveFocus(currentBtn, delta) {
    const cards = Array.from(mount.querySelectorAll('.delivery-trace__stage'));
    const idx = cards.indexOf(currentBtn);
    if (idx === -1) return;
    const next = cards[(idx + delta + cards.length) % cards.length];
    if (next) next.focus();
  }

  function wire() {
    const filter = mount.querySelector('#trace-stage-filter');
    if (filter) {
      filter.addEventListener('change', (event) => {
        view.filter = event.target.value;
        paint('#trace-stage-filter');
      });
    }

    for (const card of mount.querySelectorAll('.delivery-trace__stage')) {
      card.addEventListener('click', () => selectCell(card.dataset.cellId));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectCell(card.dataset.cellId);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          moveFocus(card, 1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveFocus(card, -1);
        }
      });
    }

    const closeBtn = mount.querySelector('#trace-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', reset);

    const panel = mount.querySelector('#trace-detail-panel');
    if (panel) {
      panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          reset();
        }
      });
    }
  }

  paint();
  return { reset };
}

// 자동 mount: 브라우저에서 #delivery-trace-board-root 를 찾으면 렌더
if (typeof document !== 'undefined') {
  const boot = () => {
    const root = document.getElementById('delivery-trace-board-root');
    if (root) mountBoard(root);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
