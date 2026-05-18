// BF-602 · 스네이크 게임 사운드 효과 + 설정 토글 E2E 회귀 가드
//
// AC 매핑:
//   AC1 — 사운드 on 상태에서 먹이 먹기 → 880Hz sine 100ms ding 재생
//         (정적 가드: dev BF-600 §3 이 세부 코드 검증 완료 → tester 는 호출 경로 보존 확인)
//   AC2 — 사운드 on 상태에서 게임 오버 → 220Hz square 300ms fail 재생
//         (E2E §5: AudioContext mock → game over → createOscillator 호출 확인)
//   AC3 — 설정 모달 사운드 off + 저장 → 모든 효과음 무음
//         (E2E §4-b: 토글 클릭 → localStorage "false" 저장 / E2E §6: 무음 검증)
//   AC4 — 페이지 새로고침 후 localStorage 에서 off 상태 복원
//         (E2E §4-a: pre-set "false" → modal aria-checked="false" 확인)
//   AC5 — 기존 snake-BF576/590/592/594/598 누적 회귀 테스트 GREEN 유지
//         (작업 착수 전 실행 결과: BF576/592/594/598 → 102/102 PASS
//          BF590-e2e: 4건 FAIL — BF-592 openSettingsModal("entry") 로 인한 기존 문제,
//          BF-600 변경과 무관. findings[].owner=developer 로 기록.)
//
// 가드 설계 원칙:
//   - dev BF-600 정적 분석 (§1~§4) 중복 금지:
//       data-key="soundEnabled"/role="switch"/aria-checked 존재,
//       loadSettingsSoundEnabled/saveSettingsSoundEnabled 함수 존재,
//       playSound 함수 내부 주파수·파형·지속 시간, resume/suspended 처리
//   - tester 고유 영역:
//       BF-567 하위 호환 보존, CORS 안전, E2E localStorage 상태 사이클,
//       AudioContext mock → game-over sound 트리거, 무음 반전 검증
//
// 실행: node --test tests/snake-BF602-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/snake-BF602-e2e.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");

const html   = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const gameJs = readFileSync(path.join(SNAKE_DIR, "game.js"),    "utf-8");

const E2E_SKIP = process.env.BRIX_E2E_SKIP === "1";

// ─────────────────────────────────────────────────────────────
// 헬퍼: 함수 본문 추출 (중괄호 depth 추적)
// ─────────────────────────────────────────────────────────────
function extractFnBody(src, fnName) {
  const idx = src.indexOf("function " + fnName);
  if (idx === -1) return "";
  let depth = 0;
  for (let i = idx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(idx, i + 1);
    }
  }
  return "";
}

// ═══════════════════════════════════════════════════════════════
// §1. HTML 마크업 추가 계약 가드
//     dev BF-600 이 체크하지 않은 구조·하위 호환 요소 박제
// ═══════════════════════════════════════════════════════════════

