// BF-438 · weather/storage + main.js 통합/회귀 가드
// - storage 시나리오: 추가 → 새로고침 시뮬 (같은 mem 으로 새 store) → 정렬·테마 복원
// - main.js / index.html / styles.css 정적 검증 (file:// CORS 안전 AC)
// - 결함 A~O 재발 방지: 정적 정규식 가드 (자세한 항목은 본 파일 주석 참고)
//
// 통합/UI 검증은 e2e (별도 task) 가 담당. 본 파일은 node:test 한정.

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEATHER_DIR = join(HERE, "..", "weather");
const STORAGE_PATH = join(WEATHER_DIR, "storage.js");
const MAIN_PATH = join(WEATHER_DIR, "main.js");
const HTML_PATH = join(WEATHER_DIR, "index.html");
const CSS_PATH = join(WEATHER_DIR, "styles.css");

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

// ──────────────────────────────────────────────────────────────
// 1. 통합 시나리오 — 새로고침 복원 (AC2)
// ──────────────────────────────────────────────────────────────

test("integration AC2: 카드 N개 추가 → 새로고침 시뮬 → 카드 + 정렬 + 테마 모두 복원", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();

  // 1) 첫 세션 — 카드 3건 추가 + 정렬 변경 + 테마 light 저장
  const t0 = 1700000000000;
  const s1 = WS.createWeatherStore(mem);
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const now = t0 + i * 1000;
    const id = WS.ulid(now);
    s1.saveCard({
      id,
      city: ["서울", "Tokyo", "London"][i],
      emoji: ["☀️", "☁️", "🌧️"][i],
      memo: `메모 ${i}`,
      state: ["sunny", "cloudy", "rainy"][i],
      createdAt: now,
      updatedAt: now,
    });
    ids.push(id);
  }
  s1.saveSort("city-asc");
  // 테마 — bf-theme 도 mem 에 직접 (브라우저 localStorage 와 같은 표면)
  mem.setItem("bf-theme", "light");

  // 2) 두 번째 세션 — 같은 mem 으로 새 store 인스턴스 (= 새로고침)
  const s2 = WS.createWeatherStore(mem);

  // 카드 복원
  const list = s2.listCards();
  assert.equal(list.length, 3, "카드 3건 모두 복원되어야 함");
  for (const id of ids) {
    const c = s2.getCard(id);
    assert.ok(c, `카드 ${id} 복원 실패`);
    assert.ok(c.city);
    assert.ok(c.emoji);
  }

  // 정렬 복원
  assert.equal(s2.loadSort(), "city-asc", "정렬 모드 city-asc 복원되어야 함");
  // listSorted 가 저장된 모드로 정렬되는지
  const sorted = s2.listSorted();
  // localeCompare 기준 — 영문 (London, Tokyo) 이 한글 (서울) 보다 일반적으로 먼저
  // 환경별 차이가 있을 수 있으나 "city-asc 모드 동작" 만 검증 — 무작위 순이 아니어야 함
  const cityOrder = sorted.map((c) => c.city);
  assert.notDeepEqual(
    cityOrder,
    ["서울", "Tokyo", "London"], // 입력 순서와 다를 것
    "city-asc 정렬이 입력 순서와 동일하면 안 됨 (정렬 안 됐다는 신호)",
  );

  // 테마 복원
  assert.equal(mem.getItem("bf-theme"), "light");
});

test("integration: 메모 편집 시 updatedAt 갱신 → updated-desc 정렬에서 최상단으로 이동", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  const t0 = 1700000000000;
  store.saveCard({
    id: "A",
    city: "서울",
    emoji: "☀️",
    memo: "v1",
    createdAt: t0,
    updatedAt: t0,
  });
  store.saveCard({
    id: "B",
    city: "Tokyo",
    emoji: "☁️",
    memo: "v1",
    createdAt: t0 + 1000,
    updatedAt: t0 + 1000,
  });

  // 초기 — Tokyo (B) 가 최신
  let sorted = store.listSorted("updated-desc");
  assert.deepEqual(sorted.map((c) => c.id), ["B", "A"]);

  // 서울 (A) 의 메모 편집 → updatedAt 새로 부여
  const existing = store.getCard("A");
  existing.memo = "v2";
  existing.updatedAt = t0 + 2000;
  store.saveCard(existing);

  sorted = store.listSorted("updated-desc");
  assert.deepEqual(sorted.map((c) => c.id), ["A", "B"]);
});

