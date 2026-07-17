// BF-982 · 지뢰찾기 단위 테스트 (focused scope · module: minesweeper)
// - 대상: minesweeper/{index.html, styles.css, logic.js, main.js}
// - 실행: node --test tests/minesweeper-BF982.test.js
// - 기획 SSOT: docs/plan/minesweeper-BF-978.md (§2~§6 규칙·contract, §8 TC-01~TC-16)
// - 디자인 SSOT: docs/design/minesweeper-BF-980.md (§5 컴포넌트·§6 dev 가이드)
//
// 검증 축:
//   1) vanilla-static file:// 안전 가드 — import/export·type="module"·fetch·외부 URL·localStorage 0건
//   2) 순수 로직 contract — createBoard/placeMines/openCell/toggleFlag (planner §6, §8.3)
import { test, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = join(__dirname, "..", "minesweeper");

const HTML = readFileSync(join(MODULE_DIR, "index.html"), "utf8");
const CSS = readFileSync(join(MODULE_DIR, "styles.css"), "utf8");
const LOGIC_JS = readFileSync(join(MODULE_DIR, "logic.js"), "utf8");
const MAIN_JS = readFileSync(join(MODULE_DIR, "main.js"), "utf8");

// ─────────── logic.js 를 샌드박스에서 로드해 MinesweeperLogic 추출 ───────────
function loadLogic() {
  const ctx = { globalThis: undefined, module: { exports: {} }, Math: Math };
  ctx.globalThis = ctx;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(LOGIC_JS, ctx, { filename: "minesweeper/logic.js" });
  const api = ctx.module.exports;
  assert.ok(api && api.createBoard, "logic.js 가 MinesweeperLogic API 를 노출하지 않음");
  return api;
}

const L = loadLogic();
const { DIFFICULTIES, createBoard, placeMines, openCell, toggleFlag } = L;

// 결정적 rng — planner §8.4 참조 템플릿
function deterministicRng(seedSeq) {
  let i = 0;
  return () => seedSeq[i++ % seedSeq.length];
}

// 지뢰 레이아웃 문자열로 결정적 보드 구성('*'=지뢰, '.'=안전). adjacentMines 실제 계산.
function boardFromLayout(layout) {
  const rows = layout.length;
  const cols = layout[0].length;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ row: r, col: c, isMine: layout[r][c] === "*", adjacentMines: 0, state: "hidden" });
    }
  }
  for (const cell of cells) {
    if (cell.isMine) continue;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = cell.row + dr;
        const cc = cell.col + dc;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
        if (cells[rr * cols + cc].isMine) n++;
      }
    }
    cell.adjacentMines = n;
  }
  return {
    status: "playing",
    difficulty: "custom",
    cols,
    rows,
    mineCount: cells.filter((c) => c.isMine).length,
    minesPlaced: true,
    cells,
    revealedSafeCount: 0,
    flaggedCount: 0,
    explodedCellIndex: null,
  };
}

const at = (state, r, c) => state.cells[r * state.cols + c];

