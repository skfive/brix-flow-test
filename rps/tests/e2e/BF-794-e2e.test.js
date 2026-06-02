/* rps/tests/e2e/BF-794-e2e.test.js — 가위바위보 BF-792 회귀 가드
 * BF-794 · tester 페르소나 · node --test rps/tests/e2e/BF-794-e2e.test.js
 *
 * 보호 대상 (BF-794 수용 기준):
 *   AC1. 버튼 3종(가위·바위·보) 클릭 + 키보드 R/P/S + Esc 초기화 → 모두 통과
 *   AC2. judge 9조합 일관성(인라인 verify) + UI 상호작용 + 전적 누적 자동 검증
 *   AC3. focused scope 시 다른 module skip
 *
 * BF-792 신규 산출물 — BF-650 이 검증하지 않는 항목:
 *   - index.html: judge.js + game.js 로딩 순서 (main.js 교체 확인)
 *   - game.js: R(바위)/P(보)/S(가위)/Esc(초기화) 신규 단축키 (BF-650 은 1/2/3/R)
 *   - judge.js: globalThis.RpsJudge UMD 등록
 *   - game.js / judge.js CORS 안전 (fetch/import 미사용)
 *   - thinking 중 중복 입력 차단 race condition 가드
 *
 * dev(BF-792)가 이미 검증한 항목 — 재작성 X:
 *   - judge() 9조합 판정 (rps/judge.test.js)
 *   - CHOICES 3종 상수 (rps/judge.test.js)
 */
"use strict";

const test   = require("node:test");
const assert = require("node:assert/strict");
const fs     = require("node:fs");
const path   = require("node:path");
const http   = require("node:http");

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 rps 외 skip
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "rps";
if (
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE
) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
  module.exports = {};
  return;
}

// __dirname = rps/tests/e2e/
const RPS_DIR   = path.resolve(__dirname, "../..");   // rps/
const REPO_ROOT = path.resolve(RPS_DIR,   "..");      // 저장소 루트

// ─────────────────────────────────────────────────────────────
// 정적 가드 1 — index.html 스크립트 로딩 순서 (BF-792 신규 구조)
// ─────────────────────────────────────────────────────────────
test("BF-792 HTML — judge.js 가 game.js 보다 먼저 로드됨", () => {
  const html      = fs.readFileSync(path.join(RPS_DIR, "index.html"), "utf-8");
  const judgePos  = html.indexOf('src="judge.js"');
  const gamePos   = html.indexOf('src="game.js"');
  assert.ok(judgePos !== -1, 'index.html 에 judge.js script 없음');
  assert.ok(gamePos  !== -1, 'index.html 에 game.js script 없음');
  assert.ok(
    judgePos < gamePos,
    `judge.js 가 game.js 보다 나중에 위치함 — 로딩 순서 위반 (game.js 가 RpsJudge 에 의존)`
  );
});

test("BF-792 HTML — main.js 는 로드하지 않음 (교체 완료 확인)", () => {
  const html = fs.readFileSync(path.join(RPS_DIR, "index.html"), "utf-8");
  assert.ok(
    !html.includes('src="main.js"'),
    'index.html 이 main.js 를 여전히 로드함 — BF-792 game.js 교체 미완료'
  );
});

// ─────────────────────────────────────────────────────────────
// 정적 가드 2 — game.js CORS 안전 (BF-792 신규 파일)
// ─────────────────────────────────────────────────────────────
test("BF-792 game.js CORS 안전 — fetch() 미사용", () => {
  const src = fs.readFileSync(path.join(RPS_DIR, "game.js"), "utf-8");
  assert.ok(!src.includes("fetch("), "game.js 에 fetch() 발견 — file:// CORS 위반");
});

test("BF-792 game.js CORS 안전 — import 문 미사용", () => {
  const src = fs.readFileSync(path.join(RPS_DIR, "game.js"), "utf-8");
  // "import " 로 시작하는 ES module import 구문 체크
  assert.ok(
    !src.match(/^import\s/m),
    "game.js 에 ES import 구문 발견 — file:// CORS 위반"
  );
});

