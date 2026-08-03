// BF-1584 · 게임 오버 메뉴 버튼 배선 (frozen ui-contract@v1)
//
// 게임 오버 오버레이의 '다시하기'/'설정' 버튼을 기존 재시작·설정 핸들러에
// 연결한다. 새 재시작/설정 로직을 만들지 않고 game.js 가 window 에 노출한
// doRestart() / openSettingsModal() 진입점을 그대로 재사용한다.
//
// ESM 모듈로 제공하여 (1) 브라우저는 <script type="module"> 로 로드하고,
// (2) node --test 는 순수 팩토리를 DOM 없이 검증할 수 있다. 브라우저 부트스트랩
// 코드는 document/window 존재를 가드해 node 환경에서는 실행되지 않는다.

/**
 * 게임 오버 메뉴 버튼의 상태 계약(gameover-idle / restart-activated /
 * settings-open / settings-closed)을 배선하는 순수 팩토리.
 *
 * @param {object} deps
 * @param {{addEventListener:Function, focus?:Function}} [deps.restartBtn] 다시하기 버튼
 * @param {{addEventListener:Function, focus?:Function}} [deps.settingsBtn] 설정 버튼
 * @param {Function} [deps.onRestart] 기존 재시작 핸들러(doRestart) 위임
 * @param {Function} [deps.onSettings] 기존 설정 핸들러(openSettingsModal) 위임
 * @param {Function} [deps.onSettingsClosed] 설정 닫힘 후 추가 훅(옵션)
 */
export function createGameOverMenu(deps) {
  const {
    restartBtn,
    settingsBtn,
    onRestart,
    onSettings,
    onSettingsClosed,
  } = deps || {};

  // 설정 모달을 '게임 오버 메뉴'에서 열었는지 추적 — 다른 경로로 열린 모달의
  // 닫힘 이벤트가 게임 오버 버튼으로 포커스를 훔치지 않도록 가드한다.
  let awaitingSettingsClose = false;

  // restart-activated: 기존 재시작 핸들러 재사용(오버레이 숨김 + 같은 설정 새 게임).
  function activateRestart() {
    if (typeof onRestart === 'function') onRestart();
  }

  // settings-open: 기존 설정 핸들러 재사용. 오버레이는 뒤에 유지된다.
  function activateSettings() {
    awaitingSettingsClose = true;
    if (typeof onSettings === 'function') onSettings();
  }

  // settings-closed: 설정 모달을 닫으면 포커스를 '설정' 버튼으로 복원한다.
  function notifySettingsClosed() {
    if (!awaitingSettingsClose) return false;
    awaitingSettingsClose = false;
    if (settingsBtn && typeof settingsBtn.focus === 'function') {
      settingsBtn.focus();
    }
    if (typeof onSettingsClosed === 'function') onSettingsClosed();
    return true;
  }

  if (restartBtn && typeof restartBtn.addEventListener === 'function') {
    restartBtn.addEventListener('click', activateRestart);
  }
  if (settingsBtn && typeof settingsBtn.addEventListener === 'function') {
    settingsBtn.addEventListener('click', activateSettings);
  }

  return {
    activateRestart,
    activateSettings,
    notifySettingsClosed,
    isAwaitingSettingsClose() { return awaitingSettingsClose; },
  };
}

/**
 * 브라우저 DOM 을 조회해 게임 오버 메뉴를 배선한다. 버튼이 없으면 null 을 반환.
 * 설정 모달의 hidden 속성 변화를 관찰해 닫힘 시 포커스를 복원한다.
 *
 * @param {Document} doc
 * @param {Window} win
 */
export function bootstrapGameOverMenu(doc, win) {
  const restartBtn = doc.getElementById('gameover-restart-btn');
  const settingsBtn = doc.getElementById('gameover-settings-btn');
  if (!restartBtn || !settingsBtn) return null;

  const settingsModal = doc.getElementById('settings-modal');

  const menu = createGameOverMenu({
    restartBtn,
    settingsBtn,
    onRestart() {
      // game.js 최상위 function 선언 → window 프로퍼티로 노출됨(classic script).
      if (win && typeof win.doRestart === 'function') win.doRestart();
    },
    onSettings() {
      if (win && typeof win.openSettingsModal === 'function') {
        win.openSettingsModal('gameover-menu');
      }
    },
  });

  // 설정 모달이 hidden 으로 전환(닫힘)되면 포커스 복원. game.js 의
  // closeSettingsModal 을 건드리지 않는 additive 배선.
  if (settingsModal && win && typeof win.MutationObserver === 'function') {
    const observer = new win.MutationObserver(() => {
      if (settingsModal.hasAttribute('hidden')) {
        menu.notifySettingsClosed();
      }
    });
    observer.observe(settingsModal, { attributes: true, attributeFilter: ['hidden'] });
  }

  return menu;
}

// ── 브라우저 부트스트랩 (node 환경에서는 실행되지 않음) ──────────
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const run = () => bootstrapGameOverMenu(document, window);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}
