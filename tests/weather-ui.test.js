// BF-440 · 날씨 카드 SPA UI 회귀 가드 (정적 + sandbox)
//
// 본 파일은 BF-438 dev 산출물 (weather/index.html · main.js · styles.css) 의
// UI 표면 사실 (DOM 구조 · 함수 분기 · CSS 토큰) 이 silent break 되지 않도록
// 정적 회귀 가드를 둔다. 실 브라우저 인터랙션은 weather-e2e-worker-host.test.js
// 가 담당.
//
// dev 의 weather-integration.test.js 가 이미 광범위한 정적 회귀 가드를 두고 있어
// 본 파일은 **중복을 피하고 보강하는 측면** 만 다룬다:
//   - EMOJI_TO_STATE 매핑의 6 상태 (sunny/cloudy/rainy/snowy/thunder/windy) fact
//   - 도시 추가 form 의 select option 6개 + data-state 매핑 fact
//   - 인라인 메모 편집의 Enter/Esc/blur 3가지 commit/cancel 분기 fact
//   - 모달의 backdrop click + cancel + confirm 3가지 종료 경로 fact
//   - 정렬 토글 라벨의 두 모드 텍스트 fact ("최신순" / "도시명 가나다")
//   - 카드 article DOM 구조 (article.card · card__head · card__city · card__memo · card__delete · card__meta) fact
//   - 빈 상태 element 의 hidden 토글 fact (cards.length===0 분기)
//   - count-label 동기 패턴 (`<n>개 도시`) fact
//   - sandbox 시뮬: 카드 추가 → 메모 편집 (updatedAt 갱신) → 가나다 정렬 영향 → 삭제 → 빈 상태 lifecycle
//
// CI 결정성: focused scope 외 module 일 때 placeholder skip — pomodoro/stopwatch
// /kanban/timer/notepad 의 e2e 가드와 동일한 패턴 (브릭스플로우 표준).

import { test } from "node:test";
// node:assert (non-strict) 사용 — dev 의 weather-storage / weather-integration 과
// 동일. strict 모드의 deepEqual 은 reference equality 도 검사하므로 array literal
// 비교 시 false negative 가 발생함 (Node 22).
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

// ─────────────────────────────────────────────────────────────
// brix-flow-test-scope-guard — focused scope 일 때 자기 module 외 skip.
// ─────────────────────────────────────────────────────────────
const _BRIX_MY_MODULE = "weather";
const _scopeSkip =
  process.env.BRIX_TEST_SCOPE === "focused" &&
  process.env.BRIX_TEST_MODULE &&
  process.env.BRIX_TEST_MODULE !== _BRIX_MY_MODULE;

const HERE = dirname(fileURLToPath(import.meta.url));
const WEATHER_DIR = join(HERE, "..", "weather");
const STORAGE_PATH = join(WEATHER_DIR, "storage.js");
const MAIN_PATH = join(WEATHER_DIR, "main.js");
const HTML_PATH = join(WEATHER_DIR, "index.html");
const CSS_PATH = join(WEATHER_DIR, "styles.css");