test("integration: 카드 추가 → 삭제 → 같은 prefix 정리, 다른 SPA 키 보존", () => {
  const WS = loadWeatherStorage();
  const mem = WS.createMemoryStorage();
  const store = WS.createWeatherStore(mem);

  mem.setItem("notepad:N1", JSON.stringify({ id: "N1", body: "메모" }));
  mem.setItem("bf-theme", "dark");

  const id = WS.ulid();
  store.saveCard({
    id,
    city: "Seoul",
    emoji: "☀️",
    memo: "",
    createdAt: 1,
  });
  assert.equal(store.listCards().length, 1);

  store.removeCard(id);
  assert.equal(store.listCards().length, 0);
  // 다른 SPA 키 보존 검증
  assert.equal(
    mem.getItem("notepad:N1"),
    JSON.stringify({ id: "N1", body: "메모" }),
  );
  assert.equal(mem.getItem("bf-theme"), "dark");
});

// ──────────────────────────────────────────────────────────────
// 2. file:// CORS 안전 (AC3) — 정적 가드
// ──────────────────────────────────────────────────────────────

test("AC3: weather/main.js 에 import / export / fetch / type=module / 외부 CDN 0건", () => {
  const codeOnly = MAIN_SRC.split("\n")
    .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .join("\n");
  assert.ok(
    !/(^|;|\n)\s*import\s+[\w*{]/.test(codeOnly),
    "main.js 에 import 키워드 발견",
  );
  assert.ok(
    !/(^|;|\n)\s*export\s+(default|{|const|let|var|function|class|async)/.test(
      codeOnly,
    ),
    "main.js 에 export 키워드 발견",
  );
  assert.ok(!/\bfetch\s*\(/.test(codeOnly), "main.js 에 fetch() 발견");
  assert.ok(
    !/\bXMLHttpRequest\b/.test(codeOnly),
    "main.js 에 XMLHttpRequest 발견",
  );
  assert.ok(
    !/https?:\/\/(cdn|fonts|unpkg|jsdelivr|cdnjs)/i.test(codeOnly),
    "main.js 에 외부 CDN 호스트 발견",
  );
});

test("AC3: weather/index.html 에 type=\"module\" / 외부 CDN / 외부 폰트 / fetch 0건", () => {
  // type="module" 금지 (file:// CORS 차단)
  assert.ok(
    !/<script[^>]*type\s*=\s*["']module["']/i.test(HTML_SRC),
    "index.html 에 <script type=\"module\"> 발견",
  );
  // 외부 호출 (cdn, googleapis, jsdelivr 등)
  assert.ok(
    !/https?:\/\/(cdn|fonts|unpkg|jsdelivr|cdnjs|googleapis)/i.test(HTML_SRC),
    "index.html 에 외부 CDN/폰트 호스트 발견",
  );
  // fetch / XMLHttpRequest
  assert.ok(!/\bfetch\s*\(/.test(HTML_SRC), "index.html 에 fetch() 발견");
  assert.ok(
    !/\bXMLHttpRequest\b/.test(HTML_SRC),
    "index.html 에 XMLHttpRequest 발견",
  );
  // <link rel="stylesheet" href="http..."> 외부 stylesheet 금지
  assert.ok(
    !/<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']https?:/i.test(
      HTML_SRC,
    ),
    "외부 stylesheet link 발견",
  );
});

test("AC3: weather/styles.css 에 @import 외부 호출 0건", () => {
  assert.ok(
    !/@import\s+url?\(?\s*["']?https?:/i.test(CSS_SRC),
    "styles.css 에 외부 @import 발견",
  );
});

// ──────────────────────────────────────────────────────────────
// 3. AC 매핑 — designer 명세 §7.8 정량 일치
// ──────────────────────────────────────────────────────────────

test("AC: styles.css 에 카드 hover transition 200ms (motion-mid) 와 translateY(-4px) 가 정의됨", () => {
  // --motion-mid: 200ms 토큰
  assert.match(CSS_SRC, /--motion-mid:\s*200ms/);
  // .card transition 에 var(--motion-mid) 가 transform 에 적용
  assert.match(CSS_SRC, /\.card[\s\S]{0,400}transition[\s\S]{0,400}var\(--motion-mid\)/);
  // hover translateY(-4px) — AC
  assert.match(CSS_SRC, /\.card:hover\s*\{[\s\S]*?translateY\(-4px\)/);
});

test("AC: 이모지 3rem · 카드 fade-in 280ms · stagger 80ms (정량 일치)", () => {
  // 이모지 3rem (AC 명시)
  assert.match(CSS_SRC, /\.card__emoji[\s\S]*?font-size:\s*3rem/);
  // fade-in keyframes
  assert.match(CSS_SRC, /@keyframes\s+card-enter/);
  // motion-slow 280ms
  assert.match(CSS_SRC, /--motion-slow:\s*280ms/);
  // 80ms stagger — nth-child(2) delay
  assert.match(CSS_SRC, /\.card:nth-child\(2\)\s*\{\s*animation-delay:\s*80ms/);
});

test("AC: 다크 토큰 페어 hex 가 명시값과 일치 (#0d1117 canvas, #38bdf8 accent)", () => {
  // [data-theme="dark"] 블록에 두 hex 박혀 있어야 함
  assert.match(
    CSS_SRC,
    /\[data-theme="dark"\][\s\S]*?--color-bg-canvas:\s*#0d1117/,
  );
  assert.match(
    CSS_SRC,
    /\[data-theme="dark"\][\s\S]*?--color-accent:\s*#38bdf8/,
  );
});

test("AC: grid 정량 분기 3/2/1 열 (≥960 / 600~959 / <600)", () => {
  // base — 3열
  assert.match(CSS_SRC, /\.grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  // 959px 이하 — 2열
  assert.match(
    CSS_SRC,
    /@media[^{]*max-width:\s*959px[^{]*\)\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*1fr\)/,
  );
  // 599px 이하 — 1열
  assert.match(
    CSS_SRC,
    /@media[^{]*max-width:\s*599px[^{]*\)\s*\{[\s\S]*?grid-template-columns:\s*1fr/,
  );
});

// ──────────────────────────────────────────────────────────────
// 4. AC4 — 다크 default + 테마 영속성 (head 인라인 + main.js 토글)
// ──────────────────────────────────────────────────────────────

test("AC4: head 에 다크 default 강제 인라인 스크립트 존재 (saved 없으면 dark)", () => {
  // bf-theme 읽고 saved 가 dark/light 아니면 dark 강제
  assert.match(
    HTML_SRC,
    /localStorage\.getItem\(["']bf-theme["']\)/,
    "head 에 bf-theme 읽는 코드 누락",
  );
  assert.match(
    HTML_SRC,
    /saved\s*===\s*["']light["']\s*\|\|\s*saved\s*===\s*["']dark["']\s*\?\s*saved\s*:\s*["']dark["']/,
    "다크 default fallback 패턴 누락",
  );
});

test("AC4: main.js 의 toggleTheme 이 writeTheme 으로 영속화", () => {
  // toggleTheme 함수에서 WeatherStorage.writeTheme(next) 호출
  assert.match(
    MAIN_SRC,
    /toggleTheme[\s\S]*?WeatherStorage\.writeTheme\(next\)/,
  );
  // setAttribute("data-theme", next) 도 같이
  assert.match(
    MAIN_SRC,
    /setAttribute\(["']data-theme["'],\s*next\)/,
  );
});

// ──────────────────────────────────────────────────────────────
// 5. 결함 A~O 재발 방지 (회귀 가드 — 정적 검사)
//    A: head/footer 공통 요소 누락 (BF-197) — viewport / lang / charset
//    B: ES module 으로 script 작성 (CORS 차단)
//    C: 외부 CDN 또는 webfont 사용
//    D: localStorage 키 prefix 미충돌 (`weather:` 사용)
//    E: ulid 외부 패키지 의존 (inline 의무)
//    F: 빈 상태 안내 누락
//    G: 정렬 토글 라벨 미동기 (sort-toggle__label 존재)
//    H: 모달 close 핸들러 누락 (cancel + backdrop)
//    I: 키보드 단축 Esc / T 누락
//    J: 다크 default 강제 인라인 누락 (FOUC)
//    K: aria-label 누락 (form / 카드 / 모달)
//    L: prefers-reduced-motion 가드 누락
//    M: 다른 SPA 키 보호 (clearAll 정책)
//    N: file:// 호환 (외부 호출 0)
//    O: 한국어 사용자 표면 텍스트 (운영 모니터 정합)
// ──────────────────────────────────────────────────────────────

test("회귀 가드 결함 A: index.html 에 viewport / lang / charset 메타가 있음", () => {
  assert.match(HTML_SRC, /<html\s+lang=["']ko["']/);
  assert.match(HTML_SRC, /<meta\s+charset=["']UTF-8["']/i);
  assert.match(
    HTML_SRC,
    /<meta\s+name=["']viewport["'][^>]*width=device-width/i,
  );
});

test("회귀 가드 결함 B / N: script type=\"module\" 사용 0건 + 외부 fetch 0건", () => {
  // 결함 B / N — 이미 위 AC3 에서 보장하지만 명시 가드
  assert.ok(!/<script[^>]*type\s*=\s*["']module["']/i.test(HTML_SRC));
  assert.ok(!/\bfetch\s*\(/.test(MAIN_SRC + STORAGE_SRC));
});

test("회귀 가드 결함 C: webfont (googleapis/typekit) link 0건", () => {
  assert.ok(!/fonts\.googleapis\.com|use\.typekit\.net|fonts\.cdnfonts\.com/i.test(HTML_SRC + CSS_SRC));
});

test("회귀 가드 결함 D / M: storage.js 가 weather: prefix 만 다루고 clearAll 이 다른 SPA 보호", () => {
  const WS = loadWeatherStorage();
  assert.equal(WS.CARD_PREFIX, "weather:");
  // 정책: prefix 일치 안 하는 키는 listCards 에서 제외
  const mem = WS.createMemoryStorage();
  mem.setItem("kanban:K1", JSON.stringify({ id: "K1", title: "kb" }));
  mem.setItem("notepad:N1", JSON.stringify({ id: "N1", body: "메모" }));
  mem.setItem(
    "weather:OK",
    JSON.stringify({ id: "OK", city: "서울", createdAt: 1 }),
  );
  const store = WS.createWeatherStore(mem);
  assert.equal(store.listCards().length, 1);
  store.clearAll();
  // 다른 SPA 키 보존
  assert.ok(mem.getItem("kanban:K1"));
  assert.ok(mem.getItem("notepad:N1"));
});

test("회귀 가드 결함 E: storage.js 가 inline ulid 를 직접 정의 (외부 import 0)", () => {
  // STORAGE_SRC 내부에 ulid 함수 정의 + CROCKFORD_ALPHABET 존재
  assert.match(STORAGE_SRC, /function\s+ulid\s*\(/);
  assert.match(STORAGE_SRC, /CROCKFORD_ALPHABET/);
  // import / require 0건
  assert.ok(!/(^|;|\n)\s*import\s+/.test(STORAGE_SRC));
  assert.ok(!/\brequire\s*\(/.test(STORAGE_SRC));
});

test("회귀 가드 결함 F: index.html 에 빈 상태 안내 element 존재 (empty-state)", () => {
  assert.match(HTML_SRC, /id=["']empty-state["']/);
  assert.match(HTML_SRC, /아직 도시가 없어요|첫 카드/);
});

test("회귀 가드 결함 G: 정렬 토글 라벨 element 존재 (sort-toggle__label)", () => {
  assert.match(HTML_SRC, /id=["']sort-toggle-label["']/);
  // main.js 에 updateSortLabel 함수 + 라벨 텍스트 두 모드 분기
  assert.match(MAIN_SRC, /updateSortLabel/);
  assert.match(MAIN_SRC, /최신순/);
  assert.match(MAIN_SRC, /도시명 가나다/);
});

test("회귀 가드 결함 H: 모달 close 핸들러 (cancel + backdrop) 존재", () => {
  assert.match(MAIN_SRC, /modalCancelEl\.addEventListener\(["']click["'],\s*closeModal/);
  assert.match(
    MAIN_SRC,
    /modalBackdropEl\.addEventListener\(["']click["'],[\s\S]*?closeModal/,
  );
});

test("회귀 가드 결함 I: 키보드 Esc + T + Enter 처리 분기 존재", () => {
  // Esc
  assert.match(MAIN_SRC, /e\.key\s*===\s*["']Escape["']/);
  // T (대/소문자)
  assert.match(MAIN_SRC, /e\.key\s*===\s*["']t["']\s*\|\|\s*e\.key\s*===\s*["']T["']/);
  // form Enter — form submit 으로 처리
  assert.match(MAIN_SRC, /formEl\.addEventListener\(["']submit["']/);
  // textarea Enter — 메모 편집 commit
  assert.match(MAIN_SRC, /e\.key\s*===\s*["']Enter["']/);
});

test("회귀 가드 결함 J: head 인라인 다크 default 스크립트가 head 안에 위치", () => {
  // head 안에 인라인 (FOUC 방지) — </head> 앞에 setAttribute 호출이 있어야 함
  const headMatch = HTML_SRC.match(/<head>([\s\S]*?)<\/head>/i);
  assert.ok(headMatch, "head 블록 누락");
  const head = headMatch[1];
  assert.match(head, /setAttribute\(["']data-theme["'],\s*theme\)/);
});

test("회귀 가드 결함 K: form / 카드 / 모달 / 토글 버튼에 aria-label 부여", () => {
  // form
  assert.match(HTML_SRC, /<form[^>]+aria-label=["']도시 추가["']/);
  // theme toggle
  assert.match(HTML_SRC, /id=["']theme-toggle["'][^>]*aria-label=["']테마 전환["']/);
  // sort toggle
  assert.match(HTML_SRC, /id=["']sort-toggle["'][^>]*aria-label=["']정렬 모드 전환["']/);
  // 모달 — role + aria-modal
  assert.match(HTML_SRC, /id=["']modal-backdrop["'][\s\S]*?role=["']dialog["']/);
  assert.match(HTML_SRC, /aria-modal=["']true["']/);
  // 카드 aria-label — main.js 가 동적 setAttribute
  assert.match(MAIN_SRC, /setAttribute\(["']aria-label["'],\s*card\.city\s*\+\s*["'] 날씨 카드["']\)/);
});

test("회귀 가드 결함 L: prefers-reduced-motion 가드가 styles.css 에 존재", () => {
  assert.match(
    CSS_SRC,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)/,
  );
  // animation / transition 비활성
  assert.match(
    CSS_SRC,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?animation:\s*none/,
  );
});

test("회귀 가드 결함 O: 사용자 표면 텍스트가 한국어 (운영자 모니터 정합)", () => {
  // 한국어 핵심 표면 텍스트가 index.html 에 있음
  const koPhrases = ["날씨", "도시", "이모지", "메모", "추가", "삭제"];
  for (const phrase of koPhrases) {
    assert.ok(HTML_SRC.indexOf(phrase) >= 0, `index.html 에 "${phrase}" 누락`);
  }
});
