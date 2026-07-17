// BF-987 · /color-switch (=/demo/color-switch) 실 브라우저 E2E 회귀 가드 (tester 소유)
//
// 관련: docs/design/color-switch-BF-979.md(디자인) ·
//       color-switch/{index.html,styles.css,logic.js,main.js}(구현, BF-983, #225 머지).
// 본 파일은 머지된 최종 코드(base=main) 기준으로 e2e-runner 실 브라우저 호출을 통해
// "페이지 렌더 · 게임 시작 · 정답/오답 판정 · 점수/연속 흐름 · 색상+보조 피드백 표시"
// 회귀를 직접 구동해 검증한다.
//
// ── 중복 금지 (dev 가 이미 커버 — 재작성 X) ──────────────────────────────
//   tests/color-switch-BF983.test.js:
//     - vanilla-static file:// 안전 가드(import/export·type=module·fetch/외부 URL·
//       localStorage 0건)
//     - 마크업 계약(title/h1, data-color/data-key/aria-label 4색 버튼, data-role=
//       score/streak/time, rule-banner class+role+aria-live, class=stimulus/
//       stimulus__word, class=feedback+aria-live=assertive, btn-start/btn-restart id,
//       answer-grid/hint class, script 비-module 로드)
//     - CSS 토큰 존재(--sw-green-lit/--sw-blue-dim/--color-success, .answer-btn/
//       .rule-banner/.stimulus, prefers-reduced-motion)
//     - logic.js 순수 함수 전수(라운드 생성 rand 소비 순서, 정답 판정, 점수/연속/
//       최고연속, 카운트다운/게임오버, 재시작, 정답률 집계) — node:vm 로 27케이스 검증
//   → 본 파일은 이 항목들을 정적으로 다시 검증하지 않는다. logic.js 판정 공식의
//     정확성 자체는 이미 단위 테스트로 전수 검증됨 — 여기서는 "실 브라우저에서 그
//     로직이 실제 클릭 입력에 반응해 DOM/HUD/보조 피드백을 갱신하는가"만 관찰한다.
//
// ── 본 파일이 보호하는 대상 (작업 AC) ─────────────────────────────────────
//   AC-render : `/color-switch/` 진입 시 타이틀·HUD(점수 0·연속 0·시간 0:30)·규칙
//               배너(대기 문구)·자극 존("준비")·비활성 응답 그리드가 실제 DOM 으로
//               렌더된다.
//   AC-round  : "시작" 클릭 후 1라운드 정답 입력 → 점수 증가·연속 +1·✓ 아이콘/배지
//               피드백이 나타나고, 자동 다음 라운드 진행 후 오답 입력 → 점수 보존·
//               연속 리셋(↺ 보조 신호)·✗ 배지 + 정답 안내(색상 도형 마크+라벨) 피드백이
//               나타난다. (반응시간 기반 점수 산정은 로직 자체가 아니라 "빠른 입력에
//               점수가 반영되는가"만 관찰)
//   AC-regression : 본 모듈은 독립 정적 디렉터리(color-switch/)로 다른 데모의 라우팅
//               파일을 전혀 참조·수정하지 않음(구현 diff 확인 완료) — E2E 내내 URL 이
//               `/color-switch/` 를 벗어나지 않고 콘솔/페이지 에러 0건인 것으로 자기
//               완결적 회귀 없음을 확인한다.
//
// 결정론 확보 기법 (판정 로직 재검증 아님 — 순수 E2E 시나리오 제어용):
//   page.addInitScript 으로 전역 Math.random 을 가로채 고정 시퀀스를 반환하게 한다.
//   main.js 는 로드 시점에 `var rand = Math.random;` 로 캡처해 그대로 logic.js 에
//   주입하므로, 페이지 최초 스크립트 실행 전에 override 하면 라운드1/라운드2 자극이
//   결정론적으로 생성된다(라운드1: rule=ink/word=red/ink=blue → 정답 blue, 라운드2:
//   rule=word/word=yellow/ink=green → 정답 yellow). 시퀀스 소진 후에는 원본
//   Math.random 으로 폴백 — 이후 라운드 자극은 이 테스트 범위 밖이라 영향 없음.
//
// 실행: node --test tests/color-switch/BF-987-e2e.test.js
// CI:  BRIX_E2E_SKIP=1 node --test tests/color-switch/BF-987-e2e.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 color-switch 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "color-switch";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const MODULE_DIR = path.join(REPO_ROOT, "color-switch");

