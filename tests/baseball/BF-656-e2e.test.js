// BF-656 · 숫자 야구 게임 E2E 회귀 가드
// 보호 대상:
//   AC1. 정상 플레이 (입력→S/B 판정→승리 흐름)
//   AC2. 잘못된 입력 거부 (중복 숫자 에러 표시 + submit disabled)
//   AC3. 재시작 동작 (new-game-btn → 게임 상태 완전 초기화)
//
// dev(BF-654)가 이미 검증한 항목 — 재작성 X:
//   - generateSecret / judge / validateGuess 단위 로직 (baseball-BF654.test.js)
//
// 정적 가드 (파일 시스템 — e2e-runner 불필요):
//   - HTML 필수 id/class/data-* 선택자 존재
//   - CORS 안전: <script type="module"> 미사용, fetch() 미사용
//   - UMD globalThis.BaseballLogic 등록 패턴

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 baseball 외 skip
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "baseball";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT     = path.resolve(__dirname, "../..");
const BASEBALL_DIR  = path.join(REPO_ROOT, "baseball");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 1 — HTML 마크업 계약 (필수 id/class/data-* 선택자)
  // ─────────────────────────────────────────────────────────────
  test("Baseball HTML 마크업 계약 — 필수 id/class/data-* 선택자 존재", () => {
    const html = fs.readFileSync(path.join(BASEBALL_DIR, "index.html"), "utf-8");

    // 게임 루트 + 상태 속성
    assert.ok(html.includes('id="game"'),           '#game 없음');
    assert.ok(html.includes('data-game-state'),     'data-game-state 속성 없음');

    // 입력 영역
    assert.ok(html.includes('id="digit-inputs"'),   '#digit-inputs 없음');
    assert.ok(html.includes('class="digit-input"'), '.digit-input 없음');
    assert.ok(html.includes('id="input-error"'),    '#input-error 없음');
    assert.ok(html.includes('id="submit-btn"'),     '#submit-btn 없음');

    // digit-input 4개 정확히 존재
    const digitInputCount = (html.match(/class="digit-input"/g) || []).length;
    assert.equal(digitInputCount, 4, `digit-input 개수 != 4: ${digitInputCount}`);

    // 이닝 바 / 시도 카운트
    assert.ok(html.includes('id="inning-dots"'),    '#inning-dots 없음');
    assert.ok(html.includes('id="try-count"'),      '#try-count 없음');

    // 시도 기록
    assert.ok(html.includes('id="history-list"'),   '#history-list 없음');

    // 결과 패널
    assert.ok(html.includes('id="result-panel"'),   '#result-panel 없음');
    assert.ok(html.includes('data-result'),         'data-result 속성 없음');
    assert.ok(html.includes('id="result-title"'),   '#result-title 없음');
    assert.ok(html.includes('id="result-desc"'),    '#result-desc 없음');
    assert.ok(html.includes('id="answer-digits"'),  '#answer-digits 없음');
    assert.ok(html.includes('id="new-game-btn"'),   '#new-game-btn 없음');

    // 테마 토글
    assert.ok(html.includes('id="theme-toggle"'),   '#theme-toggle 없음');
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 2 — CORS 안전 (file:// 호환)
  // ─────────────────────────────────────────────────────────────
  test('Baseball CORS 안전 — <script type="module"> 미사용', () => {
    const html = fs.readFileSync(path.join(BASEBALL_DIR, "index.html"), "utf-8");
    assert.ok(
      !html.includes('type="module"') && !html.includes("type='module'"),
      'index.html 에 <script type="module"> 발견 — file:// CORS 위반'
    );
  });

  test("Baseball CORS 안전 — fetch() 미사용 (main.js + logic.js)", () => {
    const main  = fs.readFileSync(path.join(BASEBALL_DIR, "main.js"),  "utf-8");
    const logic = fs.readFileSync(path.join(BASEBALL_DIR, "logic.js"), "utf-8");
    assert.ok(!main.includes("fetch("),  "main.js 에 fetch() 사용됨 — file:// CORS 위반");
    assert.ok(!logic.includes("fetch("), "logic.js 에 fetch() 사용됨 — file:// CORS 위반");
  });

  // ─────────────────────────────────────────────────────────────
  // 정적 가드 3 — UMD 패턴 (globalThis.BaseballLogic 등록)
  // ─────────────────────────────────────────────────────────────
  test("Baseball logic.js — UMD globalThis.BaseballLogic 등록 패턴 존재", () => {
    const logic = fs.readFileSync(path.join(BASEBALL_DIR, "logic.js"), "utf-8");
    assert.ok(logic.includes("BaseballLogic"),  "logic.js 에 BaseballLogic 노출 코드 없음");
    assert.ok(logic.includes("module.exports"), "logic.js 에 CommonJS exports 없음 (UMD 누락)");
  });

  // ─────────────────────────────────────────────────────────────
  // E2E AC1~AC3 — 정상 플레이 + 잘못된 입력 거부 + 재시작
  //
  // 설계:
  //   정답 결정성 → window.BaseballLogic.generateSecret override 후
  //   new-game-btn.click() (evaluate) 으로 새 게임 재초기화.
  //   입력은 evaluate 내 value 설정 + input Event dispatch 방식
  //   (main.js 핸들러가 validateAndUpdate() 호출 → submit 버튼 활성 제어).
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-656 E2E AC1~AC3: 입력→판정→승리 + 잘못된 입력 거부 + 재시작",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const server    = await startStaticServer(REPO_ROOT);
      const port      = server.address().port;
      const selfHost  = personaHost();

      try {
        const url = `http://${selfHost}:${port}/baseball/`;

        const scriptText = `
// ── 0. 초기 상태 검증 ──────────────────────────────────────────
await page.waitForSelector('#submit-btn');
var initial = await page.evaluate(function() {
  return {
    gameState:   document.getElementById('game').dataset.gameState,
    submitDis:   document.getElementById('submit-btn').disabled,
    tryCount:    document.getElementById('try-count').textContent,
    historyText: document.getElementById('history-list').textContent.trim(),
  };
});
if (initial.gameState !== 'idle')
  throw new Error('초기 game-state !== idle: ' + initial.gameState);
if (!initial.submitDis)
  throw new Error('초기 submit-btn 이 disabled 가 아님');
if (initial.tryCount !== '시도: 0')
  throw new Error('초기 try-count !== "시도: 0": ' + initial.tryCount);
if (!initial.historyText.includes('아직 시도 기록 없음'))
  throw new Error('초기 history-list 에 "아직 시도 기록 없음" 없음');
console.log('[step0] 초기 idle + submit disabled + 시도:0 + 빈 기록 OK');

// ── 1. 정답 override + 새 게임 (evaluate 강제 클릭 — CSS hidden 무관) ───
await page.evaluate(function() {
  window.BaseballLogic.generateSecret = function() { return [1, 2, 3, 4]; };
  document.getElementById('new-game-btn').click();
});
await new Promise(function(r) { setTimeout(r, 100); });
console.log('[step1] generateSecret override + 새 게임 시작 (정답=[1,2,3,4])');

// ── 2. AC2: 잘못된 입력 거부 — 중복 숫자 [1,1,2,3] ─────────────────────
await page.evaluate(function() {
  var inputs = document.querySelectorAll('.digit-input');
  ['1','1','2','3'].forEach(function(v, i) {
    inputs[i].value = v;
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
  });
});
await new Promise(function(r) { setTimeout(r, 80); });
var dupState = await page.evaluate(function() {
  return {
    errorText: document.getElementById('input-error').textContent,
    submitDis: document.getElementById('submit-btn').disabled,
    errCls:    document.querySelectorAll('.digit-input.error').length,
  };
});
if (!dupState.errorText.includes('중복'))
  throw new Error('중복 입력 시 #input-error 에 "중복" 텍스트 없음: "' + dupState.errorText + '"');
if (!dupState.submitDis)
  throw new Error('중복 입력 시 submit-btn 이 disabled 가 아님');
if (dupState.errCls === 0)
  throw new Error('중복 입력 시 .digit-input.error 클래스 없음');
console.log('[step2] 중복 입력 → "중복" 에러 메시지 + submit disabled + .error 클래스 OK (AC2)');

// ── 3. AC1: 올바른 입력 [1,2,3,4] → submit 활성화 확인 ─────────────────
await page.evaluate(function() {
  var inputs = document.querySelectorAll('.digit-input');
  ['1','2','3','4'].forEach(function(v, i) {
    inputs[i].value = v;
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
  });
});
await new Promise(function(r) { setTimeout(r, 80); });
var beforeSubmit = await page.evaluate(function() {
  return {
    submitDis:  document.getElementById('submit-btn').disabled,
    errorText:  document.getElementById('input-error').textContent,
  };
});
if (beforeSubmit.submitDis)
  throw new Error('유효 입력 [1,2,3,4] 후 submit-btn 이 여전히 disabled');
if (beforeSubmit.errorText !== '')
  throw new Error('유효 입력 후 #input-error 가 비어있지 않음: "' + beforeSubmit.errorText + '"');
console.log('[step3] 유효 입력 [1,2,3,4] → submit 활성화 + error 없음 OK');

// ── 4. AC1: submit 클릭 → 시도 기록 추가 + 4S 승리 ──────────────────────
await page.click('#submit-btn');
await new Promise(function(r) { setTimeout(r, 200); });
var afterSubmit = await page.evaluate(function() {
  return {
    gameState:    document.getElementById('game').dataset.gameState,
    resultResult: document.getElementById('result-panel').dataset.result,
    resultTitle:  document.getElementById('result-title').textContent,
    answerText:   document.getElementById('answer-digits').textContent,
    tryCount:     document.getElementById('try-count').textContent,
    historyRows:  document.querySelectorAll('.history-row').length,
    historyText:  document.getElementById('history-list').textContent,
  };
});
if (afterSubmit.gameState !== 'win')
  throw new Error('4S 제출 후 game-state !== win: ' + afterSubmit.gameState);
if (afterSubmit.resultResult !== 'win')
  throw new Error('4S 제출 후 result-panel data-result !== win: ' + afterSubmit.resultResult);
if (afterSubmit.resultTitle !== '정답!')
  throw new Error('result-title !== "정답!": "' + afterSubmit.resultTitle + '"');
if (afterSubmit.answerText !== '1 2 3 4')
  throw new Error('#answer-digits != "1 2 3 4": "' + afterSubmit.answerText + '"');
if (afterSubmit.tryCount !== '시도: 1')
  throw new Error('try-count !== "시도: 1": "' + afterSubmit.tryCount + '"');
if (afterSubmit.historyRows !== 1)
  throw new Error('시도 기록 행 수 != 1: ' + afterSubmit.historyRows);
if (!afterSubmit.historyText.includes('1 2 3 4'))
  throw new Error('시도 기록에 "1 2 3 4" 없음');
console.log('[step4] 4S 제출 → game-state=win + "정답!" + 시도 기록 1건 OK (AC1)');

// ── 5. AC3: new-game-btn → 재시작 (상태 완전 초기화) ──────────────────
await page.evaluate(function() {
  document.getElementById('new-game-btn').click();
});
await new Promise(function(r) { setTimeout(r, 100); });
var afterRestart = await page.evaluate(function() {
  return {
    gameState:    document.getElementById('game').dataset.gameState,
    resultResult: document.getElementById('result-panel').dataset.result,
    tryCount:     document.getElementById('try-count').textContent,
    submitDis:    document.getElementById('submit-btn').disabled,
    historyText:  document.getElementById('history-list').textContent.trim(),
    historyRows:  document.querySelectorAll('.history-row').length,
  };
});
if (afterRestart.gameState !== 'idle')
  throw new Error('재시작 후 game-state !== idle: ' + afterRestart.gameState);
if (afterRestart.resultResult !== 'none')
  throw new Error('재시작 후 result-panel data-result !== none: ' + afterRestart.resultResult);
if (afterRestart.tryCount !== '시도: 0')
  throw new Error('재시작 후 try-count !== "시도: 0": ' + afterRestart.tryCount);
if (!afterRestart.submitDis)
  throw new Error('재시작 후 submit-btn 이 disabled 가 아님');
if (!afterRestart.historyText.includes('아직 시도 기록 없음'))
  throw new Error('재시작 후 history-list 에 "아직 시도 기록 없음" 없음');
if (afterRestart.historyRows !== 0)
  throw new Error('재시작 후 .history-row 잔존: ' + afterRestart.historyRows);
console.log('[step5] 재시작 → idle + result=none + 시도:0 + submit disabled + 기록 초기화 OK (AC3)');

console.log('[done] BF-656 E2E AC1~AC3 PASS');
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
            label:     "숫자 야구 입력→판정→승리 + 잘못된 입력 거부 + 재시작 (BF-656 AC1~AC3)",
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
          `E2E AC1~AC3 시나리오 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  );

  // ─────────────────────────────────────────────────────────────
  // E2E — console.error / unhandledrejection / pageerror 0건
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-656 E2E: 전체 게임 플로우 console.error / unhandledrejection / pageerror 0건",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const server    = await startStaticServer(REPO_ROOT);
      const port      = server.address().port;
      const selfHost  = personaHost();

      try {
        const url = `http://${selfHost}:${port}/baseball/`;

        const scriptText = `
await page.waitForSelector('#submit-btn');

// error hook 설치 (모든 인터랙션 전에 먼저)
await page.evaluate(function() {
  window.__baseballErrors = [];
  window.addEventListener('error', function(e) {
    window.__baseballErrors.push('error: ' + (e.message || String(e)));
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.__baseballErrors.push(
      'unhandledrejection: ' + String(e.reason && e.reason.message ? e.reason.message : e.reason)
    );
  });
  var origErr = console.error.bind(console);
  console.error = function() {
    try {
      window.__baseballErrors.push(
        'console.error: ' + Array.prototype.map.call(arguments, String).join(' ')
      );
    } catch (_e) {}
    return origErr.apply(console, arguments);
  };
});

// generateSecret override + 새 게임
await page.evaluate(function() {
  window.BaseballLogic.generateSecret = function() { return [5, 0, 7, 3]; };
  document.getElementById('new-game-btn').click();
});
await new Promise(function(r) { setTimeout(r, 100); });

// 틀린 추리 1 — [1,2,3,4]
await page.evaluate(function() {
  var inputs = document.querySelectorAll('.digit-input');
  ['1','2','3','4'].forEach(function(v, i) {
    inputs[i].value = v;
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
  });
});
await new Promise(function(r) { setTimeout(r, 50); });
await page.click('#submit-btn');
await new Promise(function(r) { setTimeout(r, 150); });

// 틀린 추리 2 — [6,8,9,2]
await page.evaluate(function() {
  var inputs = document.querySelectorAll('.digit-input');
  ['6','8','9','2'].forEach(function(v, i) {
    inputs[i].value = v;
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
  });
});
await new Promise(function(r) { setTimeout(r, 50); });
await page.click('#submit-btn');
await new Promise(function(r) { setTimeout(r, 150); });

// 중복 입력 (에러 표시만, submit 안 함)
await page.evaluate(function() {
  var inputs = document.querySelectorAll('.digit-input');
  ['2','2','3','4'].forEach(function(v, i) {
    inputs[i].value = v;
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
  });
});
await new Promise(function(r) { setTimeout(r, 50); });

// 정답 입력 → 승리
await page.evaluate(function() {
  var inputs = document.querySelectorAll('.digit-input');
  ['5','0','7','3'].forEach(function(v, i) {
    inputs[i].value = v;
    inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
  });
});
await new Promise(function(r) { setTimeout(r, 50); });
await page.click('#submit-btn');
await new Promise(function(r) { setTimeout(r, 200); });

// 재시작
await page.evaluate(function() {
  document.getElementById('new-game-btn').click();
});
await new Promise(function(r) { setTimeout(r, 100); });

// 테마 토글 — dark → light → dark
await page.click('#theme-toggle');
await new Promise(function(r) { setTimeout(r, 80); });
await page.click('#theme-toggle');
await new Promise(function(r) { setTimeout(r, 80); });

// error 수집
var errs = await page.evaluate(function() { return window.__baseballErrors || []; });
if (errs.length > 0) {
  throw new Error(
    'console/page error 발생 (' + errs.length + '건): ' + errs.slice(0, 5).join(' | ')
  );
}
console.log('[ok] 전체 시나리오 console.error / unhandledrejection / pageerror 0건');
console.log('[done] BF-656 E2E console error 가드 PASS');
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
            label:     "숫자 야구 console.error / pageerror / unhandledrejection 0건 (BF-656)",
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
          `E2E console error 가드 실패 — stdout 끝: ${String(json.stdout ?? "").slice(-2500)}`
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  );

} // end else (_scopeSkip)

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (rps-BF650-e2e 패턴 동일)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 t.skip() 후 false 반환.
 * CI 환경에는 컨테이너 없음 — hookFail 패턴 금지.
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
 * 페르소나 컨테이너 service hostname.
 * e2e-runner 가 정적 서버로 도달할 때 사용.
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 파일 서버 (포트 임의 할당).
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
