// 토큰 견본 페이지 동작 (ui-contract@v1) — vanilla-static, ESM
// 상태: light / dark. 초기 상태 light. 실패·초기화 뒤 light로 복귀하며
// #theme-toggle은 항상 재활성화(disabled=false)를 유지한다.

const INITIAL_THEME = 'light';

/** 알 수 없는/누락 상태를 초기값 light로 폴백한다. */
export function normalizeTheme(state) {
  return state === 'dark' ? 'dark' : 'light';
}

/** 순수 토글 로직: light↔dark (DOM 없이 테스트 가능). */
export function nextTheme(current) {
  return normalizeTheme(current) === 'light' ? 'dark' : 'light';
}

/** 상태명 화면 텍스트 (색상만으로 구분하지 않도록 텍스트 노출). */
export function labelForTheme(theme) {
  return normalizeTheme(theme) === 'dark' ? '다크 모드' : '라이트 모드';
}

/** aria-pressed 값 (light=false, dark=true). */
export function ariaPressedForTheme(theme) {
  return normalizeTheme(theme) === 'dark';
}

/**
 * 상태를 DOM에 반영한다. 후조건: control(button)은 항상 재활성화된다.
 * @returns {'light'|'dark'} 실제 적용된(정규화된) 상태
 */
export function applyTheme(theme, { root, button } = {}) {
  const state = normalizeTheme(theme);

  if (root) {
    if (state === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  if (button) {
    button.setAttribute('aria-pressed', String(ariaPressedForTheme(state)));
    button.textContent = labelForTheme(state);
    button.disabled = false; // 후조건: 어떤 경우에도 재활성화
  }

  return state;
}

/** 상태·표시를 초기값(light)으로 되돌린다. control 재활성화 보장. */
export function resetTheme(refs) {
  return applyTheme(INITIAL_THEME, refs);
}

/**
 * 견본 페이지를 초기화하고 #theme-toggle에 토글 핸들러를 연결한다.
 * @returns 현재 상태를 읽는 헬퍼(테스트/디버그용)
 */
export function initShowcase(doc) {
  const root = doc.documentElement;
  const button = doc.getElementById('theme-toggle');
  let current = INITIAL_THEME;

  const render = () => {
    current = applyTheme(current, { root, button });
  };

  render(); // 초기 상태 light 반영

  if (button) {
    button.addEventListener('click', () => {
      try {
        current = nextTheme(current);
        applyTheme(current, { root, button });
      } catch {
        // 실패 시 초기값으로 복귀 + control 재활성화 (후조건 준수)
        current = resetTheme({ root, button });
      }
    });
  }

  return {
    getTheme: () => current,
  };
}

// 브라우저에서만 자동 초기화 (node --test 임포트 시에는 실행되지 않음)
if (typeof document !== 'undefined') {
  const start = () => initShowcase(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}
