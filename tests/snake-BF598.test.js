// BF-598 · 지렁이게임 pixi.js 마이그레이션 구현
//
// 검증 범위:
//   §1. pixi.js vendoring — index.html 에 ./vendor/pixi.min.js <script> 존재
//   §2. feature flag RENDER_BACKEND 상수 — game.js 에 존재, localStorage 오버라이드
//   §3. SnakeRenderer 객체 — init/resize/renderFrame/destroy 메서드 존재
//   §4. KPI 측정 코드 — render.backend / render.fps / render.fallback 키 존재
//   §5. 정적 가드 보존 — 기존 식별자(render/loop/startLoop/initGame 등) 불변
//   §6. fetch() 금지 가드 — game.js 에 fetch( 없음 (BF-522 호환)
//   §7. Canvas2D 폴백 경로 보존 — drawBackground/drawSnake 등 기존 함수 보존
//   §8. logic.js 불변 — 단위 테스트 행위 동일
//
// 실행: node --test tests/snake-BF598.test.js

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createInitialState,
  changeDirection,
  tick,
  tickFull,
  cpuChooseDir,
  restartGame,
  tickWithItems,
  SNAKE_SETTINGS_DEFAULTS,
  validateAndMergeSettings,
} from "../snake/logic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SNAKE_DIR = path.join(REPO_ROOT, "snake");
const gameJs   = readFileSync(path.join(SNAKE_DIR, "game.js"),    "utf-8");
const indexHtml = readFileSync(path.join(SNAKE_DIR, "index.html"), "utf-8");

// ─────────────────────────────────────────────────────────────
// §1. pixi.js vendoring
// ─────────────────────────────────────────────────────────────