// ─────────────────────────────────────────────────────────────
// 정적 가드 3 — judge.js UMD 등록 (globalThis.RpsJudge)
// ─────────────────────────────────────────────────────────────
test("BF-792 judge.js — globalThis.RpsJudge UMD 등록 패턴 존재", () => {
  const src = fs.readFileSync(path.join(RPS_DIR, "judge.js"), "utf-8");
  assert.ok(src.includes("RpsJudge"),       "judge.js 에 RpsJudge 노출 없음");
  assert.ok(src.includes("module.exports"), "judge.js 에 CommonJS exports 없음 (UMD 미사용)");
});

// ─────────────────────────────────────────────────────────────
// 정적 가드 4 — game.js 키보드 단축키 코드 정의 (R/P/S/Esc)
// BF-792 신규 단축키: 구현 코드에 r/p/s/Escape 리스너 존재 확인
// ─────────────────────────────────────────────────────────────
test("BF-792 game.js — R/P/S/Esc 단축키 핸들러 코드 존재", () => {
  const src = fs.readFileSync(path.join(RPS_DIR, "game.js"), "utf-8");
  assert.ok(
    src.includes('"r"') || src.includes("'r'"),
    "game.js 에 'r' 단축키 핸들러 없음 — R(바위) 동작 불가"
  );
  assert.ok(
    src.includes('"p"') || src.includes("'p'"),
    "game.js 에 'p' 단축키 핸들러 없음 — P(보) 동작 불가"
  );
  assert.ok(
    src.includes('"s"') || src.includes("'s'"),
    "game.js 에 's' 단축키 핸들러 없음 — S(가위) 동작 불가"
  );
  assert.ok(
    src.includes("escape") || src.includes("Escape"),
    "game.js 에 Escape 핸들러 없음 — Esc(초기화) 동작 불가"
  );
});

