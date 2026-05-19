// BF-608 · snake pixi.js 렌더 백엔드 전환 + npm 실행 스크립트 + README 로컬 실행 가이드
//
// 검증 범위:
//   §1. pixi.js vendoring — CDN URL 0건, snake/vendor/pixi.min.js 존재 (AC1)
//   §2. URL 파라미터 ?backend= 지원 — game.js 에 URLSearchParams 로직 존재 (AC2·AC3)
//   §3. BF-598 canvas2d 폴백 함수 불변 — drawBackground/drawSnake 등 (AC3·AC4)
//   §4. 렌더 요소 보존 — gameover-overlay / item-slot-hud / buff-bar (AC4)
//   §5. npm start 스크립트 + http-server devDep 존재 (AC5)
//   §6. npm test(test:snake) 스크립트 존재 — 이 파일 자체가 AC6 증거 (AC6)
//   §7. README 로컬 실행 섹션 — 방법 A / 방법 B 존재 (AC7)
//
// 실행: node --test tests/snake-BF608.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dirname, "..");
const SNAKE_DIR  = path.join(REPO_ROOT, "snake");

const gameJs    = readFileSync(path.join(SNAKE_DIR, "game.js"),    "utf-8");
const indexHtml = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");
const pkgJson   = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"));
const readmeMd  = readFileSync(path.join(REPO_ROOT, "README.md"),  "utf-8");

