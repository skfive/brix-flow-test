// clock.js — DOM 바인딩 · 1초 타이머 · 12/24시간 토글 상태 관리
// 브라우저가 <script type="module"> 로 직접 로드하는 ESM 런타임 파일. 빌드 도구 없음.

import { formatTime } from './format-time.js';

// 토글 라벨은 "다음에 전환될 형식" 을 안내한다.
const TOGGLE_LABEL = {
  false: '24시간제로', // 현재 12시간제 → 24시간제로 전환 제공
  true: '12시간제로', // 현재 24시간제 → 12시간제로 전환 제공
};

/**
 * 시계를 DOM 에 초기화한다. 초기 상태는 12시간제.
 * @param {Document} doc DOM 루트 (테스트에서 주입 가능)
 * @param {() => Date} now 현재 시각 공급자 (테스트에서 주입 가능)
 * @returns {{ stop: () => void } | null} 컨트롤러 (요소 부재 시 null)
 */
export function initClock(doc = document, now = () => new Date()) {
  const timeEl = doc.getElementById('clock-time');
  const toggleEl = doc.getElementById('clock-toggle');
  if (!timeEl || !toggleEl) {
    return null;
  }

  // 초기값(12시간제)으로 상태 리셋 — 취소/재초기화 후조건 보장.
  let is24Hour = false;

  function render() {
    timeEl.textContent = formatTime(now(), is24Hour);
    toggleEl.textContent = TOGGLE_LABEL[is24Hour];
    // 초기화 후에도 주 실행 control 은 항상 다시 사용 가능해야 한다.
    toggleEl.disabled = false;
  }

  toggleEl.addEventListener('click', () => {
    is24Hour = !is24Hour;
    // 다음 tick 을 기다리지 않고 즉시 재렌더 — 표시가 이전 형식으로 남지 않게.
    render();
  });

  render(); // 즉시 초기 렌더
  const intervalId = setInterval(render, 1000);

  return {
    stop() {
      clearInterval(intervalId);
    },
  };
}

// 브라우저 환경에서만 자동 초기화 (module script 는 DOM 파싱 후 실행됨).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initClock());
  } else {
    initClock();
  }
}