function readModuleFile(name) {
  return fs.readFileSync(path.join(MODULE_DIR, name), "utf-8");
}

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  // ═══════════════════════════════════════════════════════════
  // §0. 정적 가드 — 본 E2E 스크립트가 직접 의존하는 selector (dev 미검증분만)
  //     dev(BF983) 테스트는 "class=" 값과 aria-label 조합만 확인했다. 아래
  //     data-role 속성들은 main.js 의 querySelector('[data-role="..."]') 가
  //     직접 의존하지만 dev 테스트가 확인하지 않은 것들이라 여기서 고정한다.
  // ═══════════════════════════════════════════════════════════
  test('§0-1 index.html — data-role="answer-grid" 존재 (main.js 가 그리드 잠금을 이 속성으로 읽음)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('data-role="answer-grid"'), 'index.html 에 data-role="answer-grid" 가 없습니다');
  });

  test('§0-2 index.html — data-role="rule-icon"/"rule-text" 존재 (규칙 배너 텍스트를 이 속성으로 갱신)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('data-role="rule-icon"'), 'index.html 에 data-role="rule-icon" 가 없습니다');
    assert.ok(html.includes('data-role="rule-text"'), 'index.html 에 data-role="rule-text" 가 없습니다');
  });

  test('§0-3 index.html — data-role="stimulus"/"stimulus-word" 존재 (자극 렌더가 이 속성으로 대상 탐색)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('data-role="stimulus"'), 'index.html 에 data-role="stimulus" 가 없습니다');
    assert.ok(html.includes('data-role="stimulus-word"'), 'index.html 에 data-role="stimulus-word" 가 없습니다');
  });

  test('§0-4 index.html — data-role="feedback" 존재 (판정 결과 렌더가 이 속성으로 대상 탐색)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('data-role="feedback"'), 'index.html 에 data-role="feedback" 가 없습니다');
  });

  test('§0-5 index.html — data-role="streak-reset" 존재 (연속 리셋 보조 피드백 ↺ 신호, 색맹 접근성)', () => {
    const html = readModuleFile("index.html");
    assert.ok(html.includes('data-role="streak-reset"'), 'index.html 에 data-role="streak-reset" 가 없습니다');
  });

  // ─────────────────────────────────────────────────────────────
  // 실 브라우저 E2E — 렌더 → 시작 → 정답 판정(점수/연속/보조피드백) →
  //                   자동 다음 라운드 → 오답 판정(점수 보존/연속 리셋/보조피드백)
  // ─────────────────────────────────────────────────────────────
  test(
    "BF-987 E2E: /color-switch/ 진입 렌더 + 시작→정답(점수/연속/✓피드백)→다음라운드→오답(점수보존/연속리셋/✗피드백) 여정",
    async (t) => {
      if (process.env.BRIX_E2E_SKIP === "1") {
        t.skip("BRIX_E2E_SKIP=1 — CI 결정성 가드");
        return;
      }
      if (!(await e2eRunnerReachable(t))) return;

      const server = await startStaticServer(REPO_ROOT);
      const port = server.address().port;
      const selfHost = personaHost();

      try {
        const url = `http://${selfHost}:${port}/color-switch/`;
        const scriptText = `
          const consoleErrors = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });
          page.on('pageerror', (err) => {
            consoleErrors.push('pageerror: ' + (err && err.message ? err.message : String(err)));
          });

          // ── STEP 0: 결정론 훅 등록 (페이지 스크립트 실행 전, addInitScript) ──
          // main.js 는 로드 시 var rand = Math.random; 로 현재 Math.random 을 캡처해
          // logic.js 의 generateRound 에 그대로 주입한다. 전역 Math.random 을
          // 고정 시퀀스로 바꾸면 라운드1/2 자극이 결정론적으로 재현된다.
          // 라운드1: rule=ink, word=red, ink=blue → 정답(ink 규칙)=blue
          // 라운드2: rule=word, word=yellow, ink=green → 정답(word 규칙)=yellow
          await page.addInitScript(() => {
            var seq = [0.25, 0.125, 0.875, 0.75, 0.625, 0.375];
            var i = 0;
            var orig = Math.random.bind(Math);
            Math.random = function () {
              if (i < seq.length) return seq[i++];
              return orig();
            };
          });
          await page.reload();
          await page.waitForSelector('[data-rule="idle"]', { timeout: 8000 });

          // ── STEP 1 (AC-render): 초기 idle 렌더 ──
          const initial = await page.evaluate(() => ({
            title: document.title,
            h1: document.querySelector('h1') ? document.querySelector('h1').textContent : '',
            score: document.querySelector('[data-role="score"]').textContent,
            streak: document.querySelector('[data-role="streak"]').textContent,
            time: document.querySelector('[data-role="time"]').textContent,
            ruleIcon: document.querySelector('[data-role="rule-icon"]').textContent,
            ruleText: document.querySelector('[data-role="rule-text"]').textContent,
            stimulusWord: document.querySelector('[data-role="stimulus-word"]').textContent,
            feedbackText: document.querySelector('[data-role="feedback"]').textContent,
            gridDisabled: document.querySelector('[data-role="answer-grid"]').getAttribute('aria-disabled'),
            btnStartDisabled: document.getElementById('btn-start').disabled,
            btnRestartDisabled: document.getElementById('btn-restart').disabled,
            streakResetHidden: document.querySelector('[data-role="streak-reset"]').hidden,
          }));
          if (!initial.title.includes('컬러 스위치') || !initial.h1.includes('컬러 스위치')) {
            throw new Error('AC-render 회귀: title/h1 에 "컬러 스위치" 없음 — title="' + initial.title + '" h1="' + initial.h1 + '"');
          }
          if (initial.score !== '0' || initial.streak !== '0' || initial.time !== '0:30') {
            throw new Error('AC-render 회귀: 초기 HUD 가 점수0/연속0/시간0:30 이 아님 — score=' + initial.score + ' streak=' + initial.streak + ' time=' + initial.time);
          }
          if (initial.ruleIcon !== '🎮' || !initial.ruleText.includes('시작을 눌러')) {
            throw new Error('AC-render 회귀: idle 규칙 배너 문구 불일치 — icon=' + initial.ruleIcon + ' text="' + initial.ruleText + '"');
          }
          if (!initial.stimulusWord.includes('준비')) {
            throw new Error('AC-render 회귀: 자극 존 초기 텍스트가 "준비"가 아님 — "' + initial.stimulusWord + '"');
          }
          if (initial.gridDisabled !== 'true' || initial.btnStartDisabled || !initial.btnRestartDisabled) {
            throw new Error('AC-render 회귀: 초기 컨트롤 상태 불일치 — gridDisabled=' + initial.gridDisabled + ' btnStartDisabled=' + initial.btnStartDisabled + ' btnRestartDisabled=' + initial.btnRestartDisabled);
          }
          if (!initial.streakResetHidden) {
            throw new Error('AC-render 회귀: idle 상태에서 연속 리셋(↺) 신호가 이미 노출됨');
          }
          console.log('[step1] AC-render OK — 타이틀/HUD(0/0/0:30)/규칙배너(idle)/자극(준비)/컨트롤 초기 상태');

          // ── STEP 2: "시작" 클릭 → 라운드1(rule=ink, word=red, ink=blue) 진입 ──
          await page.click('#btn-start');
          await new Promise((r) => setTimeout(r, 100));
          const round1 = await page.evaluate(() => ({
            rule: document.querySelector('.rule-banner').getAttribute('data-rule'),
            ruleText: document.querySelector('[data-role="rule-text"]').textContent,
            stimulusText: document.querySelector('[data-role="stimulus-word"]').textContent,
            stimulusClass: document.querySelector('[data-role="stimulus-word"]').className,
            feedbackText: document.querySelector('[data-role="feedback"]').textContent,
            gridDisabled: document.querySelector('[data-role="answer-grid"]').getAttribute('aria-disabled'),
            blueAriaDisabled: document.querySelector('[data-color="blue"]').getAttribute('aria-disabled'),
            btnStartDisabled: document.getElementById('btn-start').disabled,
            btnRestartDisabled: document.getElementById('btn-restart').disabled,
          }));
          if (round1.rule !== 'ink') {
            throw new Error('AC-round 회귀: 라운드1 규칙이 결정론 시퀀스(ink)와 다름 — ' + round1.rule);
          }
          if (!round1.ruleText.includes('글자 색')) {
            throw new Error('AC-round 회귀: 라운드1 규칙 배너에 "글자 색" 안내 없음 — "' + round1.ruleText + '"');
          }
          if (!round1.stimulusText.includes('빨강')) {
            throw new Error('AC-round 회귀: 라운드1 자극 단어(word=red→"빨강") 불일치 — "' + round1.stimulusText + '"');
          }
          if (round1.stimulusClass.indexOf('ink-blue') === -1) {
            throw new Error('AC-round 회귀: 라운드1 자극 잉크색(ink=blue) 클래스 없음 — "' + round1.stimulusClass + '"');
          }
          if (!round1.feedbackText.includes('글자 색') || !round1.feedbackText.includes('뜻')) {
            throw new Error('AC-round 회귀: 라운드1 안내 피드백에 규칙/트랩 문구 없음 — "' + round1.feedbackText + '"');
          }
          if (round1.gridDisabled !== 'false' || round1.blueAriaDisabled !== null) {
            throw new Error('AC-round 회귀: 라운드1 진입 후 응답 그리드가 여전히 잠김 — gridDisabled=' + round1.gridDisabled + ' blueAriaDisabled=' + round1.blueAriaDisabled);
          }
          if (!round1.btnStartDisabled || round1.btnRestartDisabled) {
            throw new Error('AC-round 회귀: 게임 진행 중 시작/다시하기 버튼 활성 상태 불일치');
          }
          console.log('[step2] 라운드1 진입 OK — rule=ink, word=red("빨강")+ink=blue, 그리드 활성화');

          // ── STEP 3 (AC-round 정답): blue 클릭 → 정답(ink=blue) 판정 ──
          await page.click('[data-color="blue"]');
          await new Promise((r) => setTimeout(r, 80));
          const afterCorrect = await page.evaluate(() => ({
            score: parseInt(document.querySelector('[data-role="score"]').textContent, 10),
            streak: document.querySelector('[data-role="streak"]').textContent,
            feedbackClass: document.querySelector('[data-role="feedback"]').className,
            feedbackIcon: document.querySelector('.feedback__icon') ? document.querySelector('.feedback__icon').textContent : null,
            feedbackGain: document.querySelector('.feedback__gain') ? document.querySelector('.feedback__gain').textContent : null,
            blueClass: document.querySelector('[data-color="blue"]').className,
            blueBadge: document.querySelector('[data-color="blue"] .answer-btn__badge') ? document.querySelector('[data-color="blue"] .answer-btn__badge').textContent : null,
            stimulusClass: document.querySelector('[data-role="stimulus"]').className,
            gridDisabled: document.querySelector('[data-role="answer-grid"]').getAttribute('aria-disabled'),
            streakResetHidden: document.querySelector('[data-role="streak-reset"]').hidden,
          }));
          if (!(afterCorrect.score >= 50 && afterCorrect.score <= 100)) {
            throw new Error('AC-round 회귀: 정답 점수가 기대 범위(50~100) 밖 — score=' + afterCorrect.score);
          }
          if (afterCorrect.streak !== '1') {
            throw new Error('AC-round 회귀: 정답 후 연속(streak) 이 1 이 아님 — ' + afterCorrect.streak);
          }
          if (afterCorrect.feedbackClass.indexOf('feedback--ok') === -1) {
            throw new Error('AC-round 회귀: 정답 피드백 클래스에 feedback--ok 없음 — "' + afterCorrect.feedbackClass + '"');
          }
          if (afterCorrect.feedbackIcon !== '✓') {
            throw new Error('AC-round 회귀: 정답 보조 피드백 아이콘이 ✓ 가 아님 — ' + afterCorrect.feedbackIcon);
          }
          if (!afterCorrect.feedbackGain || afterCorrect.feedbackGain.indexOf('+') === -1) {
            throw new Error('AC-round 회귀: 정답 획득 점수 표시가 없음 — ' + afterCorrect.feedbackGain);
          }
          if (afterCorrect.blueClass.indexOf('is-correct') === -1 || afterCorrect.blueBadge !== '✓') {
            throw new Error('AC-round 회귀: blue 버튼에 is-correct/✓배지 없음 — class="' + afterCorrect.blueClass + '" badge=' + afterCorrect.blueBadge);
          }
          if (afterCorrect.stimulusClass.indexOf('is-correct') === -1) {
            throw new Error('AC-round 회귀: 자극 존에 is-correct 클래스 없음 — "' + afterCorrect.stimulusClass + '"');
          }
          if (afterCorrect.gridDisabled !== 'true') {
            throw new Error('AC-round 회귀: 판정 직후 응답 그리드가 잠기지 않음(locked) — gridDisabled=' + afterCorrect.gridDisabled);
          }
          if (!afterCorrect.streakResetHidden) {
            throw new Error('AC-round 회귀: 정답인데 연속 리셋(↺) 신호가 노출됨');
          }
          console.log('[step3] AC-round(정답) OK — score=' + afterCorrect.score + ', streak=1, ✓아이콘/배지/is-correct 렌더');

          const scoreAfterRound1 = afterCorrect.score;

          // ── STEP 4: 피드백 표시(FEEDBACK_MS=850ms) 후 자동으로 라운드2 진입 ──
          await page.waitForFunction(
            () => document.querySelector('.rule-banner').getAttribute('data-rule') === 'word',
            { timeout: 5000 },
          );
          const round2 = await page.evaluate(() => ({
            ruleText: document.querySelector('[data-role="rule-text"]').textContent,
            ruleBannerClass: document.querySelector('.rule-banner').className,
            stimulusText: document.querySelector('[data-role="stimulus-word"]').textContent,
            stimulusClass: document.querySelector('[data-role="stimulus-word"]').className,
            feedbackText: document.querySelector('[data-role="feedback"]').textContent,
            blueClass: document.querySelector('[data-color="blue"]').className,
            blueBadgeExists: !!document.querySelector('[data-color="blue"] .answer-btn__badge'),
            gridDisabled: document.querySelector('[data-role="answer-grid"]').getAttribute('aria-disabled'),
          }));
          if (!round2.ruleText.includes('규칙 전환') || !round2.ruleText.includes('글자 뜻')) {
            throw new Error('AC-round 회귀: 라운드2 규칙 전환 안내(글자 뜻) 없음 — "' + round2.ruleText + '"');
          }
          if (round2.ruleBannerClass.indexOf('is-switch') === -1) {
            throw new Error('AC-round 회귀: 규칙 전환 시 is-switch 애니메이션 클래스 없음 — "' + round2.ruleBannerClass + '"');
          }
          if (!round2.stimulusText.includes('노랑')) {
            throw new Error('AC-round 회귀: 라운드2 자극 단어(word=yellow→"노랑") 불일치 — "' + round2.stimulusText + '"');
          }
          if (round2.stimulusClass.indexOf('ink-green') === -1) {
            throw new Error('AC-round 회귀: 라운드2 자극 잉크색(ink=green) 클래스 없음 — "' + round2.stimulusClass + '"');
          }
          if (round2.blueClass.indexOf('is-correct') !== -1 || round2.blueBadgeExists) {
            throw new Error('AC-round 회귀: 다음 라운드 진입 후에도 이전 판정 배지/클래스가 남아있음');
          }
          if (round2.gridDisabled !== 'false') {
            throw new Error('AC-round 회귀: 라운드2 진입 후 응답 그리드가 다시 활성화되지 않음');
          }
          console.log('[step4] 라운드2 자동 진입 OK — 규칙 전환(글자 뜻)+word=yellow("노랑")+ink=green, 이전 판정 흔적 제거');

          // ── STEP 5 (AC-round 오답): red 클릭 → 오답(정답은 word=yellow) 판정 ──
          await page.click('[data-color="red"]');
          await new Promise((r) => setTimeout(r, 80));
          const afterWrong = await page.evaluate(() => ({
            score: parseInt(document.querySelector('[data-role="score"]').textContent, 10),
            streak: document.querySelector('[data-role="streak"]').textContent,
            feedbackClass: document.querySelector('[data-role="feedback"]').className,
            feedbackIcon: document.querySelector('.feedback__icon') ? document.querySelector('.feedback__icon').textContent : null,
            feedbackText: document.querySelector('[data-role="feedback"]').textContent,
            redClass: document.querySelector('[data-color="red"]').className,
            redBadge: document.querySelector('[data-color="red"] .answer-btn__badge') ? document.querySelector('[data-color="red"] .answer-btn__badge').textContent : null,
            yellowClass: document.querySelector('[data-color="yellow"]').className,
            yellowBadge: document.querySelector('[data-color="yellow"] .answer-btn__badge') ? document.querySelector('[data-color="yellow"] .answer-btn__badge').textContent : null,
            stimulusClass: document.querySelector('[data-role="stimulus"]').className,
            streakResetHidden: document.querySelector('[data-role="streak-reset"]').hidden,
          }));
          if (afterWrong.score !== scoreAfterRound1) {
            throw new Error('AC-round 회귀: 오답인데 점수가 변함 — 이전=' + scoreAfterRound1 + ' 이후=' + afterWrong.score);
          }
          if (afterWrong.streak !== '0') {
            throw new Error('AC-round 회귀: 오답 후 연속(streak) 이 0 으로 리셋되지 않음 — ' + afterWrong.streak);
          }
          if (afterWrong.feedbackClass.indexOf('feedback--ng') === -1) {
            throw new Error('AC-round 회귀: 오답 피드백 클래스에 feedback--ng 없음 — "' + afterWrong.feedbackClass + '"');
          }
          if (afterWrong.feedbackIcon !== '✗') {
            throw new Error('AC-round 회귀: 오답 보조 피드백 아이콘이 ✗ 가 아님 — ' + afterWrong.feedbackIcon);
          }
          if (!afterWrong.feedbackText.includes('오답') || !afterWrong.feedbackText.includes('노랑')) {
            throw new Error('AC-round 회귀: 오답 안내에 "오답"/정답색(노랑) 텍스트 없음 — "' + afterWrong.feedbackText + '"');
          }
          if (afterWrong.redClass.indexOf('is-wrong') === -1 || afterWrong.redBadge !== '✗') {
            throw new Error('AC-round 회귀: 선택한 red 버튼에 is-wrong/✗배지 없음 — class="' + afterWrong.redClass + '" badge=' + afterWrong.redBadge);
          }
          if (afterWrong.yellowClass.indexOf('is-correct') === -1 || afterWrong.yellowBadge !== '✓') {
            throw new Error('AC-round 회귀: 정답(yellow) 버튼에 is-correct/✓배지 안내 없음 — class="' + afterWrong.yellowClass + '" badge=' + afterWrong.yellowBadge);
          }
          if (afterWrong.stimulusClass.indexOf('is-wrong') === -1) {
            throw new Error('AC-round 회귀: 자극 존에 is-wrong 클래스 없음 — "' + afterWrong.stimulusClass + '"');
          }
          if (afterWrong.streakResetHidden) {
            throw new Error('AC-round 회귀: 오답인데 연속 리셋(↺) 보조 신호가 노출되지 않음(색맹 접근성 회귀)');
          }
          console.log('[step5] AC-round(오답) OK — score 보존(' + afterWrong.score + '), streak=0, ✗아이콘/배지 + 정답(yellow) 안내 + ↺ 신호');

          // ── STEP 6 (AC-regression): URL 이 본 모듈 경로를 벗어나지 않음 ──
          const currentUrl = await page.evaluate(() => location.pathname);
          if (currentUrl.indexOf('/color-switch/') === -1) {
            throw new Error('AC-regression 회귀: 예상치 못한 라우팅 이탈 — pathname="' + currentUrl + '"');
          }
          console.log('[step6] AC-regression OK — 라우팅 경로 유지(' + currentUrl + '), 다른 데모 파일 미참조');

          // ── STEP 7: 콘솔/페이지 에러 0건 ──
          if (consoleErrors.length > 0) {
            throw new Error('콘솔/페이지 에러 ' + consoleErrors.length + '건 발생:\\n' + consoleErrors.slice(0, 5).join('\\n'));
          }

          console.log('[OK] BF-987: 렌더->시작->정답(점수/연속/✓피드백)->자동다음라운드->오답(점수보존/연속리셋/✗피드백+정답안내)->라우팅유지 전체 통과');
        `;

        const res = await fetch("http://e2e-runner:3030/run", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Brix-Run-Id": process.env.BRIX_RUN_ID ?? "unknown",
            "X-Brix-Jira-Key": process.env.BRIX_JIRA_KEY ?? "BF-987",
          },
          body: JSON.stringify({
            url,
            label: "컬러 스위치 렌더→시작→정답(점수/연속/✓)→오답(보존/리셋/✗) 여정 [BF-987]",
            scriptText,
            timeoutMs: 60000,
          }),
        });
        const json = await res.json();
        assert.ok(json.ok, `e2e-runner 응답 ok=false: ${JSON.stringify(json).slice(0, 500)}`);
        assert.ok(
          json.passed,
          `BF-987 E2E 시나리오 실패 — stdout 끝:\n${String(json.stdout ?? "").slice(-2500)}`,
        );
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
  );
}

// ─────────────────────────────────────────────────────────────
// 헬퍼들 (기존 e2e 가드와 동일 패턴 — tests/breakout/BF-933-e2e.test.js /
// tests/dice-e2e-worker-host.test.js 참고)
// ─────────────────────────────────────────────────────────────

/**
 * e2e-runner 도달성 확인. 못 닿으면 test.skip() 호출 후 false 반환.
 * (CI 환경에는 컨테이너 없음 — fail 처리하면 PR 자동 머지 트리거 안 됨.)
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
 * 페르소나 컨테이너의 service hostname. e2e-runner 가 정적 서버로 도달할 때 사용.
 * host.docker.internal / localhost 는 절대 사용 X (다른 컨테이너).
 */
function personaHost() {
  return (
    process.env.BRIX_PERSONA_HOST ?? process.env.BRIX_WORKER_HOSTNAME ?? "worker"
  );
}

/**
 * 0.0.0.0 바인딩 임시 정적 서버. 임의 포트로 동시 실행 충돌 회피.
 */
function startStaticServer(rootDir) {
  const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
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