// ─────────────────────────────────────────────────────────────
// E2E AC1~AC2 — 버튼 3종·키보드 R/P/S·Esc 초기화·전적 누적
//
// BF-792 신규 사항:
//   - 키보드 R → rock  (BF-650 은 '2')
//   - 키보드 P → paper (BF-650 은 '3')
//   - 키보드 S → scissors (BF-650 은 '1')
//   - 키보드 Esc → 초기화 (BF-650 은 'R')
//   - judge inline consistency 검증 (AC2)
// ─────────────────────────────────────────────────────────────
test(
  "BF-794 E2E AC1~AC2 — 버튼 3종·키보드 R/P/S·Esc 초기화·전적 누적·결과 일관성",
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server   = await startStaticServer(REPO_ROOT);
    const port     = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/rps/`;

      // 인라인 judge — 브라우저 scriptText 에 삽입해 결과 일관성 검증 (AC2)
      const inlineJudge = `
function judgeInline(player, cpu) {
  if (player === cpu) return 'draw';
  if ((player === 'scissors' && cpu === 'paper') ||
      (player === 'rock'     && cpu === 'scissors') ||
      (player === 'paper'    && cpu === 'rock')) return 'win';
  return 'lose';
}
      `;

      const scriptText = `
${inlineJudge}

// 0. localStorage 정리 + 페이지 초기화
await page.evaluate(function() {
  ['rps:score', 'rps:theme'].forEach(function(k) { localStorage.removeItem(k); });
});
await page.reload();
await page.waitForSelector('[data-choice="rock"]');

// ── step1. 초기 상태 검증 ──────────────────────────────────────────────
var init = await page.evaluate(function() {
  return {
    gameState:    document.getElementById('game').dataset.gameState,
    bannerResult: document.getElementById('result-banner').dataset.result,
    countWin:     document.getElementById('count-win').textContent,
    countDraw:    document.getElementById('count-draw').textContent,
    countLose:    document.getElementById('count-lose').textContent,
    playerState:  document.getElementById('player-card').dataset.state,
    cpuState:     document.getElementById('cpu-card').dataset.state,
  };
});
if (init.gameState !== 'idle')    throw new Error('[step1] 초기 game-state != idle: '    + init.gameState);
if (init.bannerResult !== 'none') throw new Error('[step1] 초기 result-banner != none: ' + init.bannerResult);
if (init.countWin !== '0' || init.countDraw !== '0' || init.countLose !== '0') {
  throw new Error('[step1] 초기 점수 != 0: ' + JSON.stringify(init));
}
if (init.playerState !== 'idle' || init.cpuState !== 'idle') {
  throw new Error('[step1] 초기 카드 state != idle: player=' + init.playerState + ' cpu=' + init.cpuState);
}
console.log('[step1] 초기 idle/none/0/0/0 OK');

// ── step2. 가위 버튼 클릭 (AC1 버튼 클릭) ─────────────────────────────
await page.click('[data-choice="scissors"]');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterScissors = await page.evaluate(function() {
  return {
    playerChoice: document.getElementById('player-card').dataset.choice,
    cpuChoice:    document.getElementById('cpu-card').dataset.choice,
    gameState:    document.getElementById('game').dataset.gameState,
    bannerResult: document.getElementById('result-banner').dataset.result,
    countTotal:   parseInt(document.getElementById('count-win').textContent)   +
                  parseInt(document.getElementById('count-draw').textContent)  +
                  parseInt(document.getElementById('count-lose').textContent),
    stored:       localStorage.getItem('rps:score'),
  };
});
if (afterScissors.playerChoice !== 'scissors') {
  throw new Error('[step2] 가위 클릭 후 player-choice != scissors: ' + afterScissors.playerChoice);
}
if (!['result-win','result-draw','result-lose'].includes(afterScissors.gameState)) {
  throw new Error('[step2] game-state 이상: ' + afterScissors.gameState);
}
var expS = judgeInline('scissors', afterScissors.cpuChoice);
if (afterScissors.bannerResult !== expS) {
  throw new Error('[step2] 결과 불일치: player=scissors cpu=' + afterScissors.cpuChoice +
                  ' expected=' + expS + ' got=' + afterScissors.bannerResult);
}
if (afterScissors.countTotal !== 1) {
  throw new Error('[step2] 1라운드 후 점수 총합 != 1: ' + afterScissors.countTotal);
}
if (!afterScissors.stored) throw new Error('[step2] rps:score localStorage 저장 없음');
console.log('[step2] 가위 클릭 → ' + expS + ' + 점수 1 + localStorage OK');

// ── step3. 키보드 R → rock (BF-792 신규 단축키, BF-650 은 '2' 키) ──────
await page.keyboard.press('r');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterKeyR = await page.evaluate(function() {
  return {
    playerChoice: document.getElementById('player-card').dataset.choice,
    cpuChoice:    document.getElementById('cpu-card').dataset.choice,
    bannerResult: document.getElementById('result-banner').dataset.result,
    gameState:    document.getElementById('game').dataset.gameState,
  };
});
if (afterKeyR.playerChoice !== 'rock') {
  throw new Error('[step3] 키 R 후 player-choice != rock: ' + afterKeyR.playerChoice);
}
var expR = judgeInline('rock', afterKeyR.cpuChoice);
if (afterKeyR.bannerResult !== expR) {
  throw new Error('[step3] 키 R 결과 불일치: player=rock cpu=' + afterKeyR.cpuChoice +
                  ' expected=' + expR + ' got=' + afterKeyR.bannerResult);
}
if (!['result-win','result-draw','result-lose'].includes(afterKeyR.gameState)) {
  throw new Error('[step3] 키 R 후 game-state 이상: ' + afterKeyR.gameState);
}
console.log('[step3] 키보드 R → rock → ' + expR + ' OK (BF-792 신규 단축키)');

// ── step4. 키보드 P → paper (BF-792 신규 단축키, BF-650 은 '3' 키) ─────
await page.keyboard.press('p');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterKeyP = await page.evaluate(function() {
  return {
    playerChoice: document.getElementById('player-card').dataset.choice,
    cpuChoice:    document.getElementById('cpu-card').dataset.choice,
    bannerResult: document.getElementById('result-banner').dataset.result,
  };
});
if (afterKeyP.playerChoice !== 'paper') {
  throw new Error('[step4] 키 P 후 player-choice != paper: ' + afterKeyP.playerChoice);
}
var expP = judgeInline('paper', afterKeyP.cpuChoice);
if (afterKeyP.bannerResult !== expP) {
  throw new Error('[step4] 키 P 결과 불일치: player=paper cpu=' + afterKeyP.cpuChoice +
                  ' expected=' + expP + ' got=' + afterKeyP.bannerResult);
}
console.log('[step4] 키보드 P → paper → ' + expP + ' OK (BF-792 신규 단축키)');

// ── step5. 키보드 S → scissors (BF-792 신규 단축키, BF-650 은 '1' 키) ──
await page.keyboard.press('s');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterKeyS = await page.evaluate(function() {
  return {
    playerChoice: document.getElementById('player-card').dataset.choice,
    cpuChoice:    document.getElementById('cpu-card').dataset.choice,
    bannerResult: document.getElementById('result-banner').dataset.result,
  };
});
if (afterKeyS.playerChoice !== 'scissors') {
  throw new Error('[step5] 키 S 후 player-choice != scissors: ' + afterKeyS.playerChoice);
}
var expS2 = judgeInline('scissors', afterKeyS.cpuChoice);
if (afterKeyS.bannerResult !== expS2) {
  throw new Error('[step5] 키 S 결과 불일치: player=scissors cpu=' + afterKeyS.cpuChoice +
                  ' expected=' + expS2 + ' got=' + afterKeyS.bannerResult);
}
console.log('[step5] 키보드 S → scissors → ' + expS2 + ' OK (BF-792 신규 단축키)');

// ── step6. 4라운드 누적 전적 검증 (AC2 — scissors/R/P/S = 4라운드) ──────
var score4 = await page.evaluate(function() {
  return {
    win:    parseInt(document.getElementById('count-win').textContent),
    draw:   parseInt(document.getElementById('count-draw').textContent),
    lose:   parseInt(document.getElementById('count-lose').textContent),
    stored: localStorage.getItem('rps:score'),
  };
});
var total4 = score4.win + score4.draw + score4.lose;
if (total4 !== 4) throw new Error('[step6] 4라운드 후 점수 총합 != 4: ' + total4);
if (!score4.stored) throw new Error('[step6] rps:score localStorage 없음');
var storedParsed = JSON.parse(score4.stored);
if (storedParsed.win + storedParsed.draw + storedParsed.lose !== 4) {
  throw new Error('[step6] localStorage 저장값 총합 != 4: ' + score4.stored);
}
console.log('[step6] 4라운드 전적 총합=4 + localStorage 저장 OK: ' + JSON.stringify(score4));

// ── step7. 바위 버튼 클릭 확인 (AC1 버튼 3종 완성) ───────────────────
await page.click('[data-choice="rock"]');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterRock = await page.evaluate(function() {
  return { playerChoice: document.getElementById('player-card').dataset.choice };
});
if (afterRock.playerChoice !== 'rock') {
  throw new Error('[step7] rock 버튼 클릭 후 player-choice != rock: ' + afterRock.playerChoice);
}
console.log('[step7] rock 버튼 클릭 OK');

// 리셋 버튼으로 초기화 후 보 버튼 테스트
await page.click('#reset-btn');
await new Promise(function(r) { setTimeout(r, 100); });

await page.click('[data-choice="paper"]');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterPaper = await page.evaluate(function() {
  return { playerChoice: document.getElementById('player-card').dataset.choice };
});
if (afterPaper.playerChoice !== 'paper') {
  throw new Error('[step7] paper 버튼 클릭 후 player-choice != paper: ' + afterPaper.playerChoice);
}
console.log('[step7] paper 버튼 클릭 OK — AC1 버튼 3종(가위/바위/보) 모두 검증 완료');

// ── step8. Esc 키 → 점수 초기화 (BF-792 신규, BF-650 은 'R' 키) ───────
await page.keyboard.press('Escape');
await new Promise(function(r) { setTimeout(r, 200); });
var afterEsc = await page.evaluate(function() {
  return {
    gameState:    document.getElementById('game').dataset.gameState,
    bannerResult: document.getElementById('result-banner').dataset.result,
    countWin:     parseInt(document.getElementById('count-win').textContent),
    countDraw:    parseInt(document.getElementById('count-draw').textContent),
    countLose:    parseInt(document.getElementById('count-lose').textContent),
    playerChoice: document.getElementById('player-card').dataset.choice,
    cpuChoice:    document.getElementById('cpu-card').dataset.choice,
    stored:       localStorage.getItem('rps:score'),
  };
});
if (afterEsc.gameState !== 'idle') {
  throw new Error('[step8] Esc 후 game-state != idle: ' + afterEsc.gameState);
}
if (afterEsc.bannerResult !== 'none') {
  throw new Error('[step8] Esc 후 result-banner != none: ' + afterEsc.bannerResult);
}
if (afterEsc.countWin !== 0 || afterEsc.countDraw !== 0 || afterEsc.countLose !== 0) {
  throw new Error('[step8] Esc 후 점수 != 0: win=' + afterEsc.countWin +
                  ' draw=' + afterEsc.countDraw + ' lose=' + afterEsc.countLose);
}
if (afterEsc.playerChoice !== 'none') {
  throw new Error('[step8] Esc 후 player-card.choice != none: ' + afterEsc.playerChoice);
}
if (afterEsc.cpuChoice !== 'none') {
  throw new Error('[step8] Esc 후 cpu-card.choice != none: ' + afterEsc.cpuChoice);
}
var escScore = JSON.parse(afterEsc.stored || '{"win":0,"draw":0,"lose":0}');
if (escScore.win !== 0 || escScore.draw !== 0 || escScore.lose !== 0) {
  throw new Error('[step8] Esc 후 localStorage rps:score != 0: ' + afterEsc.stored);
}
console.log('[step8] Esc 키 → 점수 0/0/0 + idle + 카드 none + localStorage 초기화 OK (BF-792 신규 단축키)');

// cleanup
await page.evaluate(function() {
  ['rps:score', 'rps:theme'].forEach(function(k) { localStorage.removeItem(k); });
});
console.log('[done] BF-794 E2E AC1~AC2 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label:     "가위바위보 BF-792 — 버튼3종·키R/P/S·Esc초기화·전적누적·결과일관성 (BF-794 AC1~AC2)",
          scriptText,
          timeoutMs: 90000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner ok=false: ${JSON.stringify(json).slice(0, 500)}`
      );
      assert.ok(
        json.passed,
        `E2E AC1~AC2 시나리오 실패 — stdout: ${String(json.stdout ?? "").slice(-2500)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// E2E — thinking 중 중복 입력 차단 (race condition 회귀 가드)
// game-state=thinking 일 때 추가 클릭·키보드 입력 무시 확인
// ─────────────────────────────────────────────────────────────
test(
  "BF-794 E2E — thinking 상태 중 중복 입력 차단 (race condition 가드)",
  async (t) => {
    if (process.env.BRIX_E2E_SKIP === "1") {
      t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
      return;
    }
    if (!(await e2eRunnerReachable(t))) return;

    const server   = await startStaticServer(REPO_ROOT);
    const port     = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/rps/`;

      const scriptText = `
await page.evaluate(function() {
  ['rps:score', 'rps:theme'].forEach(function(k) { localStorage.removeItem(k); });
});
await page.reload();
await page.waitForSelector('[data-choice="rock"]');

// rock 클릭 → thinking 상태 진입
await page.click('[data-choice="rock"]');
await new Promise(function(r) { setTimeout(r, 80); }); // thinking 확인 타이밍

var thinkingState = await page.evaluate(function() {
  return document.getElementById('game').dataset.gameState;
});
if (thinkingState !== 'thinking') {
  throw new Error('rock 클릭 직후 game-state != thinking: ' + thinkingState + ' (타이밍 조정 필요)');
}

// thinking 중 paper.click() — JS 직접 호출 (CSS pointer-events 우회, JS 로직 검증)
// play() 함수의 if (game.dataset.gameState === 'thinking') return; 체크 대상
await page.evaluate(function() {
  document.querySelector('[data-choice="paper"]').click();
});

// thinking 중 키보드 S 입력 — CDP 키 이벤트 (pointer-events 무관, JS 핸들러 직접 테스트)
await page.keyboard.press('s');

// rock 게임 완료 대기 (500ms thinking + 200ms result + 400ms 여유 = 1100ms)
await new Promise(function(r) { setTimeout(r, 1100); });

var afterThinking = await page.evaluate(function() {
  return {
    playerChoice: document.getElementById('player-card').dataset.choice,
    gameState:    document.getElementById('game').dataset.gameState,
    countTotal:   parseInt(document.getElementById('count-win').textContent)  +
                  parseInt(document.getElementById('count-draw').textContent) +
                  parseInt(document.getElementById('count-lose').textContent),
  };
});
// paper / scissors 로 override 되지 않고 rock 유지
if (afterThinking.playerChoice !== 'rock') {
  throw new Error('thinking 중 입력이 무시되지 않음 — player-choice=' + afterThinking.playerChoice +
                  ' (기대: rock). play() 의 thinking guard 미동작.');
}
// 정확히 1회만 판정 (rock 게임 1회)
if (afterThinking.countTotal !== 1) {
  throw new Error('thinking 중 중복 입력으로 판정 2회 발생 — countTotal=' + afterThinking.countTotal);
}
if (!['result-win','result-draw','result-lose'].includes(afterThinking.gameState)) {
  throw new Error('결과 후 game-state 이상: ' + afterThinking.gameState);
}
console.log('[ok] thinking 중 JS click + 키보드 차단 OK — player-choice=rock 유지, 판정 1회');

// cleanup
await page.evaluate(function() {
  ['rps:score', 'rps:theme'].forEach(function(k) { localStorage.removeItem(k); });
});
console.log('[done] BF-794 E2E thinking 입력 차단 PASS');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
        },
        body: JSON.stringify({
          url,
          label:     "가위바위보 BF-792 — thinking 중 중복 입력 차단 race condition 가드 (BF-794)",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(
        json.ok,
        `e2e-runner ok=false: ${JSON.stringify(json).slice(0, 500)}`
      );
      assert.ok(
        json.passed,
        `E2E thinking 차단 실패 — stdout: ${String(json.stdout ?? "").slice(-1500)}`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 헬퍼들
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인.
 * 못 닿으면 t.skip() + false 반환 — hookFail 패턴 금지 (CI 결정성 가드).
 */
async function e2eRunnerReachable(t) {
  try {
    const probe = await fetch("http://e2e-runner:3030/health", {
      signal: AbortSignal.timeout(2000),
    });
    if (!probe.ok) {
      t.skip(`e2e-runner unhealthy (${probe.status}) — skip`);
      return false;
    }
    return true;
  } catch (err) {
    t.skip(`e2e-runner 도달 불가 (${err.message}) — CI 환경 정상`);
    return false;
  }
}

/**
 * 페르소나 컨테이너 hostname.
 * e2e-runner 가 정적 서버에 도달할 때 사용 — localhost 금지.
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 파일 서버 (임의 포트 — 동시 실행 충돌 회피).
 */
function startStaticServer(rootDir) {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".png":  "image/png",
    ".svg":  "image/svg+xml",
    ".json": "application/json",
  };
  const server = http.createServer(function (req, res) {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const resolved = path.resolve(path.join(rootDir, urlPath));
      if (!resolved.startsWith(path.resolve(rootDir))) {
        res.statusCode = 403;
        res.end("forbidden");
        return;
      }
      fs.readFile(resolved, function (err, data) {
        if (err) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const ext = path.extname(resolved);
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        res.end(data);
      });
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });
  return new Promise(function (resolve) {
    server.listen(0, "0.0.0.0", function () { resolve(server); });
  });
}