// ─────────────────────────────────────────────────────────────
// §1. pixi.js vendoring — CDN URL 0건 (AC1)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §1 pixi.js vendoring — CDN URL 0건 (AC1)", () => {
  test("§1-1 index.html 에 CDN URL(unpkg/cdnjs/jsdelivr/esm.sh) 없음", () => {
    const cdnPatterns = [
      "unpkg.com",
      "cdnjs.cloudflare.com",
      "cdn.jsdelivr.net",
      "esm.sh",
      "skypack.dev",
      "cdn.skypack.dev",
    ];
    for (const pattern of cdnPatterns) {
      assert.ok(
        !indexHtml.includes(pattern),
        `index.html 에 CDN URL 존재: ${pattern} — pixi.js vendoring 깨짐`,
      );
    }
  });

  test("§1-2 index.html 에 ./vendor/pixi.min.js <script> 태그 존재", () => {
    assert.ok(
      indexHtml.includes("vendor/pixi.min.js"),
      "index.html 에 vendor/pixi.min.js <script> 없음 — pixi vendoring 로드 경로 미설정",
    );
  });

  test("§1-3 snake/vendor/pixi.min.js 파일 실제 존재 (오프라인 동작 가능)", () => {
    const vendorPath = path.join(SNAKE_DIR, "vendor", "pixi.min.js");
    assert.ok(
      existsSync(vendorPath),
      "snake/vendor/pixi.min.js 파일 없음 — CDN 없이 오프라인 동작 불가",
    );
  });

  test("§1-4 pixi <script> 에 type='module' 없음 (file:// 호환)", () => {
    const pixiIdx  = indexHtml.indexOf("vendor/pixi.min.js");
    assert.ok(pixiIdx !== -1, "vendor/pixi.min.js 태그 없음");
    const lineStart = indexHtml.lastIndexOf("\n", pixiIdx);
    const lineEnd   = indexHtml.indexOf("\n", pixiIdx);
    const line = indexHtml.slice(lineStart, lineEnd);
    assert.ok(
      !line.includes('type="module"'),
      "pixi <script> 에 type='module' 있음 — file:// 환경 CORS 오류 가능",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §2. URL 파라미터 ?backend= 지원 (AC2·AC3)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §2 URL 파라미터 ?backend= 지원 (AC2·AC3)", () => {
  test("§2-1 game.js 에 URLSearchParams 사용 코드 존재 (URL 파라미터 파싱)", () => {
    assert.ok(
      gameJs.includes("URLSearchParams"),
      "game.js 에 URLSearchParams 없음 — ?backend= URL 파라미터 파싱 불가 (AC2 회귀)",
    );
  });

  test("§2-2 game.js 에 location.search 참조 존재 (현재 URL 쿼리 읽기)", () => {
    assert.ok(
      gameJs.includes("location.search"),
      "game.js 에 location.search 없음 — URL 파라미터 추출 경로 없음",
    );
  });

  test("§2-3 URL 파라미터에서 'backend' 키를 get() 하는 코드 존재", () => {
    assert.ok(
      /\.get\s*\(\s*["']backend["']\s*\)/.test(gameJs),
      "game.js 에 .get('backend') 없음 — ?backend= 파라미터 미처리",
    );
  });

  test("§2-4 URL 파라미터 'pixi' 값 처리 코드 존재 (AC2)", () => {
    // URLSearchParams 블록 안에 'pixi' 선택 분기 있어야 함
    const urlParamIdx = gameJs.indexOf("URLSearchParams");
    assert.ok(urlParamIdx !== -1, "URLSearchParams 없음");
    const slice = gameJs.slice(urlParamIdx, urlParamIdx + 300);
    assert.ok(
      slice.includes('"pixi"') || slice.includes("'pixi'"),
      "URLSearchParams 파싱 블록에 'pixi' 값 처리 없음 — ?backend=pixi 동작 불가",
    );
  });

  test("§2-5 URL 파라미터 'canvas2d' 값 처리 코드 존재 (AC3)", () => {
    const urlParamIdx = gameJs.indexOf("URLSearchParams");
    assert.ok(urlParamIdx !== -1, "URLSearchParams 없음");
    const slice = gameJs.slice(urlParamIdx, urlParamIdx + 300);
    assert.ok(
      slice.includes('"canvas2d"') || slice.includes("'canvas2d'"),
      "URLSearchParams 파싱 블록에 'canvas2d' 값 처리 없음 — ?backend=canvas2d 동작 불가",
    );
  });

  test("§2-6 localStorage 오버라이드가 URL 파라미터보다 우선순위 높음 (설계 순서 검증)", () => {
    // localStorage 관련 코드가 URLSearchParams 코드보다 앞에 위치해야 함
    const lsIdx  = gameJs.indexOf(_LS_RENDER_BACKEND_KEY_STR());
    const urlIdx = gameJs.indexOf("URLSearchParams");
    assert.ok(
      lsIdx !== -1 && urlIdx !== -1 && lsIdx < urlIdx,
      "localStorage 오버라이드 코드가 URLSearchParams 코드 이후에 위치 — 우선순위 역전",
    );
  });

  test("§2-7 Node.js/SSR 환경 try-catch 가드 존재 (location 미정의 환경 안전)", () => {
    // location.search 접근 블록에 try-catch 있어야 함
    const urlParamIdx = gameJs.indexOf("URLSearchParams");
    assert.ok(urlParamIdx !== -1, "URLSearchParams 없음");
    const sliceAround = gameJs.slice(Math.max(0, urlParamIdx - 100), urlParamIdx + 300);
    assert.ok(
      /try\s*\{/.test(sliceAround),
      "URLSearchParams 블록에 try-catch 없음 — Node.js/SSR 환경에서 ReferenceError 발생 가능",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §3. BF-598 canvas2d 폴백 함수 불변 (AC3·AC4)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §3 BF-598 canvas2d 폴백 함수 불변 (AC3·AC4)", () => {
  const requiredFunctions = [
    { id: "function drawBackground(",  desc: "배경·격자 렌더 (canvas2d 폴백)" },
    { id: "function drawSnake(",       desc: "플레이어 뱀 렌더 (canvas2d 폴백)" },
    { id: "function drawCpuSnake(",    desc: "CPU 뱀 렌더 (canvas2d 폴백)" },
    { id: "function drawFood(",        desc: "먹이 렌더 (canvas2d 폴백)" },
    { id: "function render(",          desc: "메인 렌더 루프 (RENDER_BACKEND 분기)" },
    { id: "function loop(",            desc: "RAF 루프" },
    { id: "function startLoop(",       desc: "루프 시작" },
    { id: "function initGame(",        desc: "게임 초기화 (BF-590-e2e 가드)" },
    { id: "function doRestart(",       desc: "게임 재시작 (BF-590-e2e 가드)" },
  ];

  for (const { id, desc } of requiredFunctions) {
    test(`§3 ${id} — ${desc}`, () => {
      assert.ok(
        gameJs.includes(id),
        `game.js 에 '${id}' 없음 — BF-598 기능 회귀: ${desc}`,
      );
    });
  }

  test("§3-9 render() 에서 RENDER_BACKEND 분기 존재 (pixi/canvas2d 경로 유지)", () => {
    const renderIdx = gameJs.indexOf("function render(");
    assert.ok(renderIdx !== -1, "render 함수 없음");
    const renderSlice = gameJs.slice(renderIdx, renderIdx + 600);
    assert.ok(
      /RENDER_BACKEND|renderFrame|SnakeRenderer/.test(renderSlice),
      "render() 에서 RENDER_BACKEND/renderFrame/SnakeRenderer 사용 없음 — pixi 통합 누락",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §4. 게임오버·아이템·뱀·먹이 렌더 요소 보존 (AC4)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §4 렌더 요소 보존 — gameover/item/snake (AC4)", () => {
  const requiredElements = [
    { id: 'id="gameover-overlay"',  desc: "게임오버 오버레이" },
    { id: 'id="game-canvas"',       desc: "게임 캔버스 (pixi view 재사용)" },
    { id: 'id="item-slot-hud"',     desc: "아이템 슬롯 HUD" },
    { id: 'id="buff-bar"',          desc: "버프 바 HUD" },
    { id: 'id="hud"',               desc: "점수 HUD" },
    { id: 'id="toast-container"',   desc: "토스트 알림" },
  ];

  for (const { id, desc } of requiredElements) {
    test(`§4 ${id} — ${desc} (AC4 렌더 검증)`, () => {
      assert.ok(
        indexHtml.includes(id),
        `index.html 에 ${id} 없음 — ${desc} 렌더 요소 누락 (AC4 회귀)`,
      );
    });
  }

  test("§4-7 SnakeRenderer 객체 — pixi 렌더 어댑터 (AC2 pixi 백엔드 렌더)", () => {
    assert.ok(
      /const\s+SnakeRenderer/.test(gameJs) || /SnakeRenderer\s*=/.test(gameJs),
      "game.js 에 SnakeRenderer 없음 — pixi 렌더 어댑터 누락 (AC2 회귀)",
    );
  });

  test("§4-8 renderFrame 메서드 — pixi 씬 갱신 (AC2·AC4)", () => {
    assert.ok(
      gameJs.includes("renderFrame"),
      "game.js 에 renderFrame 없음 — pixi 씬 갱신 진입점 누락 (AC2/AC4 회귀)",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §5. npm start 스크립트 + http-server devDep (AC5)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §5 npm start 스크립트 + http-server devDep (AC5)", () => {
  test("§5-1 package.json 에 start 스크립트 존재", () => {
    assert.ok(
      pkgJson.scripts && typeof pkgJson.scripts.start === "string",
      "package.json 에 start 스크립트 없음 — npm start 동작 불가 (AC5 회귀)",
    );
  });

  test("§5-2 start 스크립트에 http-server 포함 (정적 서버)", () => {
    assert.ok(
      pkgJson.scripts.start.includes("http-server"),
      `start 스크립트 '${pkgJson.scripts.start}' 에 http-server 없음 — 정적 서버 미사용 (AC5)`,
    );
  });

  test("§5-3 start 스크립트에 포트 8080 지정", () => {
    assert.ok(
      pkgJson.scripts.start.includes("8080"),
      `start 스크립트에 포트 8080 없음: ${pkgJson.scripts.start} — localhost:8080 접근 불가`,
    );
  });

  test("§5-4 package.json devDependencies 에 http-server 포함", () => {
    const devDeps = pkgJson.devDependencies || {};
    assert.ok(
      "http-server" in devDeps,
      "package.json devDependencies 에 http-server 없음 — npm install 후 http-server 미설치",
    );
  });

  test("§5-5 package.json devDependencies 에 pixi.js 유지 (vendoring 병행)", () => {
    const devDeps = pkgJson.devDependencies || {};
    assert.ok(
      "pixi.js" in devDeps,
      "package.json devDependencies 에 pixi.js 없음 — vendoring 빌드 의존 제거됨",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §6. npm test / test:snake 스크립트 존재 (AC6)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §6 npm test / test:snake 스크립트 존재 (AC6)", () => {
  test("§6-1 package.json 에 test 스크립트 존재", () => {
    assert.ok(
      pkgJson.scripts && typeof pkgJson.scripts.test === "string",
      "package.json 에 test 스크립트 없음 — npm test 실행 불가 (AC6 회귀)",
    );
  });

  test("§6-2 package.json 에 test:snake 스크립트 존재", () => {
    assert.ok(
      pkgJson.scripts && typeof pkgJson.scripts["test:snake"] === "string",
      "package.json 에 test:snake 스크립트 없음",
    );
  });

  test("§6-3 package.json 에 test:e2e 스크립트 존재", () => {
    assert.ok(
      pkgJson.scripts && typeof pkgJson.scripts["test:e2e"] === "string",
      "package.json 에 test:e2e 스크립트 없음 — E2E 실행 진입점 없음",
    );
  });

  test("§6-4 test 스크립트에 snake-BF608.test.js 파일 포함 (이 테스트 파일 실행 가능)", () => {
    assert.ok(
      pkgJson.scripts.test.includes("snake-BF608"),
      `test 스크립트 '${pkgJson.scripts.test}' 가 snake-BF608.test.js 를 포함하지 않음`,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §7. README 로컬 실행 섹션 — 방법 A/B (AC7)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §7 README 로컬 실행 섹션 — 방법 A/B (AC7)", () => {
  test("§7-1 README.md 에 '로컬 실행' 섹션 존재", () => {
    assert.ok(
      readmeMd.includes("로컬 실행"),
      "README.md 에 '로컬 실행' 섹션 없음 — 신규 dev 가 시작 방법 파악 불가 (AC7 회귀)",
    );
  });

  test("§7-2 README.md 에 '방법 A' — 정적 서버 방식 설명 존재", () => {
    assert.ok(
      readmeMd.includes("방법 A") || readmeMd.includes("npm start") && readmeMd.includes("http-server"),
      "README.md 에 방법 A(정적 서버) 설명 없음 — npm start 사용법 미안내 (AC7)",
    );
  });

  test("§7-3 README.md 에 'npm start' 명령 존재 (방법 A 핵심 명령)", () => {
    assert.ok(
      readmeMd.includes("npm start"),
      "README.md 에 npm start 명령 없음 — AC5/AC7 연계 회귀",
    );
  });

  test("§7-4 README.md 에 '방법 B' — file:// 직접 열기 설명 존재", () => {
    assert.ok(
      readmeMd.includes("방법 B") || readmeMd.includes("file://"),
      "README.md 에 방법 B(file:// 직접 열기) 설명 없음 — 추가 설치 없이 확인하는 방법 미안내 (AC7)",
    );
  });

  test("§7-5 README.md 에 localhost:8080/snake/ 접근 경로 안내 존재", () => {
    assert.ok(
      readmeMd.includes("localhost:8080") || readmeMd.includes("8080"),
      "README.md 에 localhost:8080 접근 경로 없음 — snake 서버 접근 URL 미안내 (AC5/AC7)",
    );
  });

  test("§7-6 README.md 로컬 실행 섹션이 최상단(첫 번째 주요 섹션) 위치", () => {
    const localRunIdx = readmeMd.indexOf("로컬 실행");
    const spaRouteIdx = readmeMd.indexOf("SPA 라우트");
    assert.ok(
      localRunIdx !== -1,
      "README.md 에 '로컬 실행' 섹션 없음",
    );
    assert.ok(
      spaRouteIdx === -1 || localRunIdx < spaRouteIdx,
      "README.md '로컬 실행' 섹션이 'SPA 라우트' 이후에 위치 — 최상단 배치 요구사항 불만족",
    );
  });

  test("§7-7 README.md 에 ?backend=pixi URL 파라미터 사용법 안내 존재 (AC2 연계)", () => {
    assert.ok(
      readmeMd.includes("?backend=pixi") || readmeMd.includes("backend=pixi"),
      "README.md 에 ?backend=pixi URL 파라미터 사용법 없음 — 신규 dev 가 백엔드 전환 방법 파악 불가",
    );
  });

  test("§7-8 README.md 에 '함정' 안내 존재 (권장·함정 명세 요건)", () => {
    assert.ok(
      readmeMd.includes("함정"),
      "README.md 에 '함정' 안내 없음 — file:// 제약·npm install 필요 등 함정 미안내",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §8. fetch() 금지 가드 — BF-522 보존 (file:// 호환 회귀 방지)
// ─────────────────────────────────────────────────────────────

describe("BF-608 §8 fetch() 금지 가드 — BF-522 보존", () => {
  test("§8-1 game.js 에 fetch() 미사용 (CDN 로딩 금지)", () => {
    assert.ok(
      !gameJs.includes("fetch("),
      "game.js 에 fetch() 존재 — file:// 환경 CORS 오류 + BF-522 회귀",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// 헬퍼 — _LS_RENDER_BACKEND_KEY 상수 문자열 추출
// ─────────────────────────────────────────────────────────────

function _LS_RENDER_BACKEND_KEY_STR() {
  // game.js 에서 실제 상수 값 추출 (테스트 하드코딩 방지)
  const m = gameJs.match(/_LS_RENDER_BACKEND_KEY\s*=\s*["']([^"']+)["']/);
  return m ? m[1] : "bf-snake-render-backend";
}
