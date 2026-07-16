// tests/e2e/clock/render-tick-format.test.js
// BF-844 · /demo/clock focused E2E 회귀 가드 (테스터 소유)
//
// 보호 대상 (BF-844 수용 기준):
//   AC1. 최초 렌더 — 진입 즉시 날짜/시각 표시 + 1초마다 실제 시각으로 갱신.
//   AC2. 12/24 전환(버튼) 및 정지/재개(버튼+키보드) 상태 전환.
//   AC3. 상호작용 전 구간 console.error/warn 및 네트워크 호출(fetch/XHR/
//        WebSocket) 0건 — CORS/네트워크 오류 무발생.
//
// ⚠️ e2e-runner 미사용 사유 (가정 명시 — CLAUDE.md 원칙1):
//   본 작업의 [TECH_STACK_POLICY] 는 stack=nextjs 로 지정되어 "vitest +
//   playwright harness 사용, e2e-runner curl 호출 비활성" 을 명시한다.
//   그러나 실제 레포에는 vitest/playwright 가 설치·구성되어 있지 않다
//   (package.json 확인 — devDependencies: http-server, pixi.js 뿐이고
//   pnpm-workspace/vitest.config/playwright.config 전부 부재, 실제로는
//   node:test 기반 vanilla 데모 모음 레포). 동일 레포의 선행 tester 작업
//   (tests/e2e/tetris/play-flow.test.js, BF-838)도 같은 정책-환경 불일치를
//   확인하고 node:test 기반 대체 검증으로 전환한 바 있어 그 선례를 따른다.
//
//   대신 이 파일은 node:test 내장 MockTimers(Date/setInterval 결정론적 제어)
//   와 최소 DOM stub 으로 프로덕션 main.js 를 실제로 부팅·구동해 렌더·tick·
//   정지재개·형식전환·키보드·pagehide 정리까지 "실제 상호작용" 을 결정론적으로
//   검증한다 — 정적 grep 보다 강한 회귀 가드이며 real-wall-clock sleep 이
//   없어 CI 에서도 빠르고 안정적이다. 실 브라우저 렌더링(CSS/레이아웃) 검증이
//   필요해지면 이 파일을 e2e-runner 기반으로 교체한다
//   (.claude/skills/e2e-runner-ci-guard/SKILL.md 참고).
//
// 범위 판단 (중복 금지 원칙 적용):
//   - formatDate/formatTime/to12Hour/normalizeHourFormat 등 순수 포맷 로직과
//     storage.js 의 저장/복원 라운드트립은 dev(BF-842) 의
//     tests/clock-BF842.test.js 20건이 이미 검증 → 여기서는 그 함수들을
//     "오라클(기대값 계산)" 로만 재사용하고 로직 자체를 재검증하지 않는다.
//   - main.js(DOM 바인딩·setInterval 루프·이벤트 배선·pagehide 정리)는 dev
//     테스트에서 전혀 다뤄지지 않음(dev 커밋 메모: e2e-runner 스모크는
//     PR 검증용 1회성이며 회귀 가드로 저장소에 남지 않음) → 이 파일의 핵심
//     검증 대상.
//   - index.html 의 마크업 id, styles.css 토큰 등 디자인 컨벤션 재검증은
//     reviewer-design 영역이므로 하지 않는다. 여기서는 main.js 가
//     getElementById 로 의존하는 id 존재만 최소 계약으로 고정한다.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import { formatDate, formatTime } from "../../../src/app/demo/clock/clock.js";
import { CLOCK_HOUR_FORMAT_KEY } from "../../../src/app/demo/clock/storage.js";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "clock";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

