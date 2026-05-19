// BF-616 · snake 사운드 피치 E2E 회귀 가드
//
// AC 매핑 (BF-614 구현 기준):
//   AC1 — 실 브라우저에서 피치 슬라이더 노출·range 0.5~2.0·step 0.1·default 1.0 E2E 확인
//   AC3 — 피치 값 변경 → 저장 → localStorage 영속 + 새로고침 후 복원 E2E 확인
//   AC4 — soundEnabled=false + pitch=2.0 → game-over → AudioContext 미호출 (BF-602 회귀 가드)
//   AC5 — 음량·피치 동시 변경 → 각각 독립 localStorage 영속 확인
//
// 중복 금지 범위 (BF-614 dev test 이 이미 검증):
//   data-key="soundPitch" 정적 HTML 존재, type/min/max/step/value 속성,
//   loadSoundPitch/saveSoundPitch 함수 정의, try-catch, localStorage 키 상수,
//   _soundPitch 변수 초기화, handleSliderInput·saveSettingsModal·openSettingsModal
//   soundPitch 연동, playSound() 내 _soundPitch × frequency, 게이트 순서
//   — 이 항목들은 본 파일에서 일절 작성 금지.
//
// tester 고유 영역:
//   1. E2E AC1 — 브라우저 내 피치 슬라이더 DOM 실렌더링·범위·default 확인
//   2. E2E AC3 — 슬라이더 조작(input 이벤트) → 저장 → localStorage 확인 → 리로드 복원
//   3. E2E AC4 — soundEnabled=false + pitch=2.0 → game-over → createOscillator 미호출
//   4. E2E AC5 — 음량·피치 동시 변경 → 각각 독립 영속 확인
//   5. Module scope guard (BRIX_TEST_MODULE≠snake → 전체 skip)
//   6. CI 결정성 (e2e-runner 도달 불가 또는 BRIX_E2E_SKIP=1 → t.skip())
//
// [CLAUDE.md 함정] snake 설정 모달이 게임 진입 시 자동 오픈 (source="entry").
//   localStorage.clear()+reload() 직후 즉시 셀렉터 검사 금지 —
//   waitForFunction 으로 모달 열림 확인 후 작업.
//
// 실행: node --test tests/snake-BF616-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/snake-BF616-e2e.test.js

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
  describe("BF-616 (module scope skip)", () => {
    test("BRIX_TEST_MODULE 불일치 — 전체 skip", (t) =>
      t.skip(`BRIX_TEST_MODULE=${TEST_MODULE} ≠ snake — BF-616 가드 스킵`));
  });
} else {

  // ─────────────────────────────────────────────────────────────
  // 헬퍼: e2e-runner 도달 가능 여부 확인 (2초 타임아웃)
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
  // 헬퍼: persona host 결정 (CLAUDE.md: localhost 금지)
  // ─────────────────────────────────────────────────────────────
  function personaHost() {
    return (
      process.env.BRIX_PERSONA_HOST ??
      process.env.BRIX_WORKER_HOSTNAME ??
      "worker"
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 헬퍼: 정적 파일 HTTP 서버 구동 (0.0.0.0, random port)
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
    test("[E2E] BF-616 BRIX_E2E_SKIP=1 — 전체 E2E skip (CI 결정성)", (t) =>
      t.skip("BRIX_E2E_SKIP=1"));
  } else {

    // ═══════════════════════════════════════════════════════════
    // §1. E2E AC1 — 실 브라우저 피치 슬라이더 노출·range·default
    //
    // BF-614 dev test 가 정적 HTML 속성을 검증했지만,
    // Pixi.js 초기화 포함 실 브라우저에서 DOM 이 정상 렌더링되고
    // 설정 모달 내 피치 슬라이더가 접근 가능한지는 E2E 로만 확인 가능.
    //
    // 검증 흐름:
    //   1. localStorage.clear() + reload → 설정 모달 자동 오픈 (entry)
    //   2. 모달 열림 대기 (CLAUDE.md 함정: 즉시 셀렉터 접근 금지)
    //   3. page.evaluate 로 슬라이더 min/max/step/value 확인
    //   4. Note: default value → reflectDraftToControls 가 String(1.0)="1" 로 세팅
    // ═══════════════════════════════════════════════════════════

    test("BF-616 E2E §1 (AC1): 실 브라우저 피치 슬라이더 노출·range 0.5~2.0·step 0.1·default 1.0", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port   = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. localStorage 비워 기본값(soundPitch=1.0) 적용
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

          // 3. 피치 슬라이더 DOM 존재 및 속성 확인
          const sliderInfo = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            if (!slider) return { found: false };
            return {
              found:   true,
              min:     slider.getAttribute('min'),
              max:     slider.getAttribute('max'),
              step:    slider.getAttribute('step'),
              value:   slider.value,           // reflectDraftToControls 세팅 후 DOM value
              type:    slider.type,
              visible: slider.offsetParent !== null,
            };
          });
          console.log('[step2] pitch slider info:', JSON.stringify(sliderInfo));

          if (!sliderInfo.found) {
            throw new Error(
              'AC1 회귀: 실 브라우저에서 [data-key="soundPitch"] 슬라이더 없음 — ' +
              'Pixi.js 초기화 오류 또는 DOM 렌더링 실패 가능'
            );
          }
          if (sliderInfo.type !== 'range') {
            throw new Error('AC1 회귀: 피치 슬라이더 type="' + sliderInfo.type + '" — 기대값 "range"');
          }
          if (sliderInfo.min !== '0.5') {
            throw new Error('AC1 회귀: 피치 슬라이더 min="' + sliderInfo.min + '" — 기대값 "0.5"');
          }
          if (sliderInfo.max !== '2.0') {
            throw new Error('AC1 회귀: 피치 슬라이더 max="' + sliderInfo.max + '" — 기대값 "2.0"');
          }
          if (sliderInfo.step !== '0.1') {
            throw new Error('AC1 회귀: 피치 슬라이더 step="' + sliderInfo.step + '" — 기대값 "0.1"');
          }
          // reflectDraftToControls: String(1.0) = "1" (JS coercion)
          // loadSoundPitch() → 1.0 → draftSettings.soundPitch = 1.0 → slider.value = "1"
          const defaultOk = sliderInfo.value === '1' || sliderInfo.value === '1.0';
          if (!defaultOk) {
            throw new Error(
              'AC1 회귀: localStorage 없을 때 피치 슬라이더 기본값 "' + sliderInfo.value +
              '" — 기대값 "1" 또는 "1.0" (loadSoundPitch 기본값 1.0 회귀)'
            );
          }

          // 4. .ctrl-slider-value span 이 "1.0" (toFixed(1)) 표시 확인
          const displayVal = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            if (!slider) return null;
            const span = slider.parentElement.querySelector('.ctrl-slider-value');
            return span ? span.textContent : null;
          });
          console.log('[step3] 피치 display span:', displayVal);
          if (displayVal !== '1.0') {
            throw new Error(
              'AC1 회귀: .ctrl-slider-value span 이 "1.0" 아님: "' + displayVal +
              '" — reflectDraftToControls 의 p.toFixed(1) 포맷 회귀'
            );
          }
          console.log('[step-final] AC1 E2E 검증 완료: 피치 슬라이더 range 0.5~2.0 step=0.1 default=1.0 정상');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-616",
          },
          body: JSON.stringify({
            url,
            label:     "AC1 피치 슬라이더 노출·range 0.5~2.0·step 0.1·default 1.0 [BF-616]",
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
    // §2. E2E AC3 — 피치 슬라이더 값 변경 → localStorage 영속 → 리로드 복원
    //
    // BF-614 dev test 가 saveSettingsModal/reflectDraftToControls 코드를
    // 정적으로 검증했지만, 실제 브라우저 인터랙션 흐름은 E2E 로만 검증 가능.
    //
    // 검증 흐름:
    //   1. localStorage.clear() + reload → 설정 모달 자동 오픈
    //   2. 피치 슬라이더를 1.5 로 변경 (input 이벤트 → handleSliderInput)
    //   3. .ctrl-slider-value span 이 "1.5" 로 갱신됐는지 확인
    //   4. Enter → 저장 (saveSettingsModal → saveSoundPitch)
    //   5. localStorage snake.settings.soundPitch = "1.5" 확인
    //   6. reload → 설정 모달 자동 오픈
    //   7. 피치 슬라이더 value="1.5" 복원 확인 (openSettingsModal → reflectDraftToControls)
    // ═══════════════════════════════════════════════════════════

    test("BF-616 E2E §2 (AC3): 피치 슬라이더 값 변경 → localStorage 영속 → 새로고침 복원", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port   = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. localStorage 비워 기본값에서 시작
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

          // 3. 피치 슬라이더를 1.5 로 변경 (input 이벤트 → handleSliderInput 트리거)
          const changeResult = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            if (!slider) return { ok: false, err: 'slider not found' };
            slider.value = '1.5';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            return { ok: true, value: slider.value };
          });
          if (!changeResult.ok) {
            throw new Error('피치 슬라이더 값 변경 실패: ' + changeResult.err);
          }
          console.log('[step2] 피치 슬라이더 1.5 로 변경 OK:', JSON.stringify(changeResult));

          // 4. .ctrl-slider-value span 표시값이 "1.5" (toFixed(1)) 로 갱신됐는지 확인
          const displayVal = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            if (!slider) return null;
            const span = slider.parentElement.querySelector('.ctrl-slider-value');
            return span ? span.textContent : null;
          });
          console.log('[step3] 피치 display span:', displayVal);
          if (displayVal !== '1.5') {
            throw new Error(
              'reflectDraftToControls 미갱신: .ctrl-slider-value span 이 "' +
              displayVal + '" — 기대값 "1.5" (handleSliderInput → reflectDraftToControls 연동 회귀)'
            );
          }

          // 5. Enter 키로 저장 (saveSettingsModal → saveSoundPitch)
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          console.log('[step4] 설정 저장 → 모달 닫힘 OK');

          // 6. localStorage 확인: snake.settings.soundPitch = "1.5"
          const stored = await page.evaluate(
            () => localStorage.getItem('snake.settings.soundPitch')
          );
          if (stored !== '1.5') {
            throw new Error(
              'AC3 회귀: saveSettingsModal 후 snake.settings.soundPitch 값이 "1.5" 아님: "' +
              stored + '" — saveSoundPitch 연동 실패'
            );
          }
          console.log('[step5] localStorage snake.settings.soundPitch="1.5" OK');

          // 7. 새로고침 → 설정 모달 자동 오픈
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 6000 });
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step6] 새로고침 → 설정 모달 재열림 OK');

          // 8. 피치 슬라이더 value 가 "1.5" 로 복원됐는지 확인
          //    openSettingsModal → draftSettings.soundPitch = _soundPitch(1.5) → reflectDraftToControls
          const restoredVal = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            return slider ? slider.value : null;
          });
          if (restoredVal !== '1.5') {
            throw new Error(
              'AC3 회귀: 새로고침 후 피치 슬라이더 값이 "1.5" 아님: "' + restoredVal +
              '" — loadSoundPitch() 복원 또는 reflectDraftToControls 연동 실패'
            );
          }
          console.log('[step7] 피치 슬라이더 복원값 "1.5" OK');

          // 9. display span 도 "1.5" 인지 확인
          const restoredDisplay = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            if (!slider) return null;
            const span = slider.parentElement.querySelector('.ctrl-slider-value');
            return span ? span.textContent : null;
          });
          if (restoredDisplay !== '1.5') {
            throw new Error(
              'AC3 회귀: 새로고침 후 .ctrl-slider-value span 이 "1.5" 아님: "' +
              restoredDisplay + '"'
            );
          }
          console.log('[step8] 피치 display span 복원값 "1.5" OK');

          // 10. localStorage 도 여전히 1.5 인지 확인 (리로드 후 데이터 유지)
          const storedAfterReload = await page.evaluate(
            () => localStorage.getItem('snake.settings.soundPitch')
          );
          if (storedAfterReload !== '1.5') {
            throw new Error(
              'AC3 회귀: 새로고침 후 localStorage snake.settings.soundPitch 사라짐: "' +
              storedAfterReload + '"'
            );
          }
          console.log('[step-final] AC3 E2E 완전 검증: 피치 변경 → 저장 → localStorage → 리로드 복원 정상');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-616",
          },
          body: JSON.stringify({
            url,
            label:     "AC3 피치 슬라이더 변경 → localStorage 영속 → 리로드 복원 [BF-616]",
            scriptText,
            timeoutMs: 45000,
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
    // §3. E2E AC4 — soundEnabled=false + pitch=2.0 → AudioContext 미호출
    //
    // BF-602 §6 은 soundEnabled=false → AudioContext 미호출 을 검증.
    // BF-616 §3 은 여기에 더해 pitch=2.0 (비기본값) 이어도
    //   _soundPitch 가 soundEnabled 게이트를 우회하지 않는 것을 검증.
    //   즉, 피치 구현(BF-614) 이 기존 BF-602 무음 가드를 깨지 않음을 보장.
    //
    // 검증 흐름:
    //   1. AudioContext mock spy 주입 (addInitScript)
    //   2. soundPitch=2.0, soundEnabled=false 사전 설정
    //   3. reload → 설정 모달 오픈 (pitch=2.0 복원 확인)
    //   4. soundEnabled 토글 aria-checked="false" 확인
    //   5. Enter → 게임 시작 (soundEnabled=false·soundPitch=2.0 저장)
    //   6. 뱀 자동 충돌 → game-over → playGameOverSound → playSound("fail")
    //   7. spy log 에 createOscillator 없음 → AC4 정상
    // ═══════════════════════════════════════════════════════════

    test("BF-616 E2E §3 (AC4): soundEnabled=false + pitch=2.0 → game-over → AudioContext 미호출", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port   = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. AudioContext spy 주입 — 페이지 로드 전 삽입 (addInitScript)
          //    soundEnabled=false 일 때 playSound() 최초 게이트에서 리턴해야 함
          //    pitch=2.0 이 이 게이트를 우회하면 AC4(BF-602) 회귀
          await page.addInitScript(() => {
            window._pitchMuteLog = [];
            function PitchMuteAudioContext() {
              window._pitchMuteLog.push('ctor');
            }
            PitchMuteAudioContext.prototype.createOscillator = function() {
              window._pitchMuteLog.push('createOscillator');
              return {
                type: '', frequency: { value: 0, setValueAtTime(){}, setTargetAtTime(){} },
                connect(){}, start(){}, stop(){},
              };
            };
            PitchMuteAudioContext.prototype.createGain = function() {
              return { gain: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} };
            };
            Object.defineProperty(PitchMuteAudioContext.prototype, 'destination', { get() { return {}; }});
            Object.defineProperty(PitchMuteAudioContext.prototype, 'state', { get() { return 'running'; }});
            PitchMuteAudioContext.prototype.resume = function() { return Promise.resolve(); };
            window.AudioContext = PitchMuteAudioContext;
            window.webkitAudioContext = PitchMuteAudioContext;
          });

          // 2. soundPitch=2.0 (비기본값) + soundEnabled=false 사전 설정
          //    bf-snake-sound-enabled 도 "false" 로 설정 → BF-567 HUD 1차 게이트 통과
          await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('snake.settings.soundPitch',   '2');
            localStorage.setItem('snake.settings.soundEnabled', 'false');
            localStorage.setItem('bf-snake-sound-enabled',      'false');
          });
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 6000 });
          console.log('[step0] 페이지 로드 + spy 주입 + soundPitch=2.0·soundEnabled=false 사전 설정 OK');

          // 3. 설정 모달 자동 오픈 대기 (entry)
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step1] 설정 모달 열림 OK');

          // 4. 피치 슬라이더가 2.0 으로 복원됐는지 확인 (AC3 연계 검증)
          //    loadSoundPitch("2") → 2 → _soundPitch=2 → draftSettings.soundPitch=2
          //    reflectDraftToControls: String(2)="2" → slider.value="2"
          const pitchInModal = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            return slider ? slider.value : '__MISSING__';
          });
          if (pitchInModal === '__MISSING__') {
            throw new Error('설정 모달에 [data-key="soundPitch"] 슬라이더 없음 — HTML 회귀');
          }
          // String(2) = "2", String(2.0) = "2" — localStorage "2" 가 복원되면 "2" 로 표시
          const pitchOk = pitchInModal === '2' || pitchInModal === '2.0';
          if (!pitchOk) {
            throw new Error(
              'AC4 재현 실패: localStorage soundPitch="2" 사전 설정했으나 ' +
              '피치 슬라이더 값="' + pitchInModal + '" — loadSoundPitch 복원 실패 (AC3 회귀)'
            );
          }
          console.log('[step2] 모달 피치 슬라이더 value="2" 복원 확인 OK (AC3 연계)');

          // 5. soundEnabled 토글 aria-checked="false" 확인 (soundEnabled=false 유지)
          const togChecked = await page.evaluate(() => {
            const tog = document.querySelector('[data-key="soundEnabled"]');
            return tog ? tog.getAttribute('aria-checked') : '__MISSING__';
          });
          if (togChecked !== 'false') {
            throw new Error(
              'soundEnabled 토글 aria-checked="' + togChecked + '" — ' +
              '"false" 가 아님. AC4 검증을 위해 soundEnabled=false 상태여야 함'
            );
          }
          console.log('[step3] soundEnabled aria-checked="false" OK');

          // 6. Enter → 설정 저장 → 게임 시작 (soundEnabled=false·soundPitch=2.0 으로 저장됨)
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          console.log('[step4] 설정 저장 → 게임 시작 OK (soundEnabled=false·soundPitch=2.0)');

          // 7. 뱀이 벽 충돌할 때까지 대기 → playGameOverSound → playSound("fail")
          //    playSound: !loadSettingsSoundEnabled() → early return → AudioContext 미호출
          //    pitch=2.0 이 이 경로에서 createOscillator 를 호출하면 AC4(BF-602) 회귀
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

          // 8. spy 기록 확인 — createOscillator 가 있으면 AC4(BF-602) 회귀
          const log = await page.evaluate(() => window._pitchMuteLog || []);
          console.log('[step6] PitchMuteMock log:', JSON.stringify(log));

          if (log.includes('createOscillator')) {
            throw new Error(
              'AC4(BF-602) 회귀: soundEnabled=false + pitch=2.0 설정 후에도 ' +
              'AudioContext.createOscillator 가 호출됨. ' +
              'spy log: ' + JSON.stringify(log) +
              ' — playSound() 내 loadSettingsSoundEnabled() 게이트가 _soundPitch 경로를 막지 못함'
            );
          }
          console.log('[step-final] AC4 E2E 검증 완료: soundEnabled=false + pitch=2.0 → AudioContext 미호출 정상');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-616",
          },
          body: JSON.stringify({
            url,
            label:     "AC4 soundEnabled=false + pitch=2.0 → game-over → AudioContext 미호출 [BF-616]",
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

    // ═══════════════════════════════════════════════════════════
    // §4. E2E AC5 — 음량·피치 동시 변경 → 각각 독립 localStorage 영속
    //
    // BF-614 §3-5 는 gain 경로와 frequency 경로가 별도 변수임을 정적으로 검증.
    // BF-616 §4 는 실 브라우저에서 두 슬라이더를 동시 변경했을 때
    //   각 값이 서로 영향 없이 독립적으로 localStorage 에 영속되는지 E2E 검증.
    //
    // 검증 흐름:
    //   1. localStorage.clear() + reload → 설정 모달 자동 오픈
    //   2. 음량 슬라이더를 75 로 변경 (input 이벤트)
    //   3. 피치 슬라이더를 0.5 로 변경 (input 이벤트)
    //   4. Enter → 저장
    //   5. localStorage: soundVolume="75", soundPitch="0.5" 각각 확인
    //   6. reload → 설정 모달 자동 오픈
    //   7. 음량 슬라이더 value="75", 피치 슬라이더 value="0.5" 각각 독립 복원 확인
    // ═══════════════════════════════════════════════════════════

    test("BF-616 E2E §4 (AC5): 음량·피치 동시 변경 → 각각 독립 localStorage 영속 + 리로드 복원", async (t) => {
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port   = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/snake/`;
        const scriptText = `
          // 1. localStorage 비워 기본값에서 시작
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

          // 3. 음량 슬라이더를 75 로 변경 (input 이벤트 → handleSliderInput)
          const volChange = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundVolume"]');
            if (!slider) return { ok: false, err: 'soundVolume slider not found' };
            slider.value = '75';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            return { ok: true, value: slider.value };
          });
          if (!volChange.ok) throw new Error('음량 슬라이더 변경 실패: ' + volChange.err);
          console.log('[step2] 음량 슬라이더 75 로 변경 OK:', JSON.stringify(volChange));

          // 4. 피치 슬라이더를 0.5 로 변경 (input 이벤트 → handleSliderInput)
          const pitchChange = await page.evaluate(() => {
            const slider = document.querySelector('[data-key="soundPitch"]');
            if (!slider) return { ok: false, err: 'soundPitch slider not found' };
            slider.value = '0.5';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            return { ok: true, value: slider.value };
          });
          if (!pitchChange.ok) throw new Error('피치 슬라이더 변경 실패: ' + pitchChange.err);
          console.log('[step3] 피치 슬라이더 0.5 로 변경 OK:', JSON.stringify(pitchChange));

          // 5. 음량 변경 후 피치가 영향받지 않았는지 확인 (독립성 중간 검증)
          const independence = await page.evaluate(() => {
            const vol   = document.querySelector('[data-key="soundVolume"]');
            const pitch = document.querySelector('[data-key="soundPitch"]');
            return {
              volValue:   vol   ? vol.value   : null,
              pitchValue: pitch ? pitch.value : null,
            };
          });
          console.log('[step4] 독립성 확인:', JSON.stringify(independence));
          if (independence.volValue !== '75') {
            throw new Error('AC5 회귀: 음량 슬라이더 값이 피치 변경 후 "' + independence.volValue + '" — 기대값 "75"');
          }
          if (independence.pitchValue !== '0.5') {
            throw new Error('AC5 회귀: 피치 슬라이더 값이 음량 변경 후 "' + independence.pitchValue + '" — 기대값 "0.5"');
          }

          // 6. Enter 키로 저장 (saveSettingsModal → saveSoundVolume + saveSoundPitch)
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 5000 }
          );
          console.log('[step5] 설정 저장 → 모달 닫힘 OK');

          // 7. localStorage 각각 독립 확인
          const stored = await page.evaluate(() => ({
            vol:   localStorage.getItem('snake.settings.soundVolume'),
            pitch: localStorage.getItem('snake.settings.soundPitch'),
          }));
          console.log('[step6] localStorage 저장값:', JSON.stringify(stored));

          if (stored.vol !== '75') {
            throw new Error(
              'AC5 회귀: snake.settings.soundVolume="' + stored.vol +
              '" — 기대값 "75" (피치 저장이 음량 값을 덮어쓴 회귀 가능성)'
            );
          }
          if (stored.pitch !== '0.5') {
            throw new Error(
              'AC5 회귀: snake.settings.soundPitch="' + stored.pitch +
              '" — 기대값 "0.5" (음량 저장이 피치 값을 덮어쓴 회귀 가능성)'
            );
          }
          console.log('[step7] localStorage 독립 저장 확인: soundVolume="75", soundPitch="0.5" OK');

          // 8. 새로고침 → 설정 모달 자동 오픈
          await page.reload();
          await page.waitForSelector('#settings-trigger', { timeout: 6000 });
          await page.waitForFunction(
            () => !document.getElementById('settings-modal').hasAttribute('hidden'),
            { timeout: 6000 }
          );
          console.log('[step8] 새로고침 → 설정 모달 재열림 OK');

          // 9. 음량·피치 슬라이더 각각 독립 복원 확인
          const restored = await page.evaluate(() => {
            const vol   = document.querySelector('[data-key="soundVolume"]');
            const pitch = document.querySelector('[data-key="soundPitch"]');
            return {
              volValue:   vol   ? vol.value   : null,
              pitchValue: pitch ? pitch.value : null,
            };
          });
          console.log('[step9] 리로드 후 복원값:', JSON.stringify(restored));

          if (restored.volValue !== '75') {
            throw new Error(
              'AC5 회귀: 새로고침 후 음량 슬라이더 "' + restored.volValue +
              '" — 기대값 "75" (loadSoundVolume 복원 실패 또는 피치 복원이 음량 덮어씀)'
            );
          }
          if (restored.pitchValue !== '0.5') {
            throw new Error(
              'AC5 회귀: 새로고침 후 피치 슬라이더 "' + restored.pitchValue +
              '" — 기대값 "0.5" (loadSoundPitch 복원 실패 또는 음량 복원이 피치 덮어씀)'
            );
          }
          console.log('[step-final] AC5 E2E 검증 완료: 음량=75·피치=0.5 독립 저장 + 리로드 복원 정상');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type":     "application/json",
            "X-Brix-Run-Id":   process.env.BRIX_RUN_ID  ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-616",
          },
          body: JSON.stringify({
            url,
            label:     "AC5 음량·피치 동시 변경 → 독립 localStorage 영속 + 리로드 복원 [BF-616]",
            scriptText,
            timeoutMs: 50000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `E2E §4 AC5 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-1500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });

  } // end else (E2E_SKIP)

} // end else (MODULE_SKIP)
