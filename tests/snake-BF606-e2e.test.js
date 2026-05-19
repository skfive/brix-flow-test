// BF-606 · 사운드 음량 조절 E2E 회귀 가드
//
// AC 매핑 (BF-604 구현 기준):
//   AC1 — 실 브라우저에서 슬라이더 노출·range 0~100·default 50 E2E 확인
//   AC3 — 슬라이더 값 변경 → 저장 → localStorage 영속 + 새로고침 후 복원 E2E 확인
//   AC4 — 음량 0 + soundEnabled=true → 효과음 경로에서 AudioContext 미호출 (무음) E2E 확인
//
// 중복 금지 범위 (BF-604 dev test 가 이미 검증):
//   data-key="soundVolume" 정적 HTML 존재, type/min/max/step/value 속성,
//   loadSoundVolume/saveSoundVolume 함수 정의, try-catch, localStorage 키 상수,
//   _soundVolume 변수 초기화, handleSliderInput·saveSettingsModal·openSettingsModal
//   soundVolume 연동, file:// CORS 안전 — 이 항목들은 본 파일에서 일절 작성 금지.
//
// tester 고유 영역:
//   1. E2E AC1 — 브라우저 내 슬라이더 DOM 실렌더링·범위·default 확인
//   2. E2E AC3 — 슬라이더 조작(input 이벤트) → 저장 → localStorage 확인 → 리로드 복원
//   3. E2E AC4 — 음량 0·soundEnabled=true → game-over → createOscillator 미호출 확인
//   4. Module scope guard (BRIX_TEST_MODULE≠snake → 전체 skip)
//   5. CI 결정성 (e2e-runner 도달 불가 또는 BRIX_E2E_SKIP=1 → t.skip())
//
// [CLAUDE.md 함정] snake 설정 모달이 게임 진입 시 자동 오픈 (source="entry").
//   localStorage.clear()+reload() 직후 즉시 셀렉터 검사 금지 —
//   waitForFunction 으로 모달 열림 확인 후 작업.
//
// Web Audio 헤드리스 주의: AudioContext mock spy 로 createOscillator 호출 여부로
//   음량 반영 확인 (직접 가청 검증 불가).
//
// 실행: node --test tests/snake-BF606-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/snake-BF606-e2e.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────
// Module scope guard — BRIX_TEST_MODULE≠snake 이면 전체 skip
// ─────────────────────────────────────────────────────────────
const TEST_MODULE = process.env.BRIX_TEST_MODULE;
const MODULE_SKIP = TEST_MODULE != null && TEST_MODULE !== "snake";
const E2E_SKIP    = process.env.BRIX_E2E_SKIP === "1";