if (_scopeSkip) {
  test(`[brix-flow] focused scope skip — ${_BRIX_MY_MODULE}`, (t) => t.skip());
} else {
  const STORAGE_SRC = readFileSync(STORAGE_PATH, "utf8");
  const MAIN_SRC = readFileSync(MAIN_PATH, "utf8");
  const HTML_SRC = readFileSync(HTML_PATH, "utf8");
  const CSS_SRC = readFileSync(CSS_PATH, "utf8");

  function loadWeatherStorage() {
    const sandbox = { window: {}, globalThis: {} };
    vm.createContext(sandbox);
    vm.runInContext(STORAGE_SRC, sandbox);
    return sandbox.window.WeatherStorage;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. 이모지 ↔ state 매핑 (6 상태 fact)
  // ─────────────────────────────────────────────────────────────
  test("UI fact: EMOJI_TO_STATE 가 6 상태 (sunny/cloudy/rainy/snowy/thunder/windy) 매핑 정의", () => {
    // main.js 안의 EMOJI_TO_STATE 객체 — 6개 entry 모두 존재
    const expected = [
      ['"☀️": "sunny"', "sunny"],
      ['"☁️": "cloudy"', "cloudy"],
      ['"🌧️": "rainy"', "rainy"],
      ['"❄️": "snowy"', "snowy"],
      ['"⛈️": "thunder"', "thunder"],
      ['"💨": "windy"', "windy"],
    ];
    for (const [, state] of expected) {
      // 정규식 — emoji 직접 매칭이 sourcemap/encoding 이슈 가능성 있어 state 만 검증
      const re = new RegExp(`["']\\s*${state}\\s*["']`);
      assert.match(MAIN_SRC, re, `EMOJI_TO_STATE 에 ${state} 누락`);
    }

    // storage.js 의 VALID_STATES 와도 일치
    const WS = loadWeatherStorage();
    assert.deepEqual(
      WS.VALID_STATES.slice().sort(),
      ["cloudy", "rainy", "snowy", "sunny", "thunder", "windy"],
      "WeatherStorage.VALID_STATES 가 6 상태 미일치",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 2. form select option 6개 + data-state 매핑 (DOM fact)
  // ─────────────────────────────────────────────────────────────
  test("UI fact: form select#add-emoji 에 6 option + data-state 매핑", () => {
    // <select id="add-emoji"> 안의 <option ... data-state="..."> 6 entry
    const selectMatch = HTML_SRC.match(
      /<select[^>]+id=["']add-emoji["'][^>]*>([\s\S]*?)<\/select>/i,
    );
    assert.ok(selectMatch, "select#add-emoji 누락");
    const inner = selectMatch[1];
    const opts = [...inner.matchAll(/<option[^>]+data-state=["']([a-z]+)["']/gi)];
    assert.equal(
      opts.length,
      6,
      `select#add-emoji 의 option 개수가 6 이 아님: ${opts.length}`,
    );
    const states = opts.map((m) => m[1]).sort();
    assert.deepEqual(
      states,
      ["cloudy", "rainy", "snowy", "sunny", "thunder", "windy"],
      `option data-state 매핑 불일치: ${states.join(",")}`,
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 3. 인라인 메모 편집의 commit/cancel 3 경로 (Enter / Esc / blur)
  // ─────────────────────────────────────────────────────────────
  test("UI fact: 인라인 메모 편집 — Enter commit · Esc cancel · blur commit", () => {
    // textarea keydown 분기에 Enter (commit) 와 Escape (cancel) 모두 존재
    assert.match(
      MAIN_SRC,
      /ta\.addEventListener\(["']keydown["'][\s\S]{0,400}e\.key\s*===\s*["']Enter["'][\s\S]{0,200}commitMemoEdit/,
      "textarea Enter → commitMemoEdit 분기 누락",
    );
    assert.match(
      MAIN_SRC,
      /ta\.addEventListener\(["']keydown["'][\s\S]{0,400}e\.key\s*===\s*["']Escape["'][\s\S]{0,200}cancelMemoEdit/,
      "textarea Esc → cancelMemoEdit 분기 누락",
    );
    // blur → commit (편집 중인 카드 id 일치 시)
    assert.match(
      MAIN_SRC,
      /ta\.addEventListener\(["']blur["'][\s\S]{0,400}commitMemoEdit/,
      "textarea blur → commitMemoEdit 분기 누락",
    );
    // commitMemoEdit 본문 — existing.updatedAt = Date.now()
    assert.match(
      MAIN_SRC,
      /commitMemoEdit[\s\S]{0,800}existing\.updatedAt\s*=\s*Date\.now\(\)/,
      "commitMemoEdit 가 updatedAt 을 Date.now() 로 갱신하지 않음",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 4. 삭제 모달의 3 종료 경로 (cancel · backdrop · confirm)
  // ─────────────────────────────────────────────────────────────
  test("UI fact: 삭제 모달 — cancel · backdrop click · confirm 모두 정의", () => {
    // openDeleteModal / closeModal / confirmDelete 함수 정의
    assert.match(MAIN_SRC, /function\s+openDeleteModal\s*\(/);
    assert.match(MAIN_SRC, /function\s+closeModal\s*\(/);
    assert.match(MAIN_SRC, /function\s+confirmDelete\s*\(/);
    // cancel 버튼 → closeModal 바인딩
    assert.match(
      MAIN_SRC,
      /modalCancelEl\.addEventListener\(["']click["'],\s*closeModal\)/,
    );
    // confirm 버튼 → confirmDelete 바인딩
    assert.match(
      MAIN_SRC,
      /modalConfirmEl\.addEventListener\(["']click["'],\s*confirmDelete\)/,
    );
    // backdrop click → closeModal (e.target === backdrop 일 때만)
    assert.match(
      MAIN_SRC,
      /modalBackdropEl\.addEventListener\(["']click["'][\s\S]{0,200}e\.target\s*===\s*modalBackdropEl[\s\S]{0,80}closeModal/,
      "backdrop click 가드 (e.target === backdrop) → closeModal 흐름 누락",
    );
    // confirmDelete 본문 — store.removeCard 호출
    assert.match(
      MAIN_SRC,
      /confirmDelete[\s\S]{0,400}store\.removeCard\(pendingDeleteId\)/,
      "confirmDelete 가 store.removeCard(pendingDeleteId) 호출하지 않음",
    );
    // 전역 Esc 키 → 모달 표시 중이면 closeModal 호출
    assert.match(
      MAIN_SRC,
      /e\.key\s*===\s*["']Escape["'][\s\S]{0,400}pendingDeleteId[\s\S]{0,80}closeModal/,
      "전역 Esc → closeModal 분기 누락 (모달 표시 중 fallback)",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 5. 정렬 토글 라벨 두 모드 매핑 ("최신순" / "도시명 가나다")
  // ─────────────────────────────────────────────────────────────
  test("UI fact: sortLabelText 매핑 — city-asc='도시명 가나다' · updated-desc='최신순'", () => {
    // sortLabelText 함수가 두 모드 분기를 명시적으로 반환
    assert.match(MAIN_SRC, /function\s+sortLabelText\s*\(/);
    assert.match(
      MAIN_SRC,
      /currentSort\s*===\s*["']city-asc["']\s*\?\s*["']도시명 가나다["']\s*:\s*["']최신순["']/,
      "sortLabelText 의 두 모드 분기 텍스트 정확 매칭 실패",
    );
    // toggleSort 가 두 모드를 토글
    assert.match(
      MAIN_SRC,
      /currentSort\s*=\s*\n?\s*currentSort\s*===\s*["']updated-desc["']\s*\?\s*["']city-asc["']\s*:\s*["']updated-desc["']/,
      "toggleSort 의 모드 토글 분기 누락",
    );
    // toggleSort 가 store.saveSort 호출 + render
    assert.match(
      MAIN_SRC,
      /toggleSort[\s\S]{0,400}store\.saveSort\(currentSort\)[\s\S]{0,200}render\(\)/,
      "toggleSort 의 saveSort + render 흐름 누락",
    );
    // sort-toggle 의 초기 라벨 ("최신순") 이 index.html 에 박혀 있음 (FOUC 방지)
    assert.match(
      HTML_SRC,
      /id=["']sort-toggle-label["'][^>]*>[\s\S]{0,80}최신순/,
      "sort-toggle 초기 라벨 '최신순' 이 index.html 에 박혀있지 않음 (FOUC)",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 6. 카드 article DOM 구조 (renderCard 가 만드는 element 셋)
  // ─────────────────────────────────────────────────────────────
  test("UI fact: renderCard — article.card · card__delete · card__head · card__city · card__memo · card__meta 생성", () => {
    // renderCard 함수 정의
    assert.match(MAIN_SRC, /function\s+renderCard\s*\(\s*card\s*\)/);
    // article.className = "card"
    assert.match(
      MAIN_SRC,
      /renderCard[\s\S]{0,500}article\.className\s*=\s*["']card["']/,
      "renderCard 가 article.className='card' 를 설정하지 않음",
    );
    // dataset.cardId = card.id (e2e 셀렉터 안정성)
    assert.match(
      MAIN_SRC,
      /renderCard[\s\S]{0,500}article\.dataset\.cardId\s*=\s*card\.id/,
      "article.dataset.cardId 누락 — e2e 셀렉터 보장 안 됨",
    );
    // 클래스명 매핑 — card__delete / card__head / card__emoji / card__city / card__memo / card__meta
    const classes = [
      "card__delete",
      "card__head",
      "card__emoji",
      "card__city",
      "card__memo",
      "card__meta",
    ];
    for (const cls of classes) {
      assert.ok(
        new RegExp(`["']${cls}["']`).test(MAIN_SRC),
        `main.js 에 "${cls}" 클래스 사용 누락 (renderCard DOM 구조)`,
      );
    }
    // 빈 메모일 때 card__memo--empty placeholder 텍스트
    assert.match(
      MAIN_SRC,
      /classList\.add\(["']card__memo--empty["']\)[\s\S]{0,200}메모를 추가하려면 여기를 클릭/,
      "빈 메모 placeholder (`card__memo--empty` + 안내 텍스트) 누락",
    );
    // styles.css 에 .card 및 그 자식 클래스가 정의되어 있는지
    for (const cls of classes) {
      assert.ok(
        new RegExp(`\\.${cls.replace(/__/g, "__")}\\s*\\{`).test(CSS_SRC) ||
          new RegExp(`\\.${cls}`).test(CSS_SRC),
        `styles.css 에 .${cls} 정의 누락`,
      );
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 7. 빈 상태 element 의 cards.length === 0 분기
  // ─────────────────────────────────────────────────────────────
  test("UI fact: render — cards.length===0 일 때 empty-state 노출 + grid 숨김", () => {
    // render 함수 안에 cards.length === 0 분기 + emptyStateEl.hidden = false / gridEl.hidden = true
    assert.match(
      MAIN_SRC,
      /cards\.length\s*===\s*0[\s\S]{0,200}emptyStateEl\.hidden\s*=\s*false/,
      "render 의 cards.length===0 → empty-state 노출 분기 누락",
    );
    assert.match(
      MAIN_SRC,
      /cards\.length\s*===\s*0[\s\S]{0,200}gridEl\.hidden\s*=\s*true/,
      "render 의 cards.length===0 → grid 숨김 분기 누락",
    );
    // 비어있지 않을 때 — empty-state 숨김 + grid 노출
    assert.match(
      MAIN_SRC,
      /emptyStateEl\.hidden\s*=\s*true[\s\S]{0,200}gridEl\.hidden\s*=\s*false/,
      "render 의 비어있지 않을 때 empty-state 숨김 + grid 노출 분기 누락",
    );
    // index.html 에 empty-state 가 hidden default + role=status
    assert.match(
      HTML_SRC,
      /id=["']empty-state["'][^>]*hidden[^>]*role=["']status["']/,
      "empty-state 가 hidden default + role=status 가 아님",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 8. count-label 동기 패턴 (`<n>개 도시`)
  // ─────────────────────────────────────────────────────────────
  test("UI fact: count-label — render 시 `<cards.length>개 도시` 텍스트로 동기", () => {
    assert.match(
      MAIN_SRC,
      /countLabelEl\.textContent\s*=\s*cards\.length\s*\+\s*["']개 도시["']/,
      "count-label 동기 패턴 누락 — `<n>개 도시` 텍스트로 갱신해야 함",
    );
    // 초기 텍스트도 "0개 도시" 로 박혀있어야 FOUC 안전
    assert.match(
      HTML_SRC,
      /id=["']count-label["'][^>]*>\s*0개 도시\s*</,
      "count-label 초기 텍스트가 '0개 도시' 가 아님 (FOUC)",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 9. sandbox 시뮬 — 카드 추가 → 메모 편집 → 가나다 정렬 → 삭제 → 빈 상태 lifecycle
  //    (AC1 의 storage-level 통합 — e2e-runner 가 없는 환경에서도 회귀 보장)
  // ─────────────────────────────────────────────────────────────
  test("AC1 sandbox: 도시 2건 추가 → 메모 편집 (updatedAt 갱신) → 가나다 정렬 → 삭제 → 빈 상태", () => {
    const WS = loadWeatherStorage();
    const mem = WS.createMemoryStorage();
    const store = WS.createWeatherStore(mem);

    // 1) 도시 2건 추가 — 서울 (한글), London (영문)
    const t0 = 1700000000000;
    const idA = WS.ulid(t0);
    store.saveCard({
      id: idA,
      city: "서울",
      emoji: "☀️",
      memo: "",
      state: "sunny",
      createdAt: t0,
      updatedAt: t0,
    });
    const idB = WS.ulid(t0 + 1000);
    store.saveCard({
      id: idB,
      city: "London",
      emoji: "🌧️",
      memo: "비",
      state: "rainy",
      createdAt: t0 + 1000,
      updatedAt: t0 + 1000,
    });
    assert.equal(store.listCards().length, 2, "초기 카드 2건 저장 실패");

    // 2) updated-desc 기본 정렬 — London (B) 가 최신
    let sorted = store.listSorted("updated-desc");
    assert.deepEqual(
      sorted.map((c) => c.id),
      [idB, idA],
      "updated-desc 정렬 결과 mismatch (B 최신)",
    );

    // 3) 서울 메모 편집 — 새 updatedAt 이 가장 최신
    const a2 = store.getCard(idA);
    a2.memo = "맑음";
    a2.updatedAt = t0 + 5000;
    store.saveCard(a2);
    sorted = store.listSorted("updated-desc");
    assert.deepEqual(
      sorted.map((c) => c.id),
      [idA, idB],
      "메모 편집 후 A 가 최신으로 올라오지 않음 (updatedAt 갱신 실패)",
    );
    // 메모 본문 갱신 확인
    assert.equal(store.getCard(idA).memo, "맑음");

    // 4) 가나다 정렬 (city-asc) 으로 토글 — locale 순서 보장
    store.saveSort("city-asc");
    assert.equal(store.loadSort(), "city-asc");
    const cityAsc = store.listSorted();
    // localeCompare 기준 영문 (London) < 한글 (서울)
    assert.deepEqual(
      cityAsc.map((c) => c.city),
      ["London", "서울"],
      `city-asc 정렬 결과 mismatch: ${cityAsc.map((c) => c.city).join(",")}`,
    );

    // 5) 서울 삭제 → 카드 1건 → London 남음
    store.removeCard(idA);
    assert.equal(store.listCards().length, 1);
    assert.equal(store.listCards()[0].id, idB);

    // 6) London 삭제 → 카드 0건 → 빈 상태 분기 (UI 는 render 가 처리)
    store.removeCard(idB);
    assert.equal(store.listCards().length, 0, "마지막 카드 삭제 후 0건 아님");
    // 정렬 모드는 여전히 city-asc — 빈 상태에서도 saveSort 유지
    assert.equal(
      store.loadSort(),
      "city-asc",
      "빈 상태 진입 후 정렬 모드가 default 로 reset 됨 (회귀)",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 10. CSS [hidden] 가드 — modal-backdrop 의 display:flex 가 HTML hidden 을
  //     무력화하지 못하도록 `.modal-backdrop[hidden]` selector 보강 (회귀 가드).
  // ─────────────────────────────────────────────────────────────
  test("AC3 회귀 가드: styles.css 에 `.modal-backdrop[hidden] { display: none }` 보강", () => {
    // .modal-backdrop 기본 규칙은 display: flex (모달 노출 시 center 배치).
    // 단, HTML `hidden` attribute 의 default style (display: none) 을 보장하기
    // 위해 [hidden] selector 가 명시되어 있어야 한다.
    // 누락 시 modal-backdrop 이 부팅 시점 (hidden=true) 에도 visible 상태로 pointer
    // event 를 intercept 해서 페이지 전체 click 이 차단됨 (BF-438 회귀 사례).
    assert.match(
      CSS_SRC,
      /\.modal-backdrop\[hidden\]\s*\{[\s\S]{0,80}display:\s*none/,
      "styles.css 에 `.modal-backdrop[hidden] { display: none; }` 가드 누락 — modal 가 부팅 시점에 visible 로 pointer event intercept 함",
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 11. 모달 표시 중 키보드 보호 — Enter 로 confirm, Esc 로 close
  // ─────────────────────────────────────────────────────────────
  test("UI fact: 전역 keydown — 모달 표시 중 Enter → confirmDelete · T 키 비활성", () => {
    // pendingDeleteId 가 있고 Enter 키 → confirmDelete
    assert.match(
      MAIN_SRC,
      /pendingDeleteId\s*&&\s*e\.key\s*===\s*["']Enter["'][\s\S]{0,200}confirmDelete\(\)/,
      "모달 표시 중 Enter → confirmDelete 분기 누락",
    );
    // 모달 표시 중 T 키는 비활성 (테마 토글 차단)
    assert.match(
      MAIN_SRC,
      /e\.key\s*===\s*["']t["']\s*\|\|\s*e\.key\s*===\s*["']T["'][\s\S]{0,200}pendingDeleteId/,
      "T 키 토글 시 pendingDeleteId 가드 누락 (모달 표시 중 차단)",
    );
  });
}
