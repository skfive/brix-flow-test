// BF-1584 · 게임 오버 메뉴 버튼 회귀 테스트 (node --test)
// frozen UI 계약(ui-contract@v1): 버튼 존재·aria-label·기존 핸들러 재사용·
//   설정 닫힘 후 '설정' 버튼 포커스 복원·점수/아이템 블록 보존.
//
// 브라우저(DOM) 없이 검증하기 위해 snake.js 의 순수 팩토리(createGameOverMenu,
//   bootstrapGameOverMenu)를 최소 DOM 스텁으로 구동한다. downstream tester 가
//   실브라우저 E2E 를 담당하므로 여기서는 배선 로직·정적 마크업만 검증한다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createGameOverMenu, bootstrapGameOverMenu } from '../snake.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAKE_DIR = join(__dirname, '..');
const INDEX_HTML = readFileSync(join(SNAKE_DIR, 'index.html'), 'utf8');
const STYLES_CSS = readFileSync(join(SNAKE_DIR, 'styles.css'), 'utf8');

// ── 최소 DOM 스텁 ────────────────────────────────────────────
function makeButton() {
  const listeners = {};
  const attrs = {};
  return {
    listeners,
    focusCount: 0,
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    dispatch(type) {
      (listeners[type] || []).forEach((fn) => fn({ type }));
    },
    focus() { this.focusCount++; },
    setAttribute(k, v) { attrs[k] = String(v); },
    removeAttribute(k) { delete attrs[k]; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
  };
}

// ── createGameOverMenu: 배선 & 상태 계약 ─────────────────────
test('restart-activated: 다시하기 클릭 → onRestart 재시작 핸들러 호출', () => {
  let restarts = 0;
  const restartBtn = makeButton();
  const settingsBtn = makeButton();
  createGameOverMenu({
    restartBtn,
    settingsBtn,
    onRestart: () => { restarts++; },
    onSettings: () => {},
  });
  restartBtn.dispatch('click');
  assert.equal(restarts, 1, '다시하기 클릭은 기존 재시작 핸들러를 정확히 1회 호출해야 한다');
});

test('settings-open: 설정 클릭 → onSettings 호출 + 닫힘 대기 플래그 설정', () => {
  let opens = 0;
  const restartBtn = makeButton();
  const settingsBtn = makeButton();
  const menu = createGameOverMenu({
    restartBtn,
    settingsBtn,
    onRestart: () => {},
    onSettings: () => { opens++; },
  });
  settingsBtn.dispatch('click');
  assert.equal(opens, 1, '설정 클릭은 기존 설정 핸들러를 정확히 1회 호출해야 한다');
  assert.equal(menu.isAwaitingSettingsClose(), true, '설정 열림 뒤 닫힘 복원을 대기해야 한다');
});

test('settings-closed: 모달 닫힘 알림 → 설정 버튼 포커스 복원', () => {
  const restartBtn = makeButton();
  const settingsBtn = makeButton();
  const menu = createGameOverMenu({
    restartBtn,
    settingsBtn,
    onRestart: () => {},
    onSettings: () => {},
  });
  settingsBtn.dispatch('click');
  const restored = menu.notifySettingsClosed();
  assert.equal(restored, true);
  assert.equal(settingsBtn.focusCount, 1, '설정 닫힘 시 포커스가 설정 버튼으로 복원되어야 한다');
  assert.equal(menu.isAwaitingSettingsClose(), false, '복원 후 대기 플래그는 해제되어야 한다');
});

test('settings-closed 가드: 설정을 열지 않았으면 포커스를 강제 이동하지 않는다', () => {
  const restartBtn = makeButton();
  const settingsBtn = makeButton();
  const menu = createGameOverMenu({
    restartBtn,
    settingsBtn,
    onRestart: () => {},
    onSettings: () => {},
  });
  const restored = menu.notifySettingsClosed();
  assert.equal(restored, false);
  assert.equal(settingsBtn.focusCount, 0);
});

// ── bootstrapGameOverMenu: 기존 window 핸들러 재사용 배선 ─────
test('bootstrap: 버튼을 window.doRestart / window.openSettingsModal 에 재배선', () => {
  const restartBtn = makeButton();
  const settingsBtn = makeButton();
  const settingsModal = makeButton();
  const elements = {
    'gameover-restart-btn': restartBtn,
    'gameover-settings-btn': settingsBtn,
    'settings-modal': settingsModal,
  };
  let restarts = 0;
  let opens = 0;
  const fakeDoc = { getElementById: (id) => elements[id] || null };
  const fakeWin = {
    doRestart: () => { restarts++; },
    openSettingsModal: () => { opens++; },
    // MutationObserver 미제공 → observer 배선은 건너뛰되 클릭 배선은 동작해야 함
  };
  const menu = bootstrapGameOverMenu(fakeDoc, fakeWin);
  assert.ok(menu, '버튼이 존재하면 메뉴가 배선되어야 한다');
  restartBtn.dispatch('click');
  settingsBtn.dispatch('click');
  assert.equal(restarts, 1, '다시하기 → window.doRestart 재사용');
  assert.equal(opens, 1, '설정 → window.openSettingsModal 재사용');
});

test('bootstrap: 버튼이 없으면 null 을 반환하고 예외를 던지지 않는다', () => {
  const fakeDoc = { getElementById: () => null };
  const menu = bootstrapGameOverMenu(fakeDoc, {});
  assert.equal(menu, null);
});

// ── index.html 정적 마크업 계약 (frozen exact) ───────────────
test('index.html: .gameover-menu 컨테이너에 두 버튼이 존재한다', () => {
  assert.match(INDEX_HTML, /class="gameover-menu"/, '.gameover-menu 컨테이너가 있어야 한다');
  assert.match(INDEX_HTML, /id="gameover-restart-btn"/, '다시하기 버튼 id');
  assert.match(INDEX_HTML, /id="gameover-settings-btn"/, '설정 버튼 id');
  assert.match(INDEX_HTML, /class="gameover-btn"[^>]*id="gameover-restart-btn"|id="gameover-restart-btn"[^>]*class="gameover-btn"/);
});

test('index.html: aria-label 이 frozen 계약과 정확히 일치한다', () => {
  assert.match(INDEX_HTML, /aria-label="다시하기 \(Space\)"/, '다시하기 aria-label');
  assert.match(INDEX_HTML, /aria-label="설정 \(S\)"/, '설정 aria-label');
});

test('index.html: kbd 키 배지(.gameover-btn__key)로 Space/S 를 노출한다', () => {
  assert.match(INDEX_HTML, /class="gameover-btn__key"[^>]*>\s*Space\s*</, 'Space kbd 배지');
  assert.match(INDEX_HTML, /class="gameover-btn__key"[^>]*>\s*S\s*</, 'S kbd 배지');
});

test('index.html: snake.js 를 module 로 로드한다', () => {
  assert.match(INDEX_HTML, /<script[^>]*type="module"[^>]*src="\.\/snake\.js"|<script[^>]*src="\.\/snake\.js"[^>]*type="module"/);
});

test('index.html: 최종 점수·아이템 블록 등 기존 요소가 보존된다', () => {
  assert.match(INDEX_HTML, /id="go-score"/, '최종 점수 블록 보존');
  assert.match(INDEX_HTML, /id="go-item-stats"/, '아이템 획득 현황 블록 보존');
  assert.match(INDEX_HTML, /id="go-new-record"/, '신기록 배지 보존');
  assert.match(INDEX_HTML, /id="go-play-time"/, '플레이 시간 보존');
  assert.match(INDEX_HTML, /id="paused-overlay"/, '일시정지 오버레이 보존');
});

// ── styles.css: design token & 반응형 계약 ───────────────────
test('styles.css: gameover 메뉴 design token 이 exact 값으로 정의된다', () => {
  assert.match(STYLES_CSS, /--gameover-menu-gap:\s*12px/);
  assert.match(STYLES_CSS, /--gameover-btn-padding:\s*10px 20px/);
  assert.match(STYLES_CSS, /--gameover-btn-min-width:\s*120px/);
});

test('styles.css: .gameover-menu 는 pointer-events 를 재활성화한다(오버레이 none 상쇄)', () => {
  assert.match(STYLES_CSS, /\.gameover-menu\s*\{[^}]*pointer-events:\s*auto/s);
});

test('styles.css: .gameover-btn 최소폭과 좁은 화면 세로 접힘 반응형이 정의된다', () => {
  assert.match(STYLES_CSS, /\.gameover-btn\s*\{[^}]*min-width:\s*var\(--gameover-btn-min-width\)/s);
  assert.match(STYLES_CSS, /@media[^{]*max-width[^{]*\)/, '좁은 화면 media query');
});