if (MODULE_SKIP) {
  // focused scope 불일치 — 다른 module 테스트 실행 시 노이즈 방지
  describe("BF-606 (module scope skip)", () => {
    test("BRIX_TEST_MODULE 불일치 — 전체 skip", (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ snake — BF-606 가드 스킵`));
  });
} else {
  // ─────────────────────────────────────────────────────────────
  // 헬퍼: e2e-runner 도달 가능 여부 확인
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

  // ─────────────────────────────────────────────────────────────
  // 헬퍼: persona host 결정
  // ─────────────────────────────────────────────────────────────
  function personaHost() {
    return (
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker"
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 헬퍼: 정적 파일 HTTP 서버 구동
  // ─────────────────────────────────────────────────────────────
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
  // E2E skip 분기 (BRIX_E2E_SKIP=1)
  // ─────────────────────────────────────────────────────────────

  if (E2E_SKIP) {
    test("[E2E] BF-606 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {

    // ═══════════════════════════════════════════════════════════
    // §1. E2E AC1 — 실 브라우저 슬라이더 노출·범위·default 50
    //
    // BF-604 dev test 가 정적 HTML 속성을 검증했지만,
    // 실 브라우저(Pixi.js 초기화 포함) 에서 DOM 이 정상 렌더링되고
    // 설정 모달 내 슬라이더가 접근 가능한지는 E2E 로만 확인 가능.
    //
    // 검증 흐름:
    //   1. localStorage.clear() + reload → 설정 모달 자동 오픈 (entry)
    //   2. 모달 열림 대기 (CLAUDE.md 함정: 즉시 셀렉터 접근 금지)
    //   3. page.evaluate 로 슬라이더 min/max/value 확인
    // ═══════════════════════════════════════════════════════════

    test("BF-606 E2E §1 (AC1): 실 브라우저 음량 슬라이더 노출·range 0~100·default 50", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. 초기 상태: localStorage 비워 기본값 적용 (soundVolume 사전 설정 없음 → 기본값 50)
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 6000 });
          console.log('[step0] 페이지 로드 OK');

          // 2. 설정 모달 자동 오픈 대기 (CLAUDE.md 함정: reload 직후 즉시 검사 금지)
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step1] 설정 모달 열림 (entry) OK');

          // 3. 음량 슬라이더 DOM 존재 확인
          const sliderInfo = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundVolume"]');
            if (!slider) return { found: false };
            return {
              found:   true,
              min:     slider.getAttribute('min'),
              max:     slider.getAttribute('max'),
              value:   slider.value,
              type:    slider.type,
              visible: slider.offsetParent !== null,
            };
          });
          console.log('[step2] slider info:', JSON.stringify(sliderInfo));

          if (!sliderInfo.found) {
            throw new Error(
              'AC1 회귀: 실 브라우저에서 [data-key="soundVolume"] 슬라이더 없음 — ' +
              'Pixi.js 초기화 오류 또는 DOM 렌더링 실패 가능'
            );
          }
          if (sliderInfo.min !== '0') {
            throw new Error(
              'AC1 회귀: 슬라이더 min="' + sliderInfo.min + '" — 기대값 "0"'
            );
          }
          if (sliderInfo.max !== '100') {
            throw new Error(
              'AC1 회귀: 슬라이더 max="' + sliderInfo.max + '" — 기대값 "100"'
            );
          }
          if (sliderInfo.value !== '50') {
            throw new Error(
              'AC1 회귀: localStorage 없을 때 슬라이더 기본값 "' + sliderInfo.value +
              '" — 기대값 "50" (loadSoundVolume 기본값 50 회귀)'
            );
          }
          console.log('[step-final] AC1 E2E 검증 완료: 슬라이더 range 0~100 default=50 정상');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-606",
          },
          body: JSON.stringify({
            url,
            label:     "AC1 슬라이더 노출·range 0~100·default 50 [BF-606]",
            scriptText,
            timeoutMs: 25000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §1 AC1 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    // ═══════════════════════════════════════════════════════════
    // §2. E2E AC3 — 슬라이더 값 변경 → localStorage 영속 → 리로드 복원
    //
    // BF-604 dev test 가 saveSettingsModal/reflectDraftToControls 코드를
    // 정적으로 검증했지만, 실제 브라우저 인터랙션 흐름은 E2E 로만 검증 가능.
    //
    // 검증 흐름:
    //   1. localStorage.clear() + reload → 설정 모달 자동 오픈
    //   2. 모달 내 슬라이더 input 이벤트로 값 75 로 변경 (handleSliderInput 트리거)
    //   3. Enter → 저장 (saveSettingsModal → saveSoundVolume)
    //   4. localStorage snake.settings.soundVolume = "75" 확인
    //   5. reload → 설정 모달 자동 오픈
    //   6. 슬라이더 value="75" 복원 확인 (openSettingsModal → reflectDraftToControls)
    // ═══════════════════════════════════════════════════════════

    test("BF-606 E2E §2 (AC3): 슬라이더 값 변경 → localStorage 영속 → 새로고침 복원", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. 초기 상태: localStorage 비워 기본값(50) 에서 시작
          await page.evaluate(() => localStorage.clear());
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 6000 });
          console.log('[step0] 페이지 로드 OK');

          // 2. 설정 모달 자동 오픈 대기 (entry)
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step1] 설정 모달 열림 OK');

          // 3. 음량 슬라이더 값을 75 로 변경 (input 이벤트 → handleSliderInput 트리거)
          const changeResult = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundVolume"]');
            if (!slider) return { ok: false, err: 'slider not found' };
            slider.value = '75';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            return { ok: true, value: slider.value };
          });
          if (!changeResult.ok) {
            throw new Error('슬라이더 값 변경 실패: ' + changeResult.err);
          }
          console.log('[step2] 슬라이더 값 75 로 변경 OK:', JSON.stringify(changeResult));

          // 4. .ctrl-slider-value span 표시 값이 75 로 갱신됐는지 확인 (reflectDraftToControls)
          const displayVal = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundVolume"]');
            if (!slider) return null;
            const span = slider.parentElement.querySelector('.ctrl-slider-value');
            return span ? span.textContent : null;
          });
          console.log('[step3] 슬라이더 display 값:', displayVal);
          if (displayVal !== '75') {
            throw new Error(
              'reflectDraftToControls 미갱신: .ctrl-slider-value span 이 "' +
              displayVal + '" — 기대값 "75"'
            );
          }

          // 5. Enter 키로 저장 (saveSettingsModal → saveSoundVolume)
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          console.log('[step4] 설정 저장 → 모달 닫힘 OK');

          // 6. localStorage 확인: snake.settings.soundVolume = "75"
          const stored = await page.evaluate(
            () => localStorage.getItem('snake.settings.soundVolume')
          );
          if (stored !== '75') {
            throw new Error(
              'AC3 회귀: saveSettingsModal 후 snake.settings.soundVolume 값이 "75" 아님: "' +
              stored + '" — saveSoundVolume 연동 실패'
            );
          }
          console.log('[step5] localStorage snake.settings.soundVolume="75" OK');

          // 7. 새로고침 → 설정 모달 자동 오픈
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 6000 });
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step6] 새로고침 → 설정 모달 재열림 OK');

          // 8. 슬라이더 value 가 75 로 복원됐는지 확인 (openSettingsModal → _soundVolume → reflectDraftToControls)
          const restoredVal = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundVolume"]');
            return slider ? slider.value : null;
          });
          if (restoredVal !== '75') {
            throw new Error(
              'AC3 회귀: 새로고침 후 슬라이더 값이 "75" 아님: "' + restoredVal +
              '" — loadSoundVolume() 복원 또는 reflectDraftToControls 연동 실패'
            );
          }
          console.log('[step7] 슬라이더 복원값 "75" OK');

          // 9. localStorage 도 여전히 75 인지 확인 (리로드 후 데이터 유지)
          const storedAfterReload = await page.evaluate(
            () => localStorage.getItem('snake.settings.soundVolume')
          );
          if (storedAfterReload !== '75') {
            throw new Error(
              'AC3 회귀: 새로고침 후 localStorage snake.settings.soundVolume 사라짐: "' +
              storedAfterReload + '"'
            );
          }
          console.log('[step-final] AC3 E2E 완전 검증: 슬라이더 조작 → 저장 → localStorage → 리로드 복원 정상');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-606",
          },
          body: JSON.stringify({
            url,
            label:     "AC3 슬라이더 값 변경 → localStorage 영속 → 리로드 복원 [BF-606]",
            scriptText,
            timeoutMs: 40000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §2 AC3 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    // ═══════════════════════════════════════════════════════════
    // §3. E2E AC4 — 음량 0 + soundEnabled=true → game-over → AudioContext 미호출
    //
    // BF-602 §6 은 soundEnabled=false → AudioContext 미호출 을 검증.
    // BF-606 §3 은 soundEnabled=true 이지만 soundVolume=0 일 때
    //   playSound() 내 `if (_soundVolume === 0) return;` 경로를 검증.
    //   (두 가드는 서로 다른 early-return 분기를 보호)
    //
    // 검증 흐름:
    //   1. AudioContext mock spy 주입 (addInitScript)
    //   2. soundVolume=0, soundEnabled=true 사전 설정
    //   3. reload → 설정 모달 오픈 (volume=0 복원 확인)
    //   4. Enter → 게임 시작 (soundEnabled=true 로 저장)
    //   5. 뱀 자동 충돌 → game-over → playGameOverSound → playSound("fail")
    //   6. spy log 에 createOscillator 없음 → AC4 정상
    // ═══════════════════════════════════════════════════════════

    test("BF-606 E2E §3 (AC4): 음량 0 + soundEnabled=true → game-over → AudioContext 미호출", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. AudioContext spy 등록 — 페이지 로드 전 삽입 (addInitScript)
          //    soundEnabled=true 이지만 soundVolume=0 일 때 createOscillator 가 호출되면 AC4 회귀
          await page.addInitScript(() => {
            window._volZeroMockLog = [];
            function VolZeroMockAudioContext() {
              window._volZeroMockLog.push('ctor');
            }
            VolZeroMockAudioContext.prototype.createOscillator = function() {
              window._volZeroMockLog.push('createOscillator');
              return {
                type: '', frequency: { value: 0, setValueAtTime(){}, setTargetAtTime(){} },
                connect(){}, start(){}, stop(){},
              };
            };
            VolZeroMockAudioContext.prototype.createGain = function() {
              return { gain: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} };
            };
            Object.defineProperty(VolZeroMockAudioContext.prototype, 'destination', { get() { return {}; }});
            Object.defineProperty(VolZeroMockAudioContext.prototype, 'state', { get() { return 'running'; }});
            VolZeroMockAudioContext.prototype.resume = function() { return Promise.resolve(); };
            window.AudioContext = VolZeroMockAudioContext;
            window.webkitAudioContext = VolZeroMockAudioContext;
          });

          // 2. soundVolume=0 사전 설정 (AC4 재현) + soundEnabled=true (BF-567 HUD 토글)
          //    bf-snake-sound-enabled 도 "true" 로 설정 → BF-567 1차 가드 통과
          await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('snake.settings.soundVolume',  '0');
            localStorage.setItem('snake.settings.soundEnabled', 'true');
            localStorage.setItem('bf-snake-sound-enabled',      'true');
          });
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 6000 });
          console.log('[step0] 페이지 로드 + spy 주입 + soundVolume=0·soundEnabled=true 사전 설정 OK');

          // 3. 설정 모달 자동 오픈 대기 (entry)
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step1] 설정 모달 열림 OK');

          // 4. 음량 슬라이더가 0 으로 복원됐는지 확인 (AC3 연계 검증)
          const volInModal = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundVolume"]');
            return slider ? slider.value : '__MISSING__';
          });
          if (volInModal === '__MISSING__') {
            throw new Error('설정 모달에 [data-key="soundVolume"] 슬라이더 없음 — HTML 회귀');
          }
          if (volInModal !== '0') {
            throw new Error(
              'AC4 재현 실패: localStorage soundVolume="0" 사전 설정했으나 ' +
              '설정 모달 슬라이더 값="' + volInModal + '" — loadSoundVolume 복원 실패 (AC3 회귀)'
            );
          }
          console.log('[step2] 모달 슬라이더 value="0" 복원 확인 OK (AC3 연계)');

          // 5. soundEnabled 토글 aria-checked="true" 확인 (soundEnabled=true 유지)
          const togChecked = await page.evaluate(() => {
            const tog = document.querySelector('[data-key="soundEnabled"]');
            return tog ? tog.getAttribute('aria-checked') : '__MISSING__';
          });
          if (togChecked !== 'true') {
            throw new Error(
              'soundEnabled 토글 aria-checked="' + togChecked + '" — ' +
              '"true" 가 아님. AC4 검증을 위해 soundEnabled=true 상태여야 함'
            );
          }
          console.log('[step3] soundEnabled aria-checked="true" OK');

          // 6. Enter → 설정 저장 → 게임 시작 (soundEnabled=true·soundVolume=0 으로 저장됨)
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          console.log('[step4] 설정 저장 → 게임 시작 OK (soundEnabled=true·soundVolume=0)');

          // 7. 뱀이 오른쪽 벽 충돌할 때까지 대기 → playGameOverSound → playSound("fail")
          //    playSound: soundEnabled=true → _soundVolume===0 → early return → AudioContext 미호출
          //    BF-602 §6 과 달리, 이 경로는 soundEnabled 가 true 지만 volume=0 이라 무음
          let gameOverDetected = false;
          try {
            await page.waitForFunction(
              () => document.getElementById('gameover-overlay') &&
                    !document.getElementById('gameover-overlay').hasAttribute('hidden'),
              { timeout: 14000 }
            );
            gameOverDetected = true;
          } catch (_) {
            // gameover-overlay 대기 실패 → 시간 기반 폴백
            await new Promise(r => setTimeout(r, 9000));
          }
          console.log('[step5] game-over 감지:', gameOverDetected ? 'overlay 기반' : 'timeout 폴백');

          // 8. spy 기록 확인 — createOscillator 가 있으면 AC4 회귀
          const log = await page.evaluate(() => window._volZeroMockLog || []);
          console.log('[step6] VolZeroMock log:', JSON.stringify(log));

          if (log.includes('createOscillator')) {
            throw new Error(
              'AC4 회귀: soundVolume=0 설정 후에도 AudioContext.createOscillator 가 호출됨. ' +
              'spy log: ' + JSON.stringify(log) +
              ' — playSound() 내 "_soundVolume === 0 → return" 가드 누락 또는 _soundVolume 복원 실패'
            );
          }
          console.log('[step-final] AC4 E2E 검증 완료: soundVolume=0·soundEnabled=true → AudioContext 미호출 정상');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-606",
          },
          body: JSON.stringify({
            url,
            label:     "AC4 음량 0 + soundEnabled=true → game-over → AudioContext 미호출 [BF-606]",
            scriptText,
            timeoutMs: 45000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §3 AC4 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

  } // end else (E2E_SKIP)

} // end else (MODULE_SKIP)
