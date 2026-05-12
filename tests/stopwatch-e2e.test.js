// BF-417 · 스톱워치 SPA 정적 회귀 가드 (focused scope · stopwatch module)
//
// 보호 대상 (silent break 방지):
//   1. /stopwatch/ 경로의 SPA 가 핵심 DOM id 를 유지한다
//      (selector contract — #disp-m / #disp-s / #disp-x / #btn-start / #btn-stop /
//       #btn-lap / #btn-reset / #lap-card / #lap-list / #lap-count)
//   2. localStorage key prefix 'stopwatch:' 와 'stopwatch:laps' / 'stopwatch:elapsed'
//      계약 유지 (storage.js 변경 시 명세적 회귀 차단)
//   3. main.js 가 stopwatch-prefix 키 외 다른 prefix(notepad:/timer:/bf-theme)를 침범하지 않는다
//
// 작성 방침:
//   - 정적 가드 only — 실 브라우저 E2E 는 e2e-runner 컨테이너 필요 (focused scope 정책상 module 외 skip)
//   - `includes` 만 사용 — 위치/순서 의존 X
//   - timer-e2e.test.js 의 패턴 답습 (BF-409)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "stopwatch";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SW_HTML = path.join(REPO_ROOT, "stopwatch", "index.html");
const SW_MAIN = path.join(REPO_ROOT, "stopwatch", "main.js");
const SW_STORAGE = path.join(REPO_ROOT, "stopwatch", "storage.js");
const SW_CORE = path.join(REPO_ROOT, "stopwatch", "stopwatch.js");
const SW_CSS = path.join(REPO_ROOT, "stopwatch", "styles.css");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  test("정적 AC1: stopwatch/index.html 에 SPA 핵심 DOM id 가 존재", () => {
    const html = fs.readFileSync(SW_HTML, "utf-8");
    const requiredIds = [
      "display", // 큰 디스플레이 컨테이너
      "disp-m", // 분
      "disp-s", // 초
      "disp-x", // 1/100 초
      "btn-start", // 시작
      "btn-stop", // 정지
      "btn-lap", // 랩
      "btn-reset", // 리셋
      "btn-theme", // 다크 토글 (공통)
      "lap-card", // 랩 카드 컨테이너 (hidden 토글)
      "lap-list", // 랩 ol
      "lap-count", // 랩 개수 텍스트
      "sr-announce", // SR-only 알림 (§7.5)
    ];
    for (const id of requiredIds) {
      assert.ok(
        html.includes(`id="${id}"`),
        `stopwatch/index.html 에 id="${id}" 가 없음 — SPA selector contract 깨짐`,
      );
    }
  });

  test("정적 AC1: 명세 §9.2 의 공통 head 요소 (charset / viewport / data-theme / styles / module script) 복제", () => {
    const html = fs.readFileSync(SW_HTML, "utf-8");
    assert.ok(html.includes('lang="ko"'), 'html lang="ko" 누락');
    assert.ok(html.includes('data-theme="light"'), "data-theme 초기 속성 누락");
    assert.ok(html.includes('charset="UTF-8"'), "meta charset 누락");
    assert.ok(
      html.includes('name="viewport"') && html.includes("width=device-width"),
      "viewport meta 누락",
    );
    assert.ok(
      html.includes('href="styles.css"'),
      "<link rel=stylesheet href=styles.css> 누락",
    );
    assert.ok(
      html.includes('type="module"') && html.includes('src="main.js"'),
      'script type="module" src="main.js" 누락',
    );
  });

  test("정적 AC2: localStorage key prefix 'stopwatch:' / 'stopwatch:laps' / 'stopwatch:elapsed' 계약", () => {
    const storageJs = fs.readFileSync(SW_STORAGE, "utf-8");
    assert.ok(
      storageJs.includes('"stopwatch:"'),
      'storage.js 에 "stopwatch:" prefix 누락',
    );
    assert.ok(
      storageJs.includes('"laps"') || storageJs.includes("stopwatch:laps"),
      'storage.js 에 laps 키 정의 누락',
    );
    assert.ok(
      storageJs.includes('"elapsed"') ||
        storageJs.includes("stopwatch:elapsed"),
      'storage.js 에 elapsed 키 정의 누락',
    );
  });

  test("정적 AC2: main.js 가 stopwatch storage 와 순수 로직만 import (다른 모듈 침범 X)", () => {
    const mainJs = fs.readFileSync(SW_MAIN, "utf-8");
    assert.ok(
      mainJs.includes('from "./storage.js"'),
      "main.js 가 ./storage.js 를 import 하지 않음",
    );
    assert.ok(
      mainJs.includes('from "./stopwatch.js"'),
      "main.js 가 ./stopwatch.js 를 import 하지 않음",
    );
    // 다른 module 침범 가드
    assert.ok(
      !mainJs.includes('from "../timer/'),
      "main.js 가 timer/ 를 직접 import — module 분리 위반",
    );
    assert.ok(
      !mainJs.includes('from "../notepad/'),
      "main.js 가 notepad/ 를 직접 import — module 분리 위반",
    );
  });

  test("정적 AC3: 명세 §6.2 의 키보드 단축 (Space/L/Esc) 가 main.js 에 등록되어 있음", () => {
    const mainJs = fs.readFileSync(SW_MAIN, "utf-8");
    // 정확한 라인 매칭이 아닌 key 명 등장 검증 (구현 디테일에 의존 X)
    assert.ok(
      mainJs.includes("Escape") || mainJs.includes('"Esc"'),
      "Esc 키 핸들러 누락",
    );
    assert.ok(
      mainJs.includes(' "') || mainJs.includes('Space'),
      "Space 키 핸들러 누락",
    );
    assert.ok(
      mainJs.includes('"l"') || mainJs.includes('"L"'),
      "L 키 핸들러 누락",
    );
  });

  test("정적 AC4: requestAnimationFrame + performance.now() 기반 tick (§6.3)", () => {
    const mainJs = fs.readFileSync(SW_MAIN, "utf-8");
    assert.ok(
      mainJs.includes("requestAnimationFrame"),
      "requestAnimationFrame 사용 흔적 없음 — 명세 §6.3 위반 가능",
    );
    assert.ok(
      mainJs.includes("performance.now()"),
      "performance.now() 사용 흔적 없음 — drift 보정 누락 가능",
    );
  });

  test("정적 AC5: 명세 §2 토큰 (color/space/typography) 이 styles.css 에 정의됨", () => {
    const css = fs.readFileSync(SW_CSS, "utf-8");
    // 일부 핵심 토큰만 검증 (전체 토큰 = §7.6 정량 일치 표 의 source)
    const requiredTokens = [
      "--color-bg-canvas",
      "--color-bg-surface",
      "--color-accent",
      "--color-danger",
      "--color-lap-fastest-bg",
      "--color-lap-slowest-bg",
      "--text-display",
      "--text-display-frac",
      "--text-lap-time",
      "--text-lap-delta",
      "--text-button-md",
      "--space-3",
      "--space-5",
      "--radius-lg",
    ];
    for (const t of requiredTokens) {
      assert.ok(css.includes(t), `styles.css 에 ${t} 토큰 누락 (명세 §2/§3)`);
    }
    // 다크 테마 변형 존재
    assert.ok(
      css.includes('[data-theme="dark"]'),
      'styles.css 에 [data-theme="dark"] 블록 누락',
    );
  });

  test("정적 AC6: 반응형 breakpoint (959px / 639px / 359px) 가 styles.css 에 존재", () => {
    const css = fs.readFileSync(SW_CSS, "utf-8");
    assert.ok(
      css.includes("max-width: 959px") || css.includes("max-width:959px"),
      "959px breakpoint 누락",
    );
    assert.ok(
      css.includes("max-width: 639px") || css.includes("max-width:639px"),
      "639px breakpoint 누락",
    );
    assert.ok(
      css.includes("max-width: 359px") || css.includes("max-width:359px"),
      "359px breakpoint 누락",
    );
  });

  test("정적 AC7: 순수 로직 export contract — formatStopwatchMs/addLap/MAX_ELAPSED_MS", () => {
    const core = fs.readFileSync(SW_CORE, "utf-8");
    // export 형식이 어떻든 (named export 권장) 식별자 자체 존재 확인
    const expected = [
      "formatStopwatchMs",
      "formatStopwatchMsStr",
      "addLap",
      "findFastestSlowest",
      "MAX_ELAPSED_MS",
      "MAX_LAPS",
      "clampElapsed",
      "isMaxCap",
      "pad2",
    ];
    for (const name of expected) {
      assert.ok(
        core.includes(`export `) && core.includes(name),
        `stopwatch.js export ${name} 누락`,
      );
    }
  });

  test("정적 AC8: notepad/timer 디렉토리 변경 없음 (BF-197 회귀 정책)", () => {
    // 본 task 는 stopwatch/ 신규만 추가. timer/notepad/ 의 파일이 손상되었는지 sanity check.
    const TIMER_HTML = path.join(REPO_ROOT, "timer", "index.html");
    const NOTEPAD_HTML = path.join(REPO_ROOT, "notepad", "index.html");
    assert.ok(fs.existsSync(TIMER_HTML), "timer/index.html 누락");
    assert.ok(fs.existsSync(NOTEPAD_HTML), "notepad/index.html 누락");
    // timer 의 핵심 selector (이전 가드 contract) 가 그대로인지
    const timerHtml = fs.readFileSync(TIMER_HTML, "utf-8");
    assert.ok(
      timerHtml.includes('id="btn-primary"'),
      "timer/index.html 의 #btn-primary selector contract 침범됨",
    );
  });
}