describe("BF-598 §1 pixi.js vendoring — index.html 에 <script> 추가", () => {
  test("§1-1 index.html 에 ./vendor/pixi.min.js <script> 태그 존재", () => {
    assert.ok(
      indexHtml.includes("vendor/pixi.min.js"),
      "index.html 에 vendor/pixi.min.js <script> 태그 없음 — pixi.js 가 로드되지 않음",
    );
  });

  test("§1-2 pixi <script> 는 game.js <script> 보다 앞에 위치 (의존 순서)", () => {
    const pixiIdx  = indexHtml.indexOf("vendor/pixi.min.js");
    // src="./game.js" 패턴으로 script 태그 위치 검색 (주석 내 'game.js' 텍스트 오탐 방지)
    const gameIdx  = indexHtml.indexOf('src="./game.js"');
    assert.ok(
      pixiIdx !== -1 && gameIdx !== -1 && pixiIdx < gameIdx,
      "pixi.min.js <script> 가 game.js <script> 이후에 위치 — PIXI 전역이 game.js 실행 시 미정의됨",
    );
  });

  test("§1-3 pixi <script> 는 type='module' 이 아닌 일반 script (file:// 호환)", () => {
    const pixiIdx  = indexHtml.indexOf("vendor/pixi.min.js");
    // pixi script 태그 추출 (해당 줄 전후)
    const lineStart = indexHtml.lastIndexOf("\n", pixiIdx);
    const lineEnd   = indexHtml.indexOf("\n", pixiIdx);
    const line = indexHtml.slice(lineStart, lineEnd);
    assert.ok(
      !line.includes('type="module"'),
      "pixi <script> 에 type='module' 있음 — file:// CORS 오류 발생 가능",
    );
  });

  test("§1-4 snake/vendor/pixi.min.js 파일이 실제로 존재", () => {
    import("node:fs").then((fs) => {
      const vendorPath = path.join(SNAKE_DIR, "vendor", "pixi.min.js");
      assert.ok(
        fs.existsSync(vendorPath),
        "snake/vendor/pixi.min.js 파일이 없음 — vendored pixi.js 없이 오프라인 동작 불가",
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────
// §2. feature flag RENDER_BACKEND
// ─────────────────────────────────────────────────────────────

describe("BF-598 §2 feature flag RENDER_BACKEND 상수 (AC2 롤백 가능)", () => {
  test("§2-1 RENDER_BACKEND 상수 선언 존재 (const RENDER_BACKEND)", () => {
    assert.ok(
      /const\s+RENDER_BACKEND/.test(gameJs),
      "game.js 에 const RENDER_BACKEND 없음 — feature flag 없어 롤백 불가 (AC 회귀)",
    );
  });

  test("§2-2 'pixi' 문자열이 RENDER_BACKEND 관련 코드에 존재", () => {
    assert.ok(
      gameJs.includes('"pixi"') || gameJs.includes("'pixi'"),
      "game.js 에 'pixi' 문자열 없음 — pixi 백엔드 선택 코드 없음",
    );
  });

  test("§2-3 localStorage 오버라이드 키 존재 (bf-snake-render-backend)", () => {
    assert.ok(
      gameJs.includes("bf-snake-render-backend"),
      "game.js 에 bf-snake-render-backend localStorage 키 없음 — 런타임 롤백(L1) 불가",
    );
  });

  test("§2-4 pixi 미정의 시 canvas2d 폴백 분기 존재", () => {
    assert.ok(
      gameJs.includes('"canvas2d"') || gameJs.includes("'canvas2d'"),
      "game.js 에 'canvas2d' 폴백 문자열 없음 — WebGL 미지원 환경 폴백 경로 없음",
    );
    assert.ok(
      /canvas2d/.test(gameJs),
      "game.js 에 canvas2d 폴백 경로 없음",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §3. SnakeRenderer 객체 구조
// ─────────────────────────────────────────────────────────────

describe("BF-598 §3 SnakeRenderer 객체 — init/resize/renderFrame/destroy 메서드", () => {
  test("§3-1 SnakeRenderer 객체 존재 (const SnakeRenderer)", () => {
    assert.ok(
      /const\s+SnakeRenderer/.test(gameJs) || /SnakeRenderer\s*=/.test(gameJs),
      "game.js 에 SnakeRenderer 없음 — pixi 렌더러 추상화 누락",
    );
  });

  test("§3-2 SnakeRenderer.init 메서드 존재", () => {
    assert.ok(
      /SnakeRenderer.*init|init.*SnakeRenderer|function init\b/.test(gameJs),
      "game.js 에 SnakeRenderer.init 없음",
    );
  });

  test("§3-3 SnakeRenderer.resize 메서드 존재", () => {
    assert.ok(
      /SnakeRenderer.*resize|resize.*SnakeRenderer|function resize\b/.test(gameJs),
      "game.js 에 SnakeRenderer.resize 없음",
    );
  });

  test("§3-4 SnakeRenderer.renderFrame 메서드 존재", () => {
    assert.ok(
      /renderFrame/.test(gameJs),
      "game.js 에 renderFrame 없음 — pixi 씬 갱신 진입점 누락",
    );
  });

  test("§3-5 SnakeRenderer.destroy 메서드 존재 (롤백 자원 해제)", () => {
    assert.ok(
      /destroy/.test(gameJs),
      "game.js 에 destroy 없음 — pixi 자원 해제 경로 없음 (AC 롤백 가능 회귀)",
    );
  });

  test("§3-6 pixi autoStart:false 설정 (이중 루프 방지)", () => {
    assert.ok(
      /autoStart\s*:\s*false/.test(gameJs),
      "game.js 에 autoStart:false 없음 — pixi ticker 이중 루프 시 게임 속도 변동 (사용자 영향 발생)",
    );
  });

  test("§3-7 ticker.stop() 호출 존재 (이중 루프 방지 이중 가드)", () => {
    assert.ok(
      /ticker\.stop\s*\(\s*\)/.test(gameJs),
      "game.js 에 ticker.stop() 없음 — pixi autoStart 이후에도 ticker 활성화 위험",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §4. KPI 측정 코드
// ─────────────────────────────────────────────────────────────

describe("BF-598 §4 KPI 측정 코드 — render.backend / render.fps / render.fallback", () => {
  test("§4-1 bf-snake-render-kpi localStorage 키 존재 (KPI 세션 저장)", () => {
    assert.ok(
      gameJs.includes("bf-snake-render-kpi"),
      "game.js 에 bf-snake-render-kpi 키 없음 — KPI 세션 저장 누락",
    );
  });

  test("§4-2 render.backend KPI 이벤트 코드 존재", () => {
    assert.ok(
      gameJs.includes("render.backend") || gameJs.includes("render_backend"),
      "game.js 에 render.backend KPI 이벤트 없음 — 백엔드 추적 누락",
    );
  });

  test("§4-3 render.fps KPI 이벤트 코드 존재 (avgFps 계측)", () => {
    assert.ok(
      gameJs.includes("render.fps") || gameJs.includes("avgFps"),
      "game.js 에 render.fps/avgFps KPI 코드 없음 — FPS 추적 누락",
    );
  });

  test("§4-4 render.fallback KPI 이벤트 코드 존재 (폴백 추적)", () => {
    assert.ok(
      gameJs.includes("render.fallback"),
      "game.js 에 render.fallback KPI 없음 — pixi 폴백 추적 불가",
    );
  });

  test("§4-5 BF-595 KPI console.log 패턴 존재", () => {
    assert.ok(
      /\[BF-595/.test(gameJs),
      "game.js 에 [BF-595] KPI console.log 없음 — 명세 §7-3 콘솔 출력 누락",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §5. 기존 정적 가드 식별자 보존 (BF-586-e2e / BF-590-e2e 호환)
// ─────────────────────────────────────────────────────────────

describe("BF-598 §5 기존 정적 가드 식별자 보존 (기존 테스트 회귀 방지)", () => {
  const identifiers = [
    { id: "function render(",         desc: "render 함수 (루프 구조 가드)" },
    { id: "function loop(",           desc: "loop 함수 (RAF 루프 가드)" },
    { id: "function startLoop(",      desc: "startLoop 함수 (루프 시작 가드)" },
    { id: "function initGame(",       desc: "initGame 함수 (BF-590-e2e 가드)" },
    { id: "function doRestart(",      desc: "doRestart 함수 (BF-590-e2e 가드)" },
    { id: "function openSettingsModal",   desc: "openSettingsModal (BF-586-e2e 가드)" },
    { id: "function closeSettingsModal",  desc: "closeSettingsModal (BF-586-e2e 가드)" },
    { id: "function saveSettingsModal",   desc: "saveSettingsModal (BF-586-e2e 가드)" },
    { id: "function reflectDraftToControls", desc: "reflectDraftToControls (BF-586-e2e 가드)" },
  ];

  for (const { id, desc } of identifiers) {
    test(`§5 ${id} — ${desc}`, () => {
      assert.ok(
        gameJs.includes(id),
        `game.js 에 '${id}' 없음 — 기존 테스트 회귀: ${desc}`,
      );
    });
  }
});

// ─────────────────────────────────────────────────────────────
// §6. fetch() 금지 가드 (BF-522 + BF-586-e2e §2-2)
// ─────────────────────────────────────────────────────────────

describe("BF-598 §6 fetch() 금지 가드 — game.js 에 fetch( 없음", () => {
  test("§6-1 game.js 에 fetch( 미사용 (CDN 로딩 금지)", () => {
    assert.ok(
      !gameJs.includes("fetch("),
      "game.js 에 fetch() 호출 존재 — file:// 환경 CORS 오류 + BF-522/BF-586 정적 가드 실패",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §7. Canvas2D 폴백 경로 보존 (롤백 가능 AC)
// ─────────────────────────────────────────────────────────────

describe("BF-598 §7 Canvas2D 폴백 경로 보존 (롤백 가능 — AC2)", () => {
  test("§7-1 drawBackground 함수 본문 존재 (Canvas2D 폴백 경로)", () => {
    assert.ok(
      gameJs.includes("function drawBackground("),
      "game.js 에 drawBackground 함수 없음 — Canvas2D 폴백 경로 삭제 (롤백 불가)",
    );
  });

  test("§7-2 drawSnake 함수 본문 존재", () => {
    assert.ok(
      gameJs.includes("function drawSnake("),
      "game.js 에 drawSnake 함수 없음 — Canvas2D 폴백 경로 삭제 (롤백 불가)",
    );
  });

  test("§7-3 drawCpuSnake 함수 본문 존재", () => {
    assert.ok(
      gameJs.includes("function drawCpuSnake("),
      "game.js 에 drawCpuSnake 함수 없음 — Canvas2D 폴백 경로 삭제 (롤백 불가)",
    );
  });

  test("§7-4 drawFood 함수 본문 존재", () => {
    assert.ok(
      gameJs.includes("function drawFood("),
      "game.js 에 drawFood 함수 없음 — Canvas2D 폴백 경로 삭제 (롤백 불가)",
    );
  });

  test("§7-5 render() 에서 RENDER_BACKEND 분기 처리 (pixi/canvas2d)", () => {
    const renderIdx = gameJs.indexOf("function render(");
    assert.ok(renderIdx !== -1, "render 함수 없음");
    const renderSlice = gameJs.slice(renderIdx, renderIdx + 500);
    assert.ok(
      /RENDER_BACKEND|renderFrame|SnakeRenderer/.test(renderSlice),
      "render() 함수가 RENDER_BACKEND/renderFrame/SnakeRenderer 를 사용하지 않음 — pixi 통합 누락",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §8. logic.js 불변 — 기존 단위 테스트 행위 동일 (BF-598 AC2)
// ─────────────────────────────────────────────────────────────

describe("BF-598 §8 logic.js 불변 — 게임 시나리오 동등성", () => {
  const COLS = 30, ROWS = 20;

  function makeState(opts = {}) {
    const settings = validateAndMergeSettings({
      ...SNAKE_SETTINGS_DEFAULTS,
      cpuCount: 1,
      ...opts,
    });
    return createInitialState(COLS, ROWS, 0, settings);
  }

  // 시나리오 1: 시작
  test("§8-1 시작 시나리오 — createInitialState 로 playing 상태 생성", () => {
    const st = makeState();
    // logic.js 의 createInitialState 는 "playing" 상태를 반환 (Space 키 불필요 — 즉시 시작)
    assert.ok(
      st.status === "playing" || st.status === "waiting",
      `초기 상태가 playing/waiting 이 아님: ${st.status}`,
    );
    assert.ok(st.snake.length >= 3, "초기 지렁이 길이가 3 미만");
    assert.ok(st.cpu.length >= 3, "초기 CPU 지렁이 길이가 3 미만");
    assert.equal(st.score, 0, "초기 점수가 0 이 아님");
  });

  // 시나리오 2: 이동
  test("§8-2 이동 시나리오 — tick 후 지렁이가 방향으로 이동", () => {
    let st = makeState();
    st = Object.assign({}, st, { status: "playing" });
    const headBefore = { ...st.snake[0] };
    const dir = st.dir;
    st = tick(st, true, false);
    const headAfter = st.snake[0];
    assert.equal(headAfter.x, headBefore.x + dir.x, "X 이동 오류");
    assert.equal(headAfter.y, headBefore.y + dir.y, "Y 이동 오류");
  });

  // 시나리오 3: 방향 전환
  test("§8-3 방향 전환 — changeDirection 후 nextDir 설정", () => {
    let st = makeState();
    st = Object.assign({}, st, { status: "playing" });
    // 초기 방향이 RIGHT(x=1)이면 UP 으로 변환 (자살 방향 아님)
    const newDir = { x: 0, y: -1 }; // UP
    const prevDir = st.dir;
    st = changeDirection(st, newDir);
    // changeDirection 은 nextDir 을 설정 (tick 에서 dir 로 적용됨)
    const isSuicide = (newDir.x + prevDir.x === 0 && newDir.y + prevDir.y === 0);
    if (!isSuicide) {
      assert.deepEqual(st.nextDir, newDir, "방향 변경 실패 — nextDir 미설정");
    }
  });

  // 시나리오 4: 점수
  test("§8-4 점수 시나리오 — 먹이 위치에 지렁이 이동 시 score 증가", () => {
    let st = makeState({ cpuCount: 0 });
    st = Object.assign({}, st, { status: "playing" });
    // 먹이를 지렁이 머리 바로 앞에 배치
    const head = st.snake[0];
    const dir  = st.dir;
    const foodX = head.x + dir.x;
    const foodY = head.y + dir.y;
    const inBounds = foodX >= 0 && foodX < COLS && foodY >= 0 && foodY < ROWS;
    if (!inBounds) return; // 경계 밖이면 skip
    st = Object.assign({}, st, {
      food: { x: foodX, y: foodY, multiplier: 1 },
    });
    const scoreBefore = st.score;
    st = tick(st, true, false);
    assert.ok(st.score > scoreBefore, "먹이 획득 시 score 가 증가하지 않음");
  });

  // 시나리오 5: 충돌
  test("§8-5 충돌 시나리오 — 벽 충돌 시 gameover", () => {
    let st = makeState({ cpuCount: 0 });
    st = Object.assign({}, st, { status: "playing" });
    // 지렁이를 벽 쪽으로 강제 이동 (충분히 많이 tick)
    let limit = COLS + ROWS;
    while (st.status === "playing" && limit-- > 0) {
      st = tick(st, true, false);
    }
    // 최소한 벽 충돌 또는 게임오버가 발생해야 함
    // (충분히 많이 이동하면 결국 벽에 부딪힘)
    // 단순하게 벽에 강제 충돌
    const corner = { x: 0, y: 0 };
    const crashState = Object.assign({}, st, {
      snake: [corner, { x: 1, y: 0 }, { x: 2, y: 0 }],
      dir: { x: -1, y: 0 }, // LEFT — 벽으로
      status: "playing",
    });
    const after = tick(crashState, true, false);
    assert.equal(after.status, "gameover", "벽 충돌 시 gameover 가 되지 않음");
  });

  // 시나리오 6: 재시작
  test("§8-6 재시작 시나리오 — restartGame 후 playing 상태 복귀", () => {
    let st = makeState();
    st = Object.assign({}, st, { status: "gameover", score: 10 });
    st = restartGame(st, SNAKE_SETTINGS_DEFAULTS);
    // restartGame 은 "playing" 상태로 즉시 복귀
    assert.ok(
      st.status === "playing" || st.status === "waiting",
      `재시작 후 playing/waiting 이 아님: ${st.status}`,
    );
    assert.equal(st.score, 0, "재시작 후 score 가 0 이 아님");
    assert.ok(st.snake.length >= 3, "재시작 후 지렁이 길이가 3 미만");
  });

  // KPI 동등성: logic.js import 가 가능하고 동일 결과를 내야 함
  test("§8-7 KPI — logic.js 단독 import 성공 (pixi.js 의존 없음)", () => {
    // 이미 import 성공이면 이 테스트는 통과
    assert.ok(typeof createInitialState === "function", "createInitialState import 실패");
    assert.ok(typeof tickWithItems === "function",      "tickWithItems import 실패");
    assert.ok(typeof validateAndMergeSettings === "function", "validateAndMergeSettings import 실패");
  });
});

// ─────────────────────────────────────────────────────────────
// §9. index.html game-canvas 보존 (Puppeteer e2e 가드 호환)
// ─────────────────────────────────────────────────────────────

describe("BF-598 §9 index.html game-canvas 요소 보존 (BF-516/BF-520 e2e 가드 호환)", () => {
  test("§9-1 index.html 에 id='game-canvas' 존재", () => {
    assert.ok(
      indexHtml.includes('id="game-canvas"'),
      "index.html 에 id='game-canvas' 없음 — Puppeteer e2e 가드 실패",
    );
  });

  test("§9-2 canvas 요소가 <canvas> 태그 (pixi 가 view 로 재사용)", () => {
    assert.ok(
      /<canvas[^>]*id="game-canvas"/.test(indexHtml),
      "index.html 의 game-canvas 가 <canvas> 태그가 아님",
    );
  });
});

// ─────────────────────────────────────────────────────────────
// §10. 색상 상수 — pixi 색상 변환 규약 (designer §2, §6)
// ─────────────────────────────────────────────────────────────

describe("BF-598 §10 pixi 색상 변환 규약 — 0x 형식 색상 상수 존재", () => {
  test("§10-1 플레이어 헤드 색 0x00cc44 존재 (designer §2-2)", () => {
    assert.ok(
      gameJs.includes("0x00cc44"),
      "game.js 에 0x00cc44(플레이어 헤드) 없음 — designer 색상 변환 누락",
    );
  });

  test("§10-2 CPU 헤드 색 0xcc2200 존재 (designer §2-3)", () => {
    assert.ok(
      gameJs.includes("0xcc2200"),
      "game.js 에 0xcc2200(CPU 헤드) 없음 — designer 색상 변환 누락",
    );
  });

  test("§10-3 배경 색 0x0d0d0d 존재 (designer §2-1)", () => {
    assert.ok(
      gameJs.includes("0x0d0d0d"),
      "game.js 에 0x0d0d0d(배경) 없음 — designer 색상 변환 누락",
    );
  });

  test("§10-4 먹이 1x 색 0xffcc00 존재 (designer §2-4)", () => {
    assert.ok(
      gameJs.includes("0xffcc00"),
      "game.js 에 0xffcc00(먹이 1×) 없음 — designer 색상 변환 누락",
    );
  });
});