// ══════════════════════════════════════════════════════════════
// 1) vanilla-static file:// 안전 가드
// ══════════════════════════════════════════════════════════════
describe("vanilla-static file:// 안전 가드", () => {
  const sources = { "index.html": HTML, "styles.css": CSS, "logic.js": LOGIC_JS, "main.js": MAIN_JS };

  it("script type=\"module\" 미사용", () => {
    assert.ok(!/<script[^>]*type\s*=\s*["']module["']/i.test(HTML), "type=module 금지");
  });

  it("ES import/export 구문 미사용(전 파일)", () => {
    for (const [name, src] of Object.entries(sources)) {
      assert.ok(!/^\s*import\s.+from\s/m.test(src), `${name}: import 금지`);
      assert.ok(!/^\s*export\s/m.test(src), `${name}: export 금지`);
    }
  });

  it("fetch / XMLHttpRequest 미사용(JS)", () => {
    for (const name of ["logic.js", "main.js"]) {
      assert.ok(!/\bfetch\s*\(/.test(sources[name]), `${name}: fetch 금지`);
      assert.ok(!/XMLHttpRequest/.test(sources[name]), `${name}: XHR 금지`);
    }
  });

  it("외부 CDN(link/script src=https) 미사용", () => {
    assert.ok(!/<link[^>]+href\s*=\s*["']https?:\/\//i.test(HTML), "외부 link 금지");
    assert.ok(!/<script[^>]+src\s*=\s*["']https?:\/\//i.test(HTML), "외부 script 금지");
  });

  it("localStorage / sessionStorage 미사용(v1 in-memory)", () => {
    for (const name of ["logic.js", "main.js"]) {
      assert.ok(!/localStorage|sessionStorage/.test(sources[name]), `${name}: 영속 저장 금지`);
    }
  });

  it("index.html 이 logic.js·main.js 를 로컬 경로로 로드", () => {
    assert.ok(/<script[^>]+src\s*=\s*["']\.?\/?logic\.js["']/i.test(HTML), "logic.js 로드");
    assert.ok(/<script[^>]+src\s*=\s*["']\.?\/?main\.js["']/i.test(HTML), "main.js 로드");
  });
});

// ══════════════════════════════════════════════════════════════
// 2) 접근성·마크업 정적 가드 (planner §7 시각 대응)
// ══════════════════════════════════════════════════════════════
describe("마크업·접근성 정적 가드", () => {
  it("보드 role=grid, 난이도 radiogroup, mine-counter aria-live 존재", () => {
    assert.ok(/id\s*=\s*["']board["']/.test(HTML) && /role\s*=\s*["']grid["']/.test(HTML), "role=grid 보드");
    assert.ok(/role\s*=\s*["']radiogroup["']/.test(HTML), "난이도 radiogroup");
    assert.ok(/id\s*=\s*["']mine-counter["']/.test(HTML) && /aria-live/.test(HTML), "카운터 aria-live");
    assert.ok(/id\s*=\s*["']restart-btn["']/.test(HTML), "재시작 버튼");
    assert.ok(/id\s*=\s*["']result-banner["']/.test(HTML), "결과 배너");
  });

  it(":focus-visible 포커스 링 정의(outline:none 단독 금지)", () => {
    assert.ok(/:focus-visible/.test(CSS), "focus-visible 스타일");
    assert.ok(/outline\s*:\s*2px/.test(CSS), "포커스 outline 정의");
  });

  it("prefers-reduced-motion 대응 존재", () => {
    assert.ok(/prefers-reduced-motion/.test(CSS), "reduced-motion 미디어쿼리");
  });
});

// ══════════════════════════════════════════════════════════════
// 3) createBoard (TC-01)
// ══════════════════════════════════════════════════════════════
describe("createBoard (TC-01)", () => {
  it("TC-01: 초급 9×9/지뢰10, 전체 hidden, minesPlaced=false", () => {
    const board = createBoard("beginner");
    assert.equal(board.cols, 9);
    assert.equal(board.rows, 9);
    assert.equal(board.mineCount, 10);
    assert.equal(board.cells.length, 81);
    assert.equal(board.status, "ready");
    assert.equal(board.minesPlaced, false);
    assert.equal(board.flaggedCount, 0);
    assert.equal(board.revealedSafeCount, 0);
    assert.ok(board.cells.every((c) => c.state === "hidden"));
    assert.ok(board.cells.every((c) => c.isMine === false));
  });

  it("중급/고급 규격도 프리셋과 일치", () => {
    assert.equal(createBoard("intermediate").cells.length, 256);
    assert.equal(createBoard("intermediate").mineCount, 40);
    const expert = createBoard("expert");
    assert.equal(expert.cols, 30);
    assert.equal(expert.rows, 16);
    assert.equal(expert.mineCount, 99);
    assert.equal(expert.cells.length, 480);
  });

  it("DIFFICULTIES 프리셋 값 노출", () => {
    assert.equal(DIFFICULTIES.beginner.cols, 9);
    assert.equal(DIFFICULTIES.beginner.rows, 9);
    assert.equal(DIFFICULTIES.beginner.mineCount, 10);
    assert.equal(DIFFICULTIES.expert.mineCount, 99);
  });

  it("알 수 없는 난이도는 예외", () => {
    assert.throws(() => createBoard("nope"));
  });
});

// ══════════════════════════════════════════════════════════════
// 4) placeMines (TC-02, TC-03, TC-16, EC-01)
// ══════════════════════════════════════════════════════════════
describe("placeMines (TC-02, TC-03, TC-16, EC-01)", () => {
  it("TC-02: 안전구역(클릭 셀+8방향)에는 지뢰 미배치 + 정확히 mineCount개", () => {
    const board = createBoard("beginner");
    const placed = placeMines(board, 4, 4, deterministicRng([0.01, 0.5, 0.99, 0.2, 0.73]));
    const mineCells = placed.cells.filter((c) => c.isMine);
    assert.equal(mineCells.length, 10);
    for (const c of mineCells) {
      const dr = Math.abs(c.row - 4);
      const dc = Math.abs(c.col - 4);
      assert.ok(dr > 1 || dc > 1, `(${c.row},${c.col})는 안전구역인데 지뢰 배치됨`);
    }
    assert.equal(placed.minesPlaced, true);
  });

  it("TC-03: 모든 셀 adjacentMines가 실제 8방향 지뢰 수와 일치(코너/경계 포함)", () => {
    const board = createBoard("intermediate");
    const placed = placeMines(board, 8, 8, deterministicRng([0.13, 0.57, 0.91, 0.34, 0.78, 0.06]));
    for (const cell of placed.cells) {
      if (cell.isMine) continue;
      let expected = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = cell.row + dr;
          const cc = cell.col + dc;
          if (rr < 0 || rr >= placed.rows || cc < 0 || cc >= placed.cols) continue;
          if (placed.cells[rr * placed.cols + cc].isMine) expected++;
        }
      }
      assert.equal(cell.adjacentMines, expected, `(${cell.row},${cell.col}) 인접수 불일치`);
    }
  });

  it("EC-01: 코너 클릭 시 안전구역이 경계에 걸려도 정상 배치", () => {
    const board = createBoard("beginner");
    const placed = placeMines(board, 0, 0, deterministicRng([0.2, 0.8, 0.4]));
    assert.equal(placed.cells.filter((c) => c.isMine).length, 10);
    for (const [r, c] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      assert.equal(at(placed, r, c).isMine, false);
    }
  });

  it("원본 상태 불변(placeMines)", () => {
    const board = createBoard("beginner");
    placeMines(board, 4, 4, deterministicRng([0.5]));
    assert.equal(board.minesPlaced, false);
    assert.ok(board.cells.every((c) => c.isMine === false));
  });

  it("TC-16 / EC-02: 안전구역 확보 불가 시 클릭 셀 1칸만 제외 폴백", () => {
    const custom = {
      status: "ready", difficulty: "custom", cols: 3, rows: 3, mineCount: 8,
      minesPlaced: false, cells: [], revealedSafeCount: 0, flaggedCount: 0, explodedCellIndex: null,
    };
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        custom.cells.push({ row: r, col: c, isMine: false, adjacentMines: 0, state: "hidden" });

    assert.doesNotThrow(() => placeMines(custom, 1, 1, deterministicRng([0.3, 0.6, 0.9])));
    const placed = placeMines(custom, 1, 1, deterministicRng([0.3, 0.6, 0.9]));
    assert.equal(placed.cells.filter((c) => c.isMine).length, 8);
    assert.equal(at(placed, 1, 1).isMine, false);
  });
});

// ══════════════════════════════════════════════════════════════
// 5) openCell (TC-04~TC-10, EC-08)
// ══════════════════════════════════════════════════════════════
describe("openCell (TC-04~TC-10, EC-08)", () => {
  it("TC-04: 최초 open 시 지뢰 배치 + ready→playing + 클릭 셀 revealed", () => {
    let state = createBoard("beginner");
    state = openCell(state, 4, 4, deterministicRng([0.01, 0.5, 0.99, 0.2]));
    assert.equal(state.status, "playing");
    assert.equal(state.minesPlaced, true);
    assert.equal(at(state, 4, 4).state, "revealed");
  });

  it("TC-05: adjacentMines===0 flood fill + 경계 숫자칸 오픈, 지뢰벽 너머 hidden 유지", () => {
    // 가운데 열(col 2)에 지뢰벽 → 좌측 개활지만 연쇄, 우측은 미도달
    const layout = ["..*..", "..*..", "..*.."];
    let state = boardFromLayout(layout);
    state = openCell(state, 0, 0);
    assert.equal(at(state, 0, 0).state, "revealed"); // 시작 빈칸
    assert.equal(at(state, 0, 1).state, "revealed"); // 경계 숫자칸(좌측)
    assert.equal(at(state, 2, 0).state, "revealed"); // 좌측 개활지 연쇄
    assert.equal(at(state, 0, 2).state, "hidden");   // 지뢰칸 미오픈
    assert.equal(at(state, 0, 3).state, "hidden");   // 지뢰벽 너머 미도달
    assert.equal(at(state, 0, 4).state, "hidden");
    assert.notEqual(state.status, "won");            // 아직 승리 아님
  });

  it("TC-06 / AC-07: 지뢰 open → lost + explodedCellIndex + 전체 지뢰 revealed", () => {
    const layout = ["*..", "...", "..*"];
    let state = boardFromLayout(layout);
    state = openCell(state, 0, 0);
    assert.equal(state.status, "lost");
    assert.equal(state.explodedCellIndex, 0);
    assert.equal(at(state, 0, 0).state, "revealed");
    assert.equal(at(state, 2, 2).state, "revealed");
  });

  it("TC-07 / AC-09: flagged 셀 open 시도 no-op", () => {
    let state = boardFromLayout(["...", ".*.", "..."]);
    state = toggleFlag(state, 0, 0);
    const before = JSON.stringify(state);
    const after = openCell(state, 0, 0);
    assert.equal(JSON.stringify(after), before);
  });

  it("TC-08: 이미 revealed 셀 재오픈 no-op", () => {
    let state = boardFromLayout([".....*", ".....*", ".....*"]);
    state = openCell(state, 0, 0);
    const before = JSON.stringify(state);
    const after = openCell(state, 0, 0);
    assert.equal(JSON.stringify(after), before);
  });

  it("TC-09 / AC-11: lost 상태에서 open no-op", () => {
    let state = boardFromLayout(["*.", ".."]);
    state = openCell(state, 0, 0);
    assert.equal(state.status, "lost");
    const before = JSON.stringify(state);
    const after = openCell(state, 1, 1);
    assert.equal(JSON.stringify(after), before);
  });

  it("TC-10 / AC-06: 비지뢰 전부 open → won + 남은 hidden 지뢰 자동 flag", () => {
    const layout = ["*.", ".."];
    let state = boardFromLayout(layout);
    state = openCell(state, 0, 1);
    state = openCell(state, 1, 0);
    state = openCell(state, 1, 1);
    assert.equal(state.status, "won");
    assert.equal(at(state, 0, 0).state, "flagged");
    assert.equal(state.flaggedCount, 1);
  });

  it("EC-08: 코너/경계 인접 계산은 board 안쪽만 카운트", () => {
    const state = boardFromLayout(["*.", ".."]);
    assert.equal(at(state, 1, 1).adjacentMines, 1);
    assert.equal(at(state, 0, 1).adjacentMines, 1);
  });

  it("원본 상태 불변(openCell)", () => {
    const state = boardFromLayout([".....*", ".....*", ".....*"]);
    openCell(state, 0, 0);
    assert.ok(state.cells.every((c) => c.state !== "revealed"));
  });
});

// ══════════════════════════════════════════════════════════════
// 6) toggleFlag (TC-11~TC-15, EC-03, EC-05, EC-07)
// ══════════════════════════════════════════════════════════════
describe("toggleFlag (TC-11~TC-15, EC-03/05/07)", () => {
  it("TC-11: hidden → flagged + flaggedCount+1", () => {
    let state = boardFromLayout(["...", "..."]);
    state = toggleFlag(state, 0, 0);
    assert.equal(at(state, 0, 0).state, "flagged");
    assert.equal(state.flaggedCount, 1);
  });

  it("TC-12: flagged 재토글 → hidden + flaggedCount-1", () => {
    let state = boardFromLayout(["...", "..."]);
    state = toggleFlag(state, 0, 0);
    state = toggleFlag(state, 0, 0);
    assert.equal(at(state, 0, 0).state, "hidden");
    assert.equal(state.flaggedCount, 0);
  });

  it("TC-13 / EC-03: revealed 셀 flag no-op", () => {
    let state = boardFromLayout([".....*", ".....*", ".....*"]);
    state = openCell(state, 0, 0);
    const before = JSON.stringify(state);
    const after = toggleFlag(state, 0, 0);
    assert.equal(JSON.stringify(after), before);
  });

  it("TC-14 / AC-11: lost 상태에서 flag no-op", () => {
    let state = boardFromLayout(["*.", ".."]);
    state = openCell(state, 0, 0);
    const before = JSON.stringify(state);
    const after = toggleFlag(state, 1, 1);
    assert.equal(JSON.stringify(after), before);
  });

  it("TC-15 / EC-07: flood fill은 flagged 셀 건너뛰고 flag 보존", () => {
    const layout = [".....*", ".....*", ".....*", ".....*"];
    let state = boardFromLayout(layout);
    state = toggleFlag(state, 0, 3);
    state = openCell(state, 0, 0);
    assert.equal(at(state, 0, 3).state, "flagged");
    assert.equal(at(state, 0, 0).state, "revealed");
  });

  it("EC-05: 남은 지뢰 수 음수 허용(flaggedCount 제한 없음)", () => {
    let state = boardFromLayout(["....", "...."]);
    state = toggleFlag(state, 0, 0);
    state = toggleFlag(state, 0, 1);
    assert.equal(state.flaggedCount, 2);
    assert.equal(state.mineCount - state.flaggedCount, -2);
  });

  it("최초 open 이전에도 flag 허용", () => {
    let state = createBoard("beginner");
    state = toggleFlag(state, 0, 0);
    assert.equal(at(state, 0, 0).state, "flagged");
    assert.equal(state.status, "ready");
  });

  it("원본 상태 불변(toggleFlag)", () => {
    const state = boardFromLayout(["...", "..."]);
    toggleFlag(state, 0, 0);
    assert.equal(state.flaggedCount, 0);
    assert.equal(at(state, 0, 0).state, "hidden");
  });
});