if (_scopeSkip) {
  it(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const CLOCK_DIR = join(HERE, "..", "..", "..", "src", "app", "demo", "clock");
  const MAIN_JS_PATH = join(CLOCK_DIR, "main.js");
  const INDEX_HTML = readFileSync(join(CLOCK_DIR, "index.html"), "utf8");

  // 모킹 이전에 캡처한 "진짜" Date — 오라클(기대값) 계산 전용.
  const RealDate = Date;
  // 2026-07-16 20:03:07 (로컬) — 12시간 변환 시 "오후 08" 로 눈에 띄게 확인 가능한 시각.
  const EPOCH_20H = new RealDate(2026, 6, 16, 20, 3, 7).getTime();

  function expectedRender(epochMs, format) {
    const d = new RealDate(epochMs);
    return { dateText: formatDate(d), time: formatTime(d, format) };
  }

  // ── 최소 DOM stub — main.js 가 의존하는 표면만 구현 ──
  class FakeEventTarget {
    constructor() {
      this._listeners = new Map();
    }
    addEventListener(type, fn) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(fn);
    }
    removeEventListener(type, fn) {
      const arr = this._listeners.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }
    dispatch(type, evt = {}) {
      const arr = this._listeners.get(type) || [];
      for (const fn of arr.slice()) fn(evt);
    }
  }

  class FakeElement extends FakeEventTarget {
    constructor(id, tagName = "DIV") {
      super();
      this.id = id;
      this.tagName = tagName;
      this.textContent = "";
      this.hidden = false;
      this._attrs = new Map();
      this.classList = {
        _set: new Set(),
        add(c) {
          this._set.add(c);
        },
        remove(c) {
          this._set.delete(c);
        },
        contains(c) {
          return this._set.has(c);
        },
      };
    }
    setAttribute(k, v) {
      this._attrs.set(k, String(v));
    }
    getAttribute(k) {
      return this._attrs.has(k) ? this._attrs.get(k) : null;
    }
    click() {
      this.dispatch("click", { target: this, preventDefault() {} });
    }
  }

  // main.js 가 getElementById 로 의존하는 id 전부 (§AC0 마크업 contract 와 동일 목록).
  const REQUIRED_IDS = {
    "clock-date": "P",
    "clock-prefix": "SPAN",
    "disp-h": "SPAN",
    "disp-m": "SPAN",
    "disp-s": "SPAN",
    "clock-status": "P",
    "clock-status-text": "SPAN",
    "btn-toggle": "BUTTON",
    "btn-format": "BUTTON",
    "btn-theme": "BUTTON",
    "sr-announce": "DIV",
  };

  function createMemoryLocalStorage() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    };
  }

  let _importSeq = 0;

  /**
   * 최소 DOM/localStorage stub 을 전역에 주입한 뒤 실제 main.js 를 "새 페이지"처럼
   * 부팅한다. reuseLocalStorage 를 넘기면 새로고침 시나리오(동일 저장소 유지)를 흉내낸다.
   */
  async function bootMain(reuseLocalStorage) {
    const elements = new Map();
    for (const [id, tag] of Object.entries(REQUIRED_IDS)) {
      elements.set(id, new FakeElement(id, tag));
    }
    const documentElement = new FakeElement("html", "HTML");
    const doc = new FakeEventTarget();
    doc.getElementById = (id) => elements.get(id) ?? null;
    doc.documentElement = documentElement;

    const win = new FakeEventTarget();
    const localStorage = reuseLocalStorage ?? createMemoryLocalStorage();

    globalThis.document = doc;
    globalThis.window = win;
    globalThis.localStorage = localStorage;
    // clock 은 네트워크 미사용(기획 §6) — main.js 가 실수로라도 호출하면 즉시 실패시킨다.
    const forbidNetwork = (name) => () => {
      throw new Error(`${name} 호출 금지 — /demo/clock 은 네트워크 미사용(기획 §6)`);
    };
    globalThis.fetch = forbidNetwork("fetch");
    globalThis.XMLHttpRequest = forbidNetwork("XMLHttpRequest");
    globalThis.WebSocket = forbidNetwork("WebSocket");

    _importSeq += 1;
    const url = `${pathToFileURL(MAIN_JS_PATH).href}?case=${_importSeq}`;
    await import(url);

    return { elements, documentElement, doc, win, localStorage };
  }

  function teardownGlobals() {
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.fetch;
    delete globalThis.XMLHttpRequest;
    delete globalThis.WebSocket;
  }

  // ── AC0 (정적) — main.js 가 의존하는 마크업 id 계약 ──
  describe("AC0 (정적) · index.html 마크업 contract (main.js getElementById 의존 id)", () => {
    for (const id of Object.keys(REQUIRED_IDS)) {
      it(`#${id} 존재`, () => {
        assert.match(INDEX_HTML, new RegExp(`id="${id}"`), `#${id} 마크업이 사라졌습니다`);
      });
    }
  });

  // ── AC1 — 최초 렌더 + 1초 갱신 ──
  describe("AC1 · 최초 렌더 및 1초 갱신", () => {
    it("진입 즉시 현재 날짜/시각을 기본 24시간 형식으로 표시한다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        const expected = expectedRender(EPOCH_20H, "24");
        assert.equal(dom.elements.get("clock-date").textContent, expected.dateText);
        assert.equal(dom.elements.get("disp-h").textContent, expected.time.hh);
        assert.equal(dom.elements.get("disp-m").textContent, expected.time.mm);
        assert.equal(dom.elements.get("disp-s").textContent, expected.time.ss);
        assert.equal(dom.elements.get("clock-prefix").hidden, true, "24시간 기본은 오전/오후 prefix 를 숨겨야 함");
        assert.equal(dom.elements.get("clock-status-text").textContent, "동작 중");
        assert.equal(dom.elements.get("clock-status").classList.contains("is-running"), true);
        assert.equal(dom.elements.get("btn-toggle").textContent, "⏸ 정지");
      } finally {
        teardownGlobals();
      }
    });

    it("setInterval tick 마다(1초) 실제 시각을 재반영해 화면이 갱신된다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        for (let i = 1; i <= 3; i += 1) {
          t.mock.timers.tick(1000);
          const expected = expectedRender(EPOCH_20H + i * 1000, "24");
          assert.equal(dom.elements.get("disp-s").textContent, expected.time.ss, `tick ${i} 초 갱신 실패`);
          assert.equal(dom.elements.get("disp-m").textContent, expected.time.mm, `tick ${i} 분 갱신 실패`);
          assert.equal(dom.elements.get("disp-h").textContent, expected.time.hh, `tick ${i} 시 갱신 실패`);
        }
      } finally {
        teardownGlobals();
      }
    });
  });

  // ── AC2 — 정지/재개 (버튼 + 키보드) ──
  describe("AC2 · 정지/재개", () => {
    it("정지 버튼 클릭 시 화면이 그 시점 값에 고정되고, 재개 시 현재 시각으로 즉시 재동기화 후 tick 이 재개된다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        t.mock.timers.tick(1000); // now = EPOCH_20H + 1000

        dom.elements.get("btn-toggle").click(); // 정지
        assert.equal(dom.elements.get("clock-status-text").textContent, "정지됨");
        assert.equal(dom.elements.get("clock-status").classList.contains("is-running"), false);
        assert.equal(dom.elements.get("btn-toggle").textContent, "▶ 재개");
        assert.equal(dom.elements.get("btn-toggle").getAttribute("aria-pressed"), "true");

        const frozen = dom.elements.get("disp-s").textContent;
        t.mock.timers.tick(5000); // 정지 중 시간이 흘러도 화면은 불변이어야 함
        assert.equal(dom.elements.get("disp-s").textContent, frozen, "정지 중에도 화면이 갱신되면 안 됨");

        dom.elements.get("btn-toggle").click(); // 재개 — now = EPOCH_20H + 6000
        const resumed = expectedRender(EPOCH_20H + 6000, "24");
        assert.equal(dom.elements.get("disp-s").textContent, resumed.time.ss, "재개 즉시 현재 시각으로 재동기화되어야 함");
        assert.equal(dom.elements.get("clock-status-text").textContent, "동작 중");
        assert.equal(dom.elements.get("btn-toggle").textContent, "⏸ 정지");

        t.mock.timers.tick(1000); // now = EPOCH_20H + 7000
        const next = expectedRender(EPOCH_20H + 7000, "24");
        assert.equal(dom.elements.get("disp-s").textContent, next.time.ss, "재개 후 tick 루프가 다시 시작되어야 함");
      } finally {
        teardownGlobals();
      }
    });

    it("Space 키 — btn-toggle 이 아닌 다른 요소에 포커스가 있어도 정지/재개를 토글한다(AC-5 회귀 가드)", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        const btnFormat = dom.elements.get("btn-format");

        dom.doc.dispatch("keydown", { key: " ", code: "Space", target: btnFormat, preventDefault() {} });
        assert.equal(dom.elements.get("clock-status-text").textContent, "정지됨", "형식 버튼 포커스 상태에서 Space 가 정지를 토글하지 않음");

        dom.doc.dispatch("keydown", { key: " ", code: "Space", target: btnFormat, preventDefault() {} });
        assert.equal(dom.elements.get("clock-status-text").textContent, "동작 중", "형식 버튼 포커스 상태에서 Space 가 재개를 토글하지 않음");
      } finally {
        teardownGlobals();
      }
    });

    it("Space 키 — btn-toggle 자체에 포커스가 있을 때는 네이티브 클릭에 위임하며 중복 토글하지 않는다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        const btnToggle = dom.elements.get("btn-toggle");

        dom.doc.dispatch("keydown", { key: " ", code: "Space", target: btnToggle, preventDefault() {} });
        assert.equal(dom.elements.get("clock-status-text").textContent, "동작 중", "btn-toggle 포커스 상태에서 Space 가 중복 토글하면 안 됨");
      } finally {
        teardownGlobals();
      }
    });

    it("입력 요소(INPUT)에 포커스가 있을 때는 Space/H 단축키가 동작하지 않는다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        const fakeInput = { tagName: "INPUT" };

        dom.doc.dispatch("keydown", { key: " ", code: "Space", target: fakeInput, preventDefault() {} });
        assert.equal(dom.elements.get("clock-status-text").textContent, "동작 중", "INPUT 포커스 중 Space 가 정지를 토글하면 안 됨");

        dom.doc.dispatch("keydown", { key: "h", target: fakeInput, preventDefault() {} });
        assert.equal(dom.elements.get("btn-format").textContent, "24시간", "INPUT 포커스 중 H 가 형식을 전환하면 안 됨");
      } finally {
        teardownGlobals();
      }
    });

    it("pagehide 시 tick 타이머가 정리되어 더 이상 화면이 갱신되지 않는다(누수 방지)", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        dom.win.dispatch("pagehide");
        const before = dom.elements.get("disp-s").textContent;
        t.mock.timers.tick(3000);
        assert.equal(dom.elements.get("disp-s").textContent, before, "pagehide 이후에도 tick 이 계속되면 타이머 누수");
      } finally {
        teardownGlobals();
      }
    });
  });

  // ── AC2 — 12/24 전환 (버튼 + 키보드 + 영속화 + 새로고침 복원) ──
  describe("AC2 · 12/24 전환", () => {
    it("형식 버튼 클릭 시 즉시 재포맷되고 localStorage 에 영속화된다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        dom.elements.get("btn-format").click();

        assert.equal(dom.elements.get("btn-format").textContent, "12시간");
        assert.equal(dom.elements.get("btn-format").getAttribute("aria-pressed"), "true");
        assert.equal(dom.elements.get("clock-prefix").hidden, false);
        assert.equal(dom.elements.get("clock-prefix").textContent, "오후");
        assert.equal(dom.elements.get("disp-h").textContent, "08", "20시는 12시간 형식에서 오후 08 이어야 함");
        assert.equal(dom.localStorage.getItem(CLOCK_HOUR_FORMAT_KEY), "12");
      } finally {
        teardownGlobals();
      }
    });

    it("H 키로도 형식이 전환되고, 다시 누르면 24시간으로 되돌아간다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const dom = await bootMain();
        const btnFormat = dom.elements.get("btn-format");

        dom.doc.dispatch("keydown", { key: "h", target: btnFormat, preventDefault() {} });
        assert.equal(dom.elements.get("btn-format").textContent, "12시간");

        dom.doc.dispatch("keydown", { key: "H", target: btnFormat, preventDefault() {} });
        assert.equal(dom.elements.get("btn-format").textContent, "24시간");
      } finally {
        teardownGlobals();
      }
    });

    it("형식 전환 후 새로고침해도 저장된 형식이 복원되어 동일하게 표시된다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      try {
        const first = await bootMain();
        first.elements.get("btn-format").click(); // 24 → 12
        assert.equal(first.localStorage.getItem(CLOCK_HOUR_FORMAT_KEY), "12");

        // "새로고침" 시뮬레이션 — pagehide 로 이전 페이지 타이머 정리 후 동일 저장소로 재부팅.
        first.win.dispatch("pagehide");
        const reloaded = await bootMain(first.localStorage);

        assert.equal(reloaded.elements.get("btn-format").textContent, "12시간", "새로고침 후 12시간 형식이 복원되지 않음");
        assert.equal(reloaded.elements.get("btn-format").getAttribute("aria-pressed"), "true");
        assert.equal(reloaded.elements.get("clock-prefix").hidden, false);
        assert.equal(reloaded.elements.get("disp-h").textContent, "08");
      } finally {
        teardownGlobals();
      }
    });
  });

  // ── AC3 — 콘솔/네트워크 오류 무발생 ──
  describe("AC3 · 콘솔/네트워크 오류 무발생", () => {
    it("렌더→tick→정지/재개→형식전환→키보드→pagehide 전체 상호작용 동안 console.error/warn 및 네트워크 호출이 0건이다", async (t) => {
      t.mock.timers.enable({ apis: ["Date", "setInterval"], now: EPOCH_20H });
      const errors = [];
      const warns = [];
      const originalError = console.error;
      const originalWarn = console.warn;
      console.error = (...args) => errors.push(args);
      console.warn = (...args) => warns.push(args);
      try {
        // fetch/XHR/WebSocket 호출 시 bootMain 내부 stub 이 즉시 throw 하므로,
        // 아래 시퀀스가 예외 없이 끝까지 실행된다는 것 자체가 네트워크 호출 0건의 증거다.
        const dom = await bootMain();
        t.mock.timers.tick(1000);
        dom.elements.get("btn-toggle").click(); // 정지
        t.mock.timers.tick(2000);
        dom.elements.get("btn-toggle").click(); // 재개
        dom.elements.get("btn-format").click(); // 형식 전환
        dom.doc.dispatch("keydown", {
          key: "h",
          target: dom.elements.get("btn-format"),
          preventDefault() {},
        });
        dom.doc.dispatch("keydown", {
          key: " ",
          code: "Space",
          target: dom.elements.get("btn-format"),
          preventDefault() {},
        });
        dom.win.dispatch("pagehide");

        assert.deepEqual(errors, [], "clock 상호작용 중 console.error 가 발생했습니다");
        assert.deepEqual(warns, [], "clock 상호작용 중 console.warn 이 발생했습니다");
      } finally {
        console.error = originalError;
        console.warn = originalWarn;
        teardownGlobals();
      }
    });
  });
}