describe("BF-602 §1 HTML 마크업 추가 계약 가드", () => {
  test("§1-1 (BF-567 하위 호환): #sound-toggle (기존 HUD 토글) 여전히 존재", () => {
    // BF-567 에서 추가된 HUD 의 🔊 토글 (#sound-toggle) 이 BF-600 이후에도 삭제되지 않아야 함
    assert.ok(
      html.includes('id="sound-toggle"'),
      'index.html 에 id="sound-toggle" 없음 — BF-567 HUD 토글이 삭제된 회귀',
    );
  });

  test("§1-2 (AC3): soundEnabled 토글에 ctrl-toggle-track 자식 구조 존재 (UI 완성도)", () => {
    const keyIdx = html.indexOf('data-key="soundEnabled"');
    assert.ok(keyIdx !== -1, 'data-key="soundEnabled" 없음');
    // 해당 버튼 이후 100자 내에 ctrl-toggle-track 있어야 함
    const nearby = html.slice(keyIdx, keyIdx + 200);
    assert.ok(
      nearby.includes("ctrl-toggle-track"),
      'soundEnabled 토글 버튼에 ctrl-toggle-track 자식 없음 — UI 구조 불완전',
    );
    assert.ok(
      nearby.includes("ctrl-toggle-thumb"),
      'soundEnabled 토글 버튼에 ctrl-toggle-thumb 자식 없음 — UI 구조 불완전',
    );
  });

  test("§1-3 (AC3): 효과음 섹션에 settings-section-title 타이틀 존재", () => {
    // BF-600 이전: <p class="settings-section-note">효과음은 화면 우상단 🔊 버튼으로 변경하세요.</p>
    // BF-600 이후: <p class="settings-section-title">효과음</p> 로 교체
    // 핵심: settings-section-title + 효과음 텍스트가 연속해서 존재
    assert.ok(
      html.includes('class="settings-section-title">효과음'),
      'index.html 에 <p class="settings-section-title">효과음</p> 없음 ' +
      '— BF-600 효과음 섹션 타이틀 미추가 또는 BF-600 이전 settings-section-note 로 회귀',
    );
  });

  test("§1-4 (AC3): soundEnabled 토글의 ctrl-toggle-text 자식 존재", () => {
    const keyIdx = html.indexOf('data-key="soundEnabled"');
    assert.ok(keyIdx !== -1, 'data-key="soundEnabled" 없음');
    const nearby = html.slice(keyIdx, keyIdx + 250);
    assert.ok(
      nearby.includes("ctrl-toggle-text"),
      'soundEnabled 토글에 ctrl-toggle-text 자식 없음 — on/off 레이블 미표시',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §2. CORS / file:// 안전 가드 (BF-522 회귀 보호)
//     BF-600 이후에도 file:// 호환성 유지 여부 확인
// ═══════════════════════════════════════════════════════════════

describe("BF-602 §2 CORS / file:// 안전 가드 (BF-522 회귀 보호)", () => {
  test("§2-1 (BF-522 회귀): index.html 에 type=\"module\" 미사용", () => {
    assert.ok(
      !html.includes('type="module"'),
      'index.html 에 type="module" 존재 — file:// CORS 오류 회귀 (BF-522)',
    );
  });

  test("§2-2 (BF-522 회귀): game.js 에 fetch() 미사용", () => {
    assert.ok(
      !gameJs.includes("fetch("),
      'game.js 에 fetch() 존재 — file:// 환경에서 CORS 오류 발생 가능',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §3. BF-567 하위 호환 회귀 가드
//     BF-600 이 BF-567 의 1차 가드 (soundEnabled 변수) 를 삭제하지 않았는지 확인
// ═══════════════════════════════════════════════════════════════

describe("BF-602 §3 BF-567 하위 호환 회귀 가드", () => {
  test("§3-1 (BF-567 회귀): bf-snake-sound-enabled localStorage 키 여전히 존재", () => {
    assert.ok(
      gameJs.includes('"bf-snake-sound-enabled"'),
      'game.js 에 "bf-snake-sound-enabled" 키 없음 — BF-567 HUD 토글 연동 회귀',
    );
  });

  test("§3-2 (BF-567 회귀): loadSoundEnabled 함수 여전히 존재 (HUD 토글 백엔드)", () => {
    assert.ok(
      gameJs.includes("function loadSoundEnabled"),
      'game.js 에 loadSoundEnabled 함수 없음 — BF-567 HUD 음소거 기능 회귀',
    );
  });

  test("§3-3 (BF-567 회귀): let soundEnabled = loadSoundEnabled() 1차 가드 변수 존재", () => {
    assert.ok(
      gameJs.includes("let soundEnabled = loadSoundEnabled()"),
      'game.js 에 soundEnabled 1차 가드 변수 없음 — BF-567 HUD 토글 off 시 무음 불가',
    );
  });

  test("§3-4 (AC1/AC2 + BF-567): playEatSound 내 soundEnabled 1차 가드 여전히 존재", () => {
    const body = extractFnBody(gameJs, "playEatSound");
    assert.ok(body.length > 0, "playEatSound 함수 없음");
    assert.ok(
      body.includes("!soundEnabled"),
      "playEatSound 에 !soundEnabled 1차 가드 없음 — BF-567 HUD 토글 연동 회귀",
    );
  });

  test("§3-5 (AC2 + BF-567): playGameOverSound 내 soundEnabled 1차 가드 여전히 존재", () => {
    const body = extractFnBody(gameJs, "playGameOverSound");
    assert.ok(body.length > 0, "playGameOverSound 함수 없음");
    assert.ok(
      body.includes("!soundEnabled"),
      "playGameOverSound 에 !soundEnabled 1차 가드 없음 — BF-567 HUD 토글 연동 회귀",
    );
  });

  test("§3-6 (AC1): playEatSound → playSound('ding') 단일 경유 (BF-600 명세)", () => {
    const body = extractFnBody(gameJs, "playEatSound");
    assert.ok(body.length > 0, "playEatSound 함수 없음");
    assert.ok(
      body.includes('playSound("ding")') || body.includes("playSound('ding')"),
      'playEatSound 가 playSound("ding") 를 경유하지 않음 — BF-600 단일 경유 명세 회귀',
    );
  });

  test("§3-7 (AC2): playGameOverSound → playSound('fail') 단일 경유 (BF-600 명세)", () => {
    const body = extractFnBody(gameJs, "playGameOverSound");
    assert.ok(body.length > 0, "playGameOverSound 함수 없음");
    assert.ok(
      body.includes('playSound("fail")') || body.includes("playSound('fail')"),
      'playGameOverSound 가 playSound("fail") 를 경유하지 않음 — BF-600 단일 경유 명세 회귀',
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// §4~§6. E2E 가드 — e2e-runner 컨테이너 사용
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────────────────────

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

function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ??
    process.env.BRIX_WORKER_HOSTNAME ??
    "worker"
  );
}

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
        res.statusCode = 403; res.end("forbidden"); return;
      }
      fs.readFile(resolved, (err, data) => {
        if (err) { res.statusCode = 404; res.end("not found"); return; }
        const ext = path.extname(resolved);
        res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
        res.end(data);
      });
    } catch (err) {
      res.statusCode = 500; res.end(String(err));
    }
  });
  return new Promise((resolve) => server.listen(0, "0.0.0.0", () => resolve(server)));
}

// ─────────────────────────────────────────────────────────────
// §4-a. E2E AC4 — localStorage "false" 사전 설정 → 페이지 로드 →
//        설정 모달 soundEnabled 토글 aria-checked="false" 확인
// ─────────────────────────────────────────────────────────────

if (E2E_SKIP) {
  test("[E2E] §4~§6 BRIX_E2E_SKIP=1 — CI 결정성 가드로 전체 skip", (t) =>
    t.skip("BRIX_E2E_SKIP=1"));
} else {
  test("BF-602 E2E §4-a (AC4): localStorage off 사전 설정 → 설정 모달 토글 aria-checked=\"false\"", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 1. snake.settings.soundEnabled = "false" 사전 저장 (AC4 재현)
        await page.evaluate(() => {
          localStorage.clear();
          localStorage.setItem('snake.settings.soundEnabled', 'false');
        });
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 6000 });
        console.log('[step0] 페이지 로드 OK, snake.settings.soundEnabled=false 사전 설정 완료');

        // 2. 설정 모달이 열려 있는지 확인 (openSettingsModal("entry"))
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step1] 설정 모달 열림 (entry) OK');

        // 3. soundEnabled 토글의 aria-checked 확인
        //    openSettingsModal 이 loadSettingsSoundEnabled() 로 복원 → "false" 가 되어야 함
        const checked = await page.evaluate(() => {
          const tog = document.querySelector('[data-key="soundEnabled"]');
          if (!tog) return '__MISSING__';
          return tog.getAttribute('aria-checked');
        });
        console.log('[step2] soundEnabled toggle aria-checked:', checked);

        if (checked === '__MISSING__') {
          throw new Error('설정 모달에 [data-key="soundEnabled"] 토글 없음 — HTML 회귀');
        }
        if (checked !== 'false') {
          throw new Error(
            'AC4 회귀: snake.settings.soundEnabled="false" 로 사전 설정했으나 ' +
            '설정 모달에서 aria-checked="' + checked + '" — localStorage 복원 실패'
          );
        }
        console.log('[step3] AC4 검증 완료: off 상태 올바르게 복원됨');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id":  process.env.BRIX_RUN_ID  ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-602",
        },
        body: JSON.stringify({
          url,
          label: "AC4 localStorage 복원 — snake.settings.soundEnabled=false → 설정 모달 aria-checked=false [BF-602]",
          scriptText,
          timeoutMs: 25000,
        }),
      });
      const json = await res.json();
      assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
      assert.ok(
        json.passed,
        `E2E §4-a AC4 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // §4-b. E2E AC3 — 설정 모달 사운드 토글 클릭 (off) → 저장 →
  //        localStorage "snake.settings.soundEnabled" = "false" 확인
  // ─────────────────────────────────────────────────────────────

  test("BF-602 E2E §4-b (AC3): 사운드 토글 클릭 off → 저장 → localStorage=\"false\"", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 1. 초기 상태: localStorage 비워서 기본값(true) 으로 시작
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 6000 });
        console.log('[step0] 페이지 로드 OK');

        // 2. 설정 모달 열림 대기 (entry)
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // 3. 초기 상태: soundEnabled toggle aria-checked="true" 확인 (기본값)
        const initChecked = await page.evaluate(() => {
          const tog = document.querySelector('[data-key="soundEnabled"]');
          return tog ? tog.getAttribute('aria-checked') : '__MISSING__';
        });
        if (initChecked !== 'true') {
          throw new Error(
            '초기 soundEnabled 토글이 aria-checked="true" 가 아님: "' + initChecked + '"' +
            ' — 기본값 true 회귀'
          );
        }
        console.log('[step2] 초기 aria-checked="true" OK');

        // 4. soundEnabled 토글 클릭 → aria-checked="false" 로 전환
        await page.click('[data-key="soundEnabled"]');
        const afterClick = await page.evaluate(() => {
          const tog = document.querySelector('[data-key="soundEnabled"]');
          return tog ? tog.getAttribute('aria-checked') : '__MISSING__';
        });
        if (afterClick !== 'false') {
          throw new Error(
            'soundEnabled 토글 클릭 후 aria-checked="false" 가 아님: "' + afterClick + '"' +
            ' — handleToggleClick 연동 회귀 (AC3)'
          );
        }
        console.log('[step3] 토글 클릭 → aria-checked="false" OK');

        // 5. Enter 키로 저장 (saveSettingsModal)
        await page.keyboard.press('Enter');
        await page.waitForFunction(
          () => document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step4] 설정 저장 → 모달 닫힘 OK');

        // 6. localStorage 확인: snake.settings.soundEnabled = "false"
        const stored = await page.evaluate(
          () => localStorage.getItem('snake.settings.soundEnabled')
        );
        if (stored !== 'false') {
          throw new Error(
            'saveSettingsModal 후 snake.settings.soundEnabled 값이 "false" 가 아님: "' +
            stored + '" — saveSettingsSoundEnabled 연동 회귀 (AC3)'
          );
        }
        console.log('[step5] localStorage snake.settings.soundEnabled="false" OK');
        console.log('[step-final] AC3 완전 검증: 토글 → 저장 → localStorage 사이클 정상');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id":  process.env.BRIX_RUN_ID  ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-602",
        },
        body: JSON.stringify({
          url,
          label: "AC3 사운드 토글 off → localStorage 저장 사이클 [BF-602]",
          scriptText,
          timeoutMs: 30000,
        }),
      });
      const json = await res.json();
      assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
      assert.ok(
        json.passed,
        `E2E §4-b AC3 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // §5. E2E AC2 — AudioContext mock + game-over 시나리오
  //     사운드 on(기본값) → 뱀이 오른쪽 벽 충돌 → playGameOverSound 호출 →
  //     mock AudioContext.createOscillator 기록 확인
  //
  //     결정성 근거:
  //       TICK_MS=120, snake 는 오른쪽으로 자동 이동, cols≈40~96
  //       midX≈20~48, 충돌까지 20~48 tick × 120ms ≈ 2.4~5.76s (타임아웃 20s)
  // ─────────────────────────────────────────────────────────────

  test("BF-602 E2E §5 (AC2): AudioContext mock → game-over → createOscillator 호출 확인", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 1. AudioContext spy 등록 — 페이지 로드 전에 삽입해야 game.js 가 spy 를 사용
        await page.addInitScript(() => {
          window._mockAudioLog = [];
          const MockOscillator = {
            type: '', frequency: { value: 0, setTargetAtTime() {} },
            connect() {}, start() {}, stop() {},
          };
          const MockGain = {
            gain: { value: 0.35, setTargetAtTime() {} },
            connect() {},
          };
          function MockAudioContext() {
            window._mockAudioLog.push('ctor');
          }
          MockAudioContext.prototype.createOscillator = function() {
            window._mockAudioLog.push('createOscillator');
            return Object.assign({}, MockOscillator);
          };
          MockAudioContext.prototype.createGain = function() {
            return Object.assign({}, MockGain);
          };
          Object.defineProperty(MockAudioContext.prototype, 'destination', {
            get() { return {}; }
          });
          Object.defineProperty(MockAudioContext.prototype, 'state', {
            get() { return 'running'; }
          });
          MockAudioContext.prototype.resume = function() {
            return Promise.resolve();
          };
          window.AudioContext = MockAudioContext;
          window.webkitAudioContext = MockAudioContext;
        });

        // 2. 초기 상태: localStorage 비워서 soundEnabled 기본값(true) 적용
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 6000 });
        console.log('[step0] 페이지 로드 + AudioContext spy 주입 OK');

        // 3. 설정 모달 열림 대기 (entry)
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // 4. Enter 키로 기본 설정 저장 → 게임 시작 (initGame)
        //    soundEnabled 기본값 = true → saveSettingsSoundEnabled(true) 호출됨
        await page.keyboard.press('Enter');
        await page.waitForFunction(
          () => document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step2] 설정 저장 → 모달 닫힘 → 게임 시작 OK');

        // 5. 게임이 playing 상태인지 확인 (HUD 가시 여부로 간접 확인)
        await page.waitForFunction(
          () => !document.getElementById('hud').hasAttribute('hidden') ||
                document.getElementById('canvas') !== null,
          { timeout: 3000 }
        ).catch(() => console.log('[step3-warn] HUD 확인 timeout — 게임 진행 가정'));
        console.log('[step3] 게임 시작 상태 확인');

        // 6. 뱀이 오른쪽 벽에 충돌할 때까지 대기
        //    snake 는 오른쪽(DIR.RIGHT)으로 시작 → TICK_MS=120ms 간격으로 자동 이동
        //    cols ≈ viewport_width / 20, midX ≈ cols/2 → 충돌까지 ≈ 2~6초
        //    playGameOverSound → playSound("fail") → mock.createOscillator 호출
        await page.waitForFunction(
          () => window._mockAudioLog && window._mockAudioLog.includes('createOscillator'),
          { timeout: 20000 }
        );
        console.log('[step4] createOscillator 호출 감지 OK');

        // 7. spy 기록 검증
        const log = await page.evaluate(() => window._mockAudioLog || []);
        console.log('[step5] AudioContext spy log:', JSON.stringify(log));

        if (!log.includes('ctor')) {
          throw new Error('AudioContext 생성자가 호출되지 않음 — getAudioContext() 미실행 (AC2 회귀)');
        }
        if (!log.includes('createOscillator')) {
          throw new Error(
            'AudioContext.createOscillator 미호출 — playSound 내 오실레이터 생성 경로 회귀 (AC2)'
          );
        }
        console.log('[step-final] AC2 E2E 검증 완료: game-over → AudioContext → createOscillator 정상');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id":  process.env.BRIX_RUN_ID  ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-602",
        },
        body: JSON.stringify({
          url,
          label: "AC2 AudioContext mock + game-over 사운드 트리거 확인 [BF-602]",
          scriptText,
          timeoutMs: 40000,
        }),
      });
      const json = await res.json();
      assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
      assert.ok(
        json.passed,
        `E2E §5 AC2 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ─────────────────────────────────────────────────────────────
  // §6. E2E AC3 무음 검증 — soundEnabled=false → game-over →
  //     AudioContext mock 이 절대 호출되지 않음을 확인
  // ─────────────────────────────────────────────────────────────

  test("BF-602 E2E §6 (AC3 무음): soundEnabled=false → game-over 시 AudioContext 미호출", async (t) => {
    if (!(await e2eRunnerReachable(t))) return;

    const server = await startStaticServer(REPO_ROOT);
    const port = server.address().port;
    const selfHost = personaHost();

    try {
      const url = `http://${selfHost}:${port}/snake/`;
      const scriptText = `
        // 1. AudioContext spy 등록
        await page.addInitScript(() => {
          window._silentMockLog = [];
          function SilentMockAudioContext() {
            window._silentMockLog.push('ctor');
          }
          SilentMockAudioContext.prototype.createOscillator = function() {
            window._silentMockLog.push('createOscillator');
            return { type: '', frequency: { value: 0, setTargetAtTime(){} }, connect(){}, start(){}, stop(){} };
          };
          SilentMockAudioContext.prototype.createGain = function() {
            return { gain: { value: 0, setTargetAtTime(){} }, connect(){} };
          };
          Object.defineProperty(SilentMockAudioContext.prototype, 'destination', { get() { return {}; }});
          Object.defineProperty(SilentMockAudioContext.prototype, 'state', { get() { return 'running'; }});
          SilentMockAudioContext.prototype.resume = function() { return Promise.resolve(); };
          window.AudioContext = SilentMockAudioContext;
          window.webkitAudioContext = SilentMockAudioContext;
        });

        // 2. soundEnabled=false 사전 설정 + BF-567 HUD 토글도 false 로 설정
        await page.evaluate(() => {
          localStorage.clear();
          localStorage.setItem('snake.settings.soundEnabled', 'false');
          localStorage.setItem('bf-snake-sound-enabled', 'false');
        });
        await page.reload();
        await page.waitForSelector('#settings-trigger', { timeout: 6000 });
        console.log('[step0] 페이지 로드 + AudioContext spy 주입 + soundEnabled=false OK');

        // 3. 설정 모달 열림 대기 (entry)
        await page.waitForFunction(
          () => !document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step1] 설정 모달 열림 OK');

        // 4. 설정 모달의 soundEnabled 토글이 aria-checked="false" 인지 확인
        const modalChecked = await page.evaluate(() => {
          const tog = document.querySelector('[data-key="soundEnabled"]');
          return tog ? tog.getAttribute('aria-checked') : '__MISSING__';
        });
        if (modalChecked !== 'false') {
          throw new Error(
            'soundEnabled=false 사전 설정했으나 모달 토글 aria-checked="' +
            modalChecked + '" — AC4 복원 실패'
          );
        }
        console.log('[step2] 설정 모달 soundEnabled aria-checked="false" OK (AC4 복원 확인)');

        // 5. Enter 키로 저장 → 게임 시작 (soundEnabled=false 로 저장됨)
        await page.keyboard.press('Enter');
        await page.waitForFunction(
          () => document.getElementById('settings-modal').hasAttribute('hidden'),
          { timeout: 5000 }
        );
        console.log('[step3] 설정 저장 → 게임 시작 OK');

        // 6. 뱀이 오른쪽 벽 충돌할 시간 대기 (최대 10초 + 여유)
        //    game-over 후 _silentMockLog 에 createOscillator 가 있으면 AC3 회귀
        //    게임 오버 화면이 나타날 때까지 대기 (#gameover-overlay 의 hidden 해제)
        let gameOverDetected = false;
        try {
          await page.waitForFunction(
            () => document.getElementById('gameover-overlay') &&
                  !document.getElementById('gameover-overlay').hasAttribute('hidden'),
            { timeout: 12000 }
          );
          gameOverDetected = true;
        } catch (_) {
          // gameover-overlay 대기 실패 시 시간 기반 대기로 폴백
          await new Promise(r => setTimeout(r, 8000));
        }
        console.log('[step4] game-over 감지:', gameOverDetected ? 'overlay 기반' : 'timeout 폴백');

        // 7. AudioContext spy 기록 확인 — createOscillator 가 있으면 AC3 회귀
        const log = await page.evaluate(() => window._silentMockLog || []);
        console.log('[step5] SilentMock log:', JSON.stringify(log));

        if (log.includes('createOscillator')) {
          throw new Error(
            'AC3 회귀: soundEnabled=false 설정 후에도 AudioContext.createOscillator 가 호출됨. ' +
            'spy log: ' + JSON.stringify(log) +
            ' — playSound 내 loadSettingsSoundEnabled() 가드가 누락됐거나 short-circuit 하지 않음'
          );
        }
        console.log('[step-final] AC3 무음 E2E 검증 완료: soundEnabled=false → AudioContext 미호출 정상');
      `;

      const res = await fetch("http://e2e-runner:3030/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Brix-Run-Id":  process.env.BRIX_RUN_ID  ?? "unknown",
          "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-602",
        },
        body: JSON.stringify({
          url,
          label: "AC3 무음 검증 — soundEnabled=false → game-over → AudioContext 미호출 [BF-602]",
          scriptText,
          timeoutMs: 40000,
        }),
      });
      const json = await res.json();
      assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
      assert.ok(
        json.passed,
        `E2E §6 AC3 무음 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}
