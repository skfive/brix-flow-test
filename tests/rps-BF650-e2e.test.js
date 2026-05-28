// BF-650 · 가위바위보 게임 E2E 회귀 가드 (worker host)
//
// 본 파일은 BF-648 dev 산출물 (rps/ 모듈) 이 main 에 들어간 후
// silent break 되지 않도록, e2e-runner 컨테이너로 worker host URL 에 접근해
// AC 의 전체 사용자 시나리오를 구동한다.
//
// 보호 대상 (BF-650 수용 기준):
//   AC1. 가위/바위/보 선택 버튼 클릭 → 플레이어 카드 revealed + CPU thinking →
//        CPU 카드 revealed + 결과 배너 표시 → 점수 누적 + localStorage 저장
//   AC2. 무승부/승/패 각 케이스 검증 — player·cpu 실제 선택을 읽어 인라인 judge
//        로직과 결과 배너 일치 여부 확인 (consistency check).
//        최대 20 라운드 순환 플레이로 win/draw/lose 3종 관찰을 보장.
//   AC3. 리셋 버튼 → 점수 0/0/0 + 카드 idle + 배너 none + localStorage 초기화
//   AC4. 키보드 단축키 1(가위)/2(바위)/3(보)/R(초기화) 동작
//   AC5. 새로고침 후 점수 복원 (rps:score localStorage round-trip)
//   AC6. 페이지 부팅~전체 시나리오 console.error / unhandledrejection / pageerror 0건
//
// dev (BF-648) 가 이미 검증한 항목 — 재작성 X:
//   - logic.js 단위: CHOICES/RESULTS 상수, judge() 9종, cpuPick() 유효성/균형성,
//     createScoreStore() save/load/reset/round-trip/손상값 fallback
//
// 정적 가드 (file system — e2e-runner 불필요):
//   - index.html 필수 id·data-choice selector 존재
//   - CORS 안전: <script type="module"> 미사용, fetch() 미사용
//
// AC2 결정적 트리거 설계 근거:
//   Math.random 직접 override 는 e2e-runner puppeteer 컨텍스트에서 race 발생
//   확인 (이전 세션 실패). evaluateOnNewDocument 는 해당 puppeteer 미지원 확인.
//   → player·cpu 실제 DOM 값을 읽어 인라인 judge 결과와 비교하는 consistency
//      검증으로 대체. 20 라운드 순환 플레이로 3종 outcome 관찰 보장.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 rps 외 skip
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "rps";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const RPS_DIR   = path.join(REPO_ROOT, "rps");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 1 — HTML 마크업 계약 (key ID / data-choice 선택자)
  // ─────────────────────────────────────────────────────────────
  test("RPS HTML 마크업 계약 — 필수 id/data-choice 선택자 존재", () => {
    const html = fs.readFileSync(path.join(RPS_DIR, "index.html"), "utf-8");

    // 게임 루트
    assert.ok(html.includes('id="game"'),         '#game 없음');
    assert.ok(html.includes('data-game-state'),    'data-game-state 속성 없음');

    // 카드 영역
    assert.ok(html.includes('id="player-card"'),  '#player-card 없음');
    assert.ok(html.includes('id="cpu-card"'),      '#cpu-card 없음');
    assert.ok(html.includes('id="player-icon"'),  '#player-icon 없음');
    assert.ok(html.includes('id="cpu-icon"'),      '#cpu-icon 없음');
    assert.ok(html.includes('id="player-name"'),  '#player-name 없음');
    assert.ok(html.includes('id="cpu-name"'),      '#cpu-name 없음');

    // 결과 배너
    assert.ok(html.includes('id="result-banner"'), '#result-banner 없음');
    assert.ok(html.includes('id="result-icon"'),   '#result-icon 없음');
    assert.ok(html.includes('id="result-text"'),   '#result-text 없음');

    // 점수판
    assert.ok(html.includes('id="count-win"'),    '#count-win 없음');
    assert.ok(html.includes('id="count-draw"'),   '#count-draw 없음');
    assert.ok(html.includes('id="count-lose"'),   '#count-lose 없음');

    // 선택 버튼 3종
    assert.ok(html.includes('data-choice="scissors"'), 'scissors 버튼 없음');
    assert.ok(html.includes('data-choice="rock"'),     'rock 버튼 없음');
    assert.ok(html.includes('data-choice="paper"'),    'paper 버튼 없음');

    // 리셋 + 테마 버튼
    assert.ok(html.includes('id="reset-btn"'),    '#reset-btn 없음');
    assert.ok(html.includes('id="theme-btn"'),    '#theme-btn 없음');
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 2 — CORS 안전 (file:// 호환)
  // ─────────────────────────────────────────────────────────────
  test('RPS CORS 안전 — <script type="module"> 미사용', () => {
    const html = fs.readFileSync(path.join(RPS_DIR, "index.html"), "utf-8");
    assert.ok(
      !html.includes('type="module"') && !html.includes("type='module'"),
      'index.html 에 <script type="module"> 발견 — file:// CORS 위반'
    );
  });

  test("RPS CORS 안전 — fetch() 미사용 (main.js + logic.js)", () => {
    const main  = fs.readFileSync(path.join(RPS_DIR, "main.js"),  "utf-8");
    const logic = fs.readFileSync(path.join(RPS_DIR, "logic.js"), "utf-8");
    assert.ok(!main.includes("fetch("),  "main.js 에 fetch() 사용됨 — file:// CORS 위반");
    assert.ok(!logic.includes("fetch("), "logic.js 에 fetch() 사용됨 — file:// CORS 위반");
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 3 — UMD 패턴 (globalThis.RpsLogic 등록)
  // ─────────────────────────────────────────────────────────────
  test("RPS logic.js — UMD globalThis.RpsLogic 등록 패턴 존재", () => {
    const logic = fs.readFileSync(path.join(RPS_DIR, "logic.js"), "utf-8");
    assert.ok(logic.includes("RpsLogic"),       "logic.js 에 RpsLogic 노출 코드 없음");
    assert.ok(logic.includes("module.exports"), "logic.js 에 CommonJS exports 없음 (UMD 누락)");
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC1~AC5 — 게임 플로우 전체
  //   버튼 클릭 → 결과 표시 → 점수 누적 → 승/무/패 일관성 → 리셋 →
  //   키보드 단축키 → 새로고침 복원 → 테마 토글
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-650 E2E AC1~AC5: 버튼 클릭→결과→점수 누적→승무패 일관성→리셋→키보드→새로고침 복원→테마",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port   = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/rps/`;

        // ── 인라인 judge 로직 (AC2 일관성 검증용) ──────────────────────────
        // logic.js 의 judge() 와 동일한 규칙. 이 테스트 파일 안에서만 사용.
        const judgeInline = `
function judgeInline(player, cpu) {
  if (player === cpu) return 'draw';
  if ((player === 'scissors' && cpu === 'paper') ||
      (player === 'rock'     && cpu === 'scissors') ||
      (player === 'paper'    && cpu === 'rock')) return 'win';
  return 'lose';
}
        `;

        const scriptText = `
${judgeInline}

// 0. clean + reload
await page.evaluate(function() {
  var toRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('rps:')) toRemove.push(k);
  }
  toRemove.forEach(function(k) { localStorage.removeItem(k); });
});
await page.reload();
await page.waitForSelector('[data-choice="rock"]');

// 1. 초기 상태 검증
var initial = await page.evaluate(function() {
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
if (initial.gameState    !== 'idle') throw new Error('초기 game-state !== idle: '    + initial.gameState);
if (initial.bannerResult !== 'none') throw new Error('초기 result-banner !== none: ' + initial.bannerResult);
if (initial.countWin     !== '0')    throw new Error('초기 count-win != 0: '         + initial.countWin);
if (initial.countDraw    !== '0')    throw new Error('초기 count-draw != 0: '        + initial.countDraw);
if (initial.countLose    !== '0')    throw new Error('초기 count-lose != 0: '        + initial.countLose);
if (initial.playerState  !== 'idle') throw new Error('초기 player-card state !== idle');
if (initial.cpuState     !== 'idle') throw new Error('초기 cpu-card state !== idle');
console.log('[step1] 초기 idle/none/0/0/0 OK');

// 2. 바위 클릭 → 플레이어 카드 즉시 revealed + game=thinking (AC1)
await page.click('[data-choice="rock"]');
await new Promise(function(r) { setTimeout(r, 80); });
var afterClick = await page.evaluate(function() {
  return {
    playerState:  document.getElementById('player-card').dataset.state,
    playerChoice: document.getElementById('player-card').dataset.choice,
    gameState:    document.getElementById('game').dataset.gameState,
  };
});
if (afterClick.playerState  !== 'revealed') throw new Error('클릭 후 player-card state !== revealed: ' + afterClick.playerState);
if (afterClick.playerChoice !== 'rock')     throw new Error('player-card choice !== rock: '              + afterClick.playerChoice);
if (afterClick.gameState    !== 'thinking') throw new Error('클릭 후 game-state !== thinking: '          + afterClick.gameState);
console.log('[step2] 바위 클릭 → player revealed + thinking 상태 OK (AC1)');

// 3. 결과 대기 (500ms thinking + 200ms result + 400ms 안전 마진 = 1100ms)
await new Promise(function(r) { setTimeout(r, 1100); });
var afterResult = await page.evaluate(function() {
  var gs           = document.getElementById('game').dataset.gameState;
  var bannerResult = document.getElementById('result-banner').dataset.result;
  var resultText   = document.getElementById('result-text').textContent;
  var cpuState     = document.getElementById('cpu-card').dataset.state;
  var countWin     = parseInt(document.getElementById('count-win').textContent, 10);
  var countDraw    = parseInt(document.getElementById('count-draw').textContent, 10);
  var countLose    = parseInt(document.getElementById('count-lose').textContent, 10);
  var stored       = localStorage.getItem('rps:score');
  return { gs: gs, bannerResult: bannerResult, resultText: resultText,
           cpuState: cpuState, countWin: countWin, countDraw: countDraw,
           countLose: countLose, stored: stored };
});
if (!['result-win','result-draw','result-lose'].includes(afterResult.gs)) {
  throw new Error('결과 후 game-state 가 result-* 가 아님: ' + afterResult.gs);
}
if (!['win','draw','lose'].includes(afterResult.bannerResult)) {
  throw new Error('result-banner data-result 가 win/draw/lose 가 아님: ' + afterResult.bannerResult);
}
if (!afterResult.resultText) throw new Error('result-text 가 비어있음');
if (afterResult.cpuState !== 'revealed') throw new Error('CPU 카드 state !== revealed: ' + afterResult.cpuState);
var total1 = afterResult.countWin + afterResult.countDraw + afterResult.countLose;
if (total1 !== 1) throw new Error('라운드 1회 후 점수 총합 !== 1: ' + total1);
if (!afterResult.stored) throw new Error('rps:score localStorage 에 저장되지 않음');
var storedScore1 = JSON.parse(afterResult.stored);
if (storedScore1.win + storedScore1.draw + storedScore1.lose !== 1) {
  throw new Error('localStorage rps:score 총합 != 1: ' + afterResult.stored);
}
console.log('[step3] 결과 표시 + CPU revealed + 점수 1 + localStorage 저장 OK (AC1)');

// 4. 승/무/패 3종 일관성 검증 (AC2) ─────────────────────────────────────
//    player·cpu 실제 DOM 값을 읽어 인라인 judge 결과와 result-banner 일치 확인.
//    최대 20 라운드 (3종 선택지 순환): win/draw/lose 3종 모두 관찰될 때까지 실행.
//    coupon collector: 기댓값 5.5 라운드. 20회에서 미충족 확률 < 0.1%.

var seenOutcomes = {};
var CHOICES_SEQ = ['scissors', 'rock', 'paper'];
var round = 0;

while (Object.keys(seenOutcomes).length < 3 && round < 20) {
  var playerChoice = CHOICES_SEQ[round % 3];
  await page.click('[data-choice="' + playerChoice + '"]');
  await new Promise(function(r) { setTimeout(r, 1100); });

  var rd = await page.evaluate(function() {
    return {
      playerChoice: document.getElementById('player-card').dataset.choice,
      cpuChoice:    document.getElementById('cpu-card').dataset.choice,
      bannerResult: document.getElementById('result-banner').dataset.result,
      gameState:    document.getElementById('game').dataset.gameState,
    };
  });

  // game-state 확인
  if (!['result-win','result-draw','result-lose'].includes(rd.gameState)) {
    throw new Error('[AC2 round ' + round + '] game-state 이상: ' + rd.gameState);
  }

  // 인라인 judge 와 result-banner 일치 확인 (핵심 regression guard)
  var expected = judgeInline(rd.playerChoice, rd.cpuChoice);
  if (rd.bannerResult !== expected) {
    throw new Error('[AC2 round ' + round + '] 결과 불일치: player=' + rd.playerChoice +
                    ' cpu=' + rd.cpuChoice + ' expected=' + expected + ' got=' + rd.bannerResult);
  }

  seenOutcomes[rd.bannerResult] = true;
  console.log('[AC2 round ' + round + '] ' + rd.playerChoice + ' vs ' + rd.cpuChoice +
              ' → ' + rd.bannerResult + ' ✓ (seen: ' + Object.keys(seenOutcomes).join(',') + ')');
  round++;
}

if (!seenOutcomes['win'])  throw new Error('WIN 케이스가 ' + round + '회 시도 내 미발생');
if (!seenOutcomes['draw']) throw new Error('DRAW 케이스가 ' + round + '회 시도 내 미발생');
if (!seenOutcomes['lose']) throw new Error('LOSE 케이스가 ' + round + '회 시도 내 미발생');
console.log('[step4] AC2 win/draw/lose 3종 모두 관찰 + 결과 일관성 OK (' + round + '라운드)');

// 5. 리셋 버튼 → 점수 0/0/0 + 카드 idle + 배너 none + localStorage 초기화 (AC3)
await page.click('#reset-btn');
await new Promise(function(r) { setTimeout(r, 100); });
var afterReset = await page.evaluate(function() {
  return {
    gameState:    document.getElementById('game').dataset.gameState,
    bannerResult: document.getElementById('result-banner').dataset.result,
    countWin:     parseInt(document.getElementById('count-win').textContent, 10),
    countDraw:    parseInt(document.getElementById('count-draw').textContent, 10),
    countLose:    parseInt(document.getElementById('count-lose').textContent, 10),
    playerState:  document.getElementById('player-card').dataset.state,
    cpuState:     document.getElementById('cpu-card').dataset.state,
    playerChoice: document.getElementById('player-card').dataset.choice,
    cpuChoice:    document.getElementById('cpu-card').dataset.choice,
    stored:       localStorage.getItem('rps:score'),
  };
});
if (afterReset.gameState    !== 'idle') throw new Error('리셋 후 game-state !== idle: '      + afterReset.gameState);
if (afterReset.bannerResult !== 'none') throw new Error('리셋 후 result-banner !== none: '   + afterReset.bannerResult);
if (afterReset.countWin  !== 0) throw new Error('리셋 후 count-win != 0: '  + afterReset.countWin);
if (afterReset.countDraw !== 0) throw new Error('리셋 후 count-draw != 0: ' + afterReset.countDraw);
if (afterReset.countLose !== 0) throw new Error('리셋 후 count-lose != 0: ' + afterReset.countLose);
if (afterReset.playerState  !== 'idle') throw new Error('리셋 후 player-card state !== idle');
if (afterReset.cpuState     !== 'idle') throw new Error('리셋 후 cpu-card state !== idle');
if (afterReset.playerChoice !== 'none') throw new Error('리셋 후 player-card choice !== none: ' + afterReset.playerChoice);
if (afterReset.cpuChoice    !== 'none') throw new Error('리셋 후 cpu-card choice !== none: '    + afterReset.cpuChoice);
var resetScore = JSON.parse(afterReset.stored || '{"win":0,"draw":0,"lose":0}');
if (resetScore.win !== 0 || resetScore.draw !== 0 || resetScore.lose !== 0) {
  throw new Error('리셋 후 localStorage rps:score != 0: ' + afterReset.stored);
}
console.log('[step5] 리셋 → idle/none/0/0/0 + 카드 none + localStorage 초기화 OK (AC3)');

// 6. 키보드 단축키 1(가위)/2(바위)/3(보)/R(초기화) (AC4)

// 6-1. 키 1 → scissors
await page.keyboard.press('1');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterKey1 = await page.evaluate(function() {
  return {
    playerChoice: document.getElementById('player-card').dataset.choice,
    bannerResult: document.getElementById('result-banner').dataset.result,
  };
});
if (afterKey1.playerChoice !== 'scissors') throw new Error('키 1 후 player-choice !== scissors: ' + afterKey1.playerChoice);
if (!['win','draw','lose'].includes(afterKey1.bannerResult)) throw new Error('키 1 후 result-banner 이상: ' + afterKey1.bannerResult);
console.log('[step6-1] 키 1 → scissors + 결과 배너 OK (AC4)');

// 6-2. 키 2 → rock
await page.keyboard.press('2');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterKey2 = await page.evaluate(function() {
  return { playerChoice: document.getElementById('player-card').dataset.choice };
});
if (afterKey2.playerChoice !== 'rock') throw new Error('키 2 후 player-choice !== rock: ' + afterKey2.playerChoice);
console.log('[step6-2] 키 2 → rock OK (AC4)');

// 6-3. 키 3 → paper
await page.keyboard.press('3');
await new Promise(function(r) { setTimeout(r, 1100); });
var afterKey3 = await page.evaluate(function() {
  return { playerChoice: document.getElementById('player-card').dataset.choice };
});
if (afterKey3.playerChoice !== 'paper') throw new Error('키 3 후 player-choice !== paper: ' + afterKey3.playerChoice);
console.log('[step6-3] 키 3 → paper OK (AC4)');

// 6-4. 키 R → 초기화
await page.keyboard.press('R');
await new Promise(function(r) { setTimeout(r, 100); });
var afterKeyR = await page.evaluate(function() {
  return {
    countWin:  parseInt(document.getElementById('count-win').textContent, 10),
    countDraw: parseInt(document.getElementById('count-draw').textContent, 10),
    countLose: parseInt(document.getElementById('count-lose').textContent, 10),
    gameState: document.getElementById('game').dataset.gameState,
  };
});
if (afterKeyR.countWin !== 0 || afterKeyR.countDraw !== 0 || afterKeyR.countLose !== 0) {
  throw new Error('키 R 후 점수 != 0: win=' + afterKeyR.countWin + ' draw=' + afterKeyR.countDraw + ' lose=' + afterKeyR.countLose);
}
if (afterKeyR.gameState !== 'idle') throw new Error('키 R 후 game-state !== idle: ' + afterKeyR.gameState);
console.log('[step6-4] 키 R → 점수 0/0/0 + idle OK (AC4)');

// 7. 새로고침 후 점수 복원 (AC5)
// 버튼 클릭으로 점수 1회 추가 후 reload
await page.click('[data-choice="rock"]');
await new Promise(function(r) { setTimeout(r, 1100); });
var scoreBeforeReload = await page.evaluate(function() {
  return {
    win:  document.getElementById('count-win').textContent,
    draw: document.getElementById('count-draw').textContent,
    lose: document.getElementById('count-lose').textContent,
  };
});
var totalBefore = parseInt(scoreBeforeReload.win) + parseInt(scoreBeforeReload.draw) + parseInt(scoreBeforeReload.lose);
if (totalBefore !== 1) throw new Error('새로고침 전 점수 총합 != 1: ' + JSON.stringify(scoreBeforeReload));

await page.reload();
await page.waitForSelector('[data-choice="rock"]');

var scoreAfterReload = await page.evaluate(function() {
  return {
    win:  document.getElementById('count-win').textContent,
    draw: document.getElementById('count-draw').textContent,
    lose: document.getElementById('count-lose').textContent,
  };
});
if (scoreAfterReload.win  !== scoreBeforeReload.win)  throw new Error('새로고침 후 count-win 불일치: '  + scoreBeforeReload.win  + '→' + scoreAfterReload.win);
if (scoreAfterReload.draw !== scoreBeforeReload.draw) throw new Error('새로고침 후 count-draw 불일치: ' + scoreBeforeReload.draw + '→' + scoreAfterReload.draw);
if (scoreAfterReload.lose !== scoreBeforeReload.lose) throw new Error('새로고침 후 count-lose 불일치: ' + scoreBeforeReload.lose + '→' + scoreAfterReload.lose);
console.log('[step7] 새로고침 후 점수 복원 OK (AC5):', JSON.stringify(scoreAfterReload));

// 8. 테마 토글 (#theme-btn) — dark → light → dark + rps:theme localStorage
var initTheme = await page.evaluate(function() { return document.body.dataset.theme; });
if (initTheme !== 'dark') throw new Error('초기 data-theme !== dark: ' + initTheme);

await page.click('#theme-btn');
await new Promise(function(r) { setTimeout(r, 80); });
var afterLight = await page.evaluate(function() {
  return { theme: document.body.dataset.theme, stored: localStorage.getItem('rps:theme') };
});
if (afterLight.theme  !== 'light') throw new Error('테마 토글 후 data-theme !== light: '  + afterLight.theme);
if (afterLight.stored !== 'light') throw new Error('테마 토글 후 rps:theme != light: '    + afterLight.stored);

await page.click('#theme-btn');
await new Promise(function(r) { setTimeout(r, 80); });
var afterDark = await page.evaluate(function() {
  return { theme: document.body.dataset.theme, stored: localStorage.getItem('rps:theme') };
});
if (afterDark.theme  !== 'dark') throw new Error('두 번째 토글 후 data-theme !== dark: ' + afterDark.theme);
if (afterDark.stored !== 'dark') throw new Error('두 번째 토글 후 rps:theme != dark: '  + afterDark.stored);
console.log('[step8] 테마 dark→light→dark + rps:theme 저장 OK');

// 9. cleanup
await page.evaluate(function() {
  var toRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('rps:')) toRemove.push(k);
  }
  toRemove.forEach(function(k) { localStorage.removeItem(k); });
});
console.log('[done] BF-650 E2E AC1~AC5 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
          },
          body: JSON.stringify({
            url,
            label:     "가위바위보 버튼 클릭→결과→점수 누적→승무패 일관성→리셋→키보드→새로고침 복원 (BF-650 AC1~AC5)",
            scriptText,
            timeoutMs: 120000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`
        );
        assert.ok(
          json.passed,
          `E2E AC1~AC5 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  );

  // ─────────────────────────────────────────────────────────────
  // E2E AC6 — console.error / unhandledrejection / pageerror 0건
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-650 E2E AC6: 전체 게임 플로우 console.error / unhandledrejection / pageerror 0건",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port   = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/rps/`;

        const scriptText = `
// clean
await page.evaluate(function() {
  var toRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('rps:')) toRemove.push(k);
  }
  toRemove.forEach(function(k) { localStorage.removeItem(k); });
});
await page.reload();
await page.waitForSelector('[data-choice="rock"]');

// error hook 설치
await page.evaluate(function() {
  window.__rpsErrors = [];
  window.addEventListener('error', function(e) {
    window.__rpsErrors.push('error: ' + (e.message || String(e)));
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.__rpsErrors.push(
      'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason)
    );
  });
  var origErr = console.error.bind(console);
  console.error = function() {
    try {
      window.__rpsErrors.push('console.error: ' + Array.prototype.map.call(arguments, String).join(' '));
    } catch (_e) {}
    return origErr.apply(console, arguments);
  };
});

// 다양한 인터랙션 — error 0건 확인이 목적
await page.click('[data-choice="scissors"]');
await new Promise(function(r) { setTimeout(r, 900); });
await page.click('[data-choice="rock"]');
await new Promise(function(r) { setTimeout(r, 900); });
await page.click('[data-choice="paper"]');
await new Promise(function(r) { setTimeout(r, 900); });
await page.click('#reset-btn');
await new Promise(function(r) { setTimeout(r, 100); });
await page.keyboard.press('1');
await new Promise(function(r) { setTimeout(r, 900); });
await page.keyboard.press('2');
await new Promise(function(r) { setTimeout(r, 900); });
await page.keyboard.press('3');
await new Promise(function(r) { setTimeout(r, 900); });
await page.keyboard.press('R');
await new Promise(function(r) { setTimeout(r, 100); });
await page.click('#theme-btn');
await new Promise(function(r) { setTimeout(r, 80); });
await page.click('#theme-btn');
await new Promise(function(r) { setTimeout(r, 80); });
// thinking 중 중복 클릭 무시 확인
await page.click('[data-choice="rock"]');
await new Promise(function(r) { setTimeout(r, 100); });
await page.click('[data-choice="paper"]'); // 무시되어야 함
await new Promise(function(r) { setTimeout(r, 900); });

// error 회수 — 0건이어야 함
var errs = await page.evaluate(function() { return window.__rpsErrors || []; });
if (errs.length > 0) {
  throw new Error('console/page error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | '));
}
console.log('[ok] 전체 시나리오 console.error / unhandledrejection / pageerror 0건');

// cleanup
await page.evaluate(function() {
  var toRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith('rps:')) toRemove.push(k);
  }
  toRemove.forEach(function(k) { localStorage.removeItem(k); });
});
console.log('[done] BF-650 E2E AC6 PASS');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "",
          },
          body: JSON.stringify({
            url,
            label:     "가위바위보 console.error / pageerror / unhandledrejection 0건 (BF-650 AC6)",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(
          json.ok,
          `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`
        );
        assert.ok(
          json.passed,
          `E2E AC6 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  );

} // end else (_scopeSkip)

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (clicker-e2e-worker-host 패턴 동일)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 t.skip() 후 false 반환.
 * CI 환경에는 컨테이너 없음 — hookFail 패턴 금지 (BF-440/434 회귀 방지).
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
 * 페르소나 컨테이너의 service hostname.
 * e2e-runner 가 정적 서버로 도달할 때 사용.
 * host.docker.internal / localhost 는 절대 금지 (다른 컨테이너).
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 파일 서버.
 * 임의 포트로 동시 실행 충돌 회피.
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
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const resolved = path.resolve(path.join(rootDir, urlPath));
      if (!resolved.startsWith(path.resolve(rootDir))) {
        res.statusCode = 403;
        res.end("forbidden");
        return;
      }
      fs.readFile(resolved, (err, data) => {
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
  return new Promise((resolve) => {
    server.listen(0, "0.0.0.0", () => resolve(server));
  });
}
