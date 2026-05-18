// BF-504 · Snake 게임 DOM/Canvas 컨트롤러
// - logic.js 의 순수 로직을 이용해 캔버스 렌더링 + 이벤트 처리
// - localStorage High Score 영속
//
// BF-518: index.html 인라인 IIFE 가 globalThis(window) 에 로직 변수 주입
// BF-522: type="module" + dynamic import 완전 제거 → file:// CORS 오류 수정.
//   <script src="./game.js"> (type 속성 없음) 로 로드.
//   CELL / LS_HIGH_SCORE_KEY / DIR / 로직 함수들은 index.html 인라인 IIFE 가
//   globalThis 에 설정 → 아래 구조 분해로 참조. file:// / http:// 모두 동일하게 동작.
//
// BF-530: CPU 지렁이 렌더링 + 경쟁 게임 KPI (s2 §5, §6) 추가

const {
  CELL,
  LS_HIGH_SCORE_KEY,
  DIR,
  MULTIPLIER_COLORS,
  createInitialState,
  changeDirection,
  tick,
  tickFull,
  cpuChooseDir,
  restartGame,
  // BF-545: 아이템 시스템
  ITEMS_ENABLED,
  ITEM_SPAWN_RATE,
  ITEM_CATEGORY,
  ITEM_DURATION_MS,
  ITEM_LIFESPAN_MS,
  createItemStats,
  pickItemType,
  spawnItemCell,
  useHeldItem,
  updateItemTimers,
  tickWithItems,
  // BF-579: 게임 설정
  SNAKE_SETTINGS_DEFAULTS,
  SNAKE_SETTINGS_LIMITS,
  loadSnakeSettings,
  saveSnakeSettings,
  validateAndMergeSettings,
} = globalThis;

// BF-560: HUD 유틸 (logic.js ES module 을 직접 import — file:// 호환 없이 globalThis 경유 불가)
// 대신 인라인으로 동일 로직 정의 (index.html 인라인 IIFE 방식과 동일 전략)
/** @param {Array} speedStack @param {string} target @returns {"SLOW"|"NORMAL"|"FAST"} */
function getSpeedLevel(speedStack, target = "player") {
  const entries = (speedStack || []).filter((e) => e.target === target);
  const hasUp   = entries.some((e) => e.type === "SPEED_UP");
  const hasDown = entries.some((e) => e.type === "SLOW_DOWN");
  if (hasUp)   return "FAST";
  if (hasDown) return "SLOW";
  return "NORMAL";
}

/** @param {"SLOW"|"NORMAL"|"FAST"} level @returns {string} */
function getSpeedDots(level) {
  switch (level) {
    case "SLOW": return "●○○";
    case "FAST": return "○○●";
    default:     return "○●○"; // NORMAL
  }
}

/**
 * 플레이 시간(ms) → 한국어 표시 문자열 (명세 §5-3).
 * @param {number} ms
 * @returns {string}
 */
function formatPlayTime(ms) {
  const totalSec  = Math.floor(ms / 1000);
  const totalMin  = Math.floor(totalSec / 60);
  const totalHour = Math.floor(totalMin  / 60);
  if (totalHour >= 1) {
    const remainMin = totalMin % 60;
    return `${totalHour}시간 ${remainMin}분`;
  }
  if (totalMin >= 1) {
    const remainSec = totalSec % 60;
    return `${totalMin}분 ${remainSec}초`;
  }
  return `${totalSec}초`;
}

// ─────────────────────────────────────────────────────────────
// DOM 참조
// ─────────────────────────────────────────────────────────────
const canvas    = document.getElementById("game-canvas");
const ctx       = canvas.getContext("2d");

// ─────────────────────────────────────────────────────────────
// BF-595: pixi.js 렌더 백엔드 feature flag
// ─────────────────────────────────────────────────────────────
/** localStorage 키 — 런타임 오버라이드 (L1 롤백용) */
const _LS_RENDER_BACKEND_KEY = "bf-snake-render-backend";

/**
 * 렌더 백엔드 선택.
 * 우선순위: localStorage 오버라이드 > PIXI 전역 존재 여부 > canvas2d 폴백.
 * @type {"pixi"|"canvas2d"}
 */
const RENDER_BACKEND = (() => {
  try {
    const override = localStorage.getItem(_LS_RENDER_BACKEND_KEY);
    if (override === "pixi" || override === "canvas2d") return override;
  } catch (_) { /* private mode */ }
  if (typeof PIXI === "undefined") {
    console.warn("[BF-595] pixi 로드 실패 — canvas2d 폴백");
    return "canvas2d";
  }
  return "pixi";
})();

// BF-595: pixi 색상 상수 (designer §2, §6 — hex→0x 변환)
const PX_BG          = 0x0d0d0d;
const PX_GRID        = { color: 0xffffff, alpha: 0.04 };
const PX_PLAYER_HEAD = 0x00cc44;
const PX_PLAYER_BODY = 0x3cd264;   // rgba(60,210,100,α) rgb 부분
const PX_CPU_HEAD    = 0xcc2200;
const PX_CPU_BODY    = 0xd23c3c;   // rgba(210,60,60,α) rgb 부분
const PX_EYE         = 0x0d0d0d;
const PX_EYE_BORDER  = 0xffffff;
const PX_SHIELD_GLOW = 0x4488ff;

// pixi 배수별 먹이 색상 (designer §2-4)
const PX_MULTIPLIER_COLORS = {
  1: { fill: 0xffcc00, glow: { color: 0xffc800, alpha: 0.3 } },
  2: { fill: 0x00cfff, glow: { color: 0x00c8ff, alpha: 0.4 } },
  4: { fill: 0xcc44ff, glow: { color: 0xb43cff, alpha: 0.5 } },
  8: { fill: 0xff4444, glow: { color: 0xff3232, alpha: 0.6 } },
};

// pixi 아이템 색상 (designer §2-5)
const PX_ITEM_COLORS = {
  SPEED_UP:     { primary: 0xffaa00, glow: { color: 0xffaa00, alpha: 0.40 } },
  SLOW_DOWN:    { primary: 0x00ddcc, glow: { color: 0x00ddcc, alpha: 0.40 } },
  LENGTH_BURST: { primary: 0xff6600, glow: { color: 0xff6600, alpha: 0.45 } },
  SHIELD:       { primary: 0x4488ff, glow: { color: 0x4488ff, alpha: 0.45 } },
  REVERSE:      { primary: 0x22ffaa, glow: { color: 0x22ffaa, alpha: 0.40 } },
};

// ─────────────────────────────────────────────────────────────
// BF-595: KPI 측정 (render.backend / render.fps / render.fallback)
// ─────────────────────────────────────────────────────────────
/** localStorage 키 — render KPI 세션 기록 */
const RENDER_KPI_KEY = "bf-snake-render-kpi";

/** FPS ring buffer (최근 N=300 프레임 ms 기록) */
const _fpsBuf    = new Float32Array(300);
let   _fpsBufIdx = 0;
let   _fpsBufLen = 0;
let   _fpsLastTs = 0;
/** render.longFrame 최대 기록 횟수 (게임당) */
const _LONG_FRAME_LIMIT = 10;
let   _longFrameCount = 0;

/**
 * KPI 이벤트를 localStorage ring buffer 에 기록 + console.log.
 * @param {string} event - "render.backend" | "render.fps" | "render.fallback" | "render.initMs" | "render.longFrame"
 * @param {Object} payload
 */
function _recordKpi(event, payload) {
  try {
    const raw  = localStorage.getItem(RENDER_KPI_KEY);
    const arr  = raw ? JSON.parse(raw) : [];
    arr.push({ event, ts: Date.now(), ...payload });
    if (arr.length > 20) arr.shift();
    localStorage.setItem(RENDER_KPI_KEY, JSON.stringify(arr));
  } catch (_) { /* private mode — 무시 */ }
  if (event === "render.fps") {
    console.log(
      `[BF-595 KPI] backend=${payload.backend} avgFps=${payload.avgFps} p95FrameMs=${payload.p95FrameMs} sampleCount=${payload.sampleCount}`,
    );
  }
}

/** FPS ring buffer 에 프레임 ms 추가 + longFrame 감지 */
function _trackFrame(frameMs) {
  _fpsBuf[_fpsBufIdx] = frameMs;
  _fpsBufIdx = (_fpsBufIdx + 1) % _fpsBuf.length;
  _fpsBufLen = Math.min(_fpsBufLen + 1, _fpsBuf.length);
  if (frameMs > 50 && _longFrameCount < _LONG_FRAME_LIMIT) {
    _longFrameCount++;
    _recordKpi("render.longFrame", {
      backend:    RENDER_BACKEND,
      frameMs:    Math.round(frameMs),
      snakeLen:   state ? (state.snake || []).length : 0,
      cpuCount:   state ? (state.extraCpus || []).length + (state.cpu && state.cpu.length > 0 ? 1 : 0) : 0,
    });
  }
}

/** FPS ring buffer 에서 KPI 집계 후 기록 */
function _flushFpsKpi() {
  if (_fpsBufLen === 0) return;
  const samples = Array.from(_fpsBuf.subarray(0, _fpsBufLen));
  const avgMs   = samples.reduce((s, v) => s + v, 0) / samples.length;
  const avgFps  = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
  const minFps  = Math.round(1000 / Math.max(...samples));
  const sorted  = [...samples].sort((a, b) => a - b);
  const p95Ms   = sorted[Math.floor(sorted.length * 0.95)] || avgMs;
  _recordKpi("render.fps", {
    backend:      RENDER_BACKEND,
    avgFps,
    minFps,
    p95FrameMs:   Math.round(p95Ms),
    sampleCount:  _fpsBufLen,
  });
}

/** KPI 카운터 리셋 (새 게임마다) */
function _resetFpsKpi() {
  _fpsBufIdx   = 0;
  _fpsBufLen   = 0;
  _longFrameCount = 0;
  _fpsLastTs   = 0;
}

// ─────────────────────────────────────────────────────────────
// BF-595: SnakeRenderer — pixi.js 렌더 어댑터
// 인터페이스: init(canvasEl, w, h) / resize(w, h) / renderFrame(state) / destroy()
// ─────────────────────────────────────────────────────────────
const SnakeRenderer = (() => {
  /** @type {PIXI.Application|null} */
  let app = null;
  let _bgGfx         = null;
  let _foodGfx       = null;
  let _foodText      = null;
  let _itemGfx       = null;
  let _itemContainer = null;
  let _cpuGfx        = null;
  let _extraGfx      = null;
  let _playerGfx     = null;

  /** 배경 + 격자 Graphics 재생성 (init 시 1회 + resize 시) */
  function _buildBg(w, h) {
    _bgGfx.clear();
    // 배경 rect
    _bgGfx.beginFill(PX_BG);
    _bgGfx.drawRect(0, 0, w, h);
    _bgGfx.endFill();
    // 격자 라인 (정적 — 매 프레임 재생성 금지)
    const cols = Math.floor(w / CELL);
    const rows = Math.floor(h / CELL);
    _bgGfx.lineStyle(1, PX_GRID.color, PX_GRID.alpha);
    for (let x = 0; x <= cols; x++) {
      _bgGfx.moveTo(x * CELL, 0);
      _bgGfx.lineTo(x * CELL, rows * CELL);
    }
    for (let y = 0; y <= rows; y++) {
      _bgGfx.moveTo(0, y * CELL);
      _bgGfx.lineTo(cols * CELL, y * CELL);
    }
  }

  /**
   * pixi Application 초기화.
   * @param {HTMLCanvasElement} canvasEl
   * @param {number} w
   * @param {number} h
   * @returns {boolean} 성공 여부
   */
  function init(canvasEl, w, h) {
    if (typeof PIXI === "undefined") {
      _recordKpi("render.fallback", { reason: "no_pixi", errorMsg: "PIXI undefined" });
      return false;
    }
    const t0 = performance.now();
    try {
      app = new PIXI.Application({
        width:           w,
        height:          h,
        view:            canvasEl,
        autoStart:       false,   // RAF 단일 구동 — 이중 루프 방지 (BF-595 §6-3)
        backgroundColor: PX_BG,
        antialias:       true,
        resolution:      1,
      });
      app.ticker.stop(); // 안전 이중 가드

      // Scene graph z-order: bg → food → item → extraCpu → cpu → player (designer §4-3)
      const bgCont    = new PIXI.Container();
      const foodCont  = new PIXI.Container();
      _itemContainer  = new PIXI.Container();
      const extraCont = new PIXI.Container();
      const cpuCont   = new PIXI.Container();
      const playerCont = new PIXI.Container();
      app.stage.addChild(bgCont, foodCont, _itemContainer, extraCont, cpuCont, playerCont);

      _bgGfx     = new PIXI.Graphics(); bgCont.addChild(_bgGfx);
      _foodGfx   = new PIXI.Graphics(); foodCont.addChild(_foodGfx);
      _itemGfx   = new PIXI.Graphics(); _itemContainer.addChild(_itemGfx);
      _cpuGfx    = new PIXI.Graphics(); cpuCont.addChild(_cpuGfx);
      _extraGfx  = new PIXI.Graphics(); extraCont.addChild(_extraGfx);
      _playerGfx = new PIXI.Graphics(); playerCont.addChild(_playerGfx);

      // 먹이 배수 텍스트 (pixi Text)
      _foodText = new PIXI.Text("", {
        fontFamily: "'Courier New', monospace",
        fontSize:   11,
        fontWeight: "bold",
        fill:       0xffffff,
        align:      "center",
      });
      _foodText.anchor.set(0.5, 0.5);
      foodCont.addChild(_foodText);

      // 초기 배경 생성
      _buildBg(w, h);

      const initMs = performance.now() - t0;
      _recordKpi("render.initMs",  { backend: "pixi", initMs: Math.round(initMs) });
      _recordKpi("render.backend", { backend: "pixi", pixiVersion: PIXI.VERSION });
    } catch (err) {
      console.warn("[BF-595] pixi 초기화 실패 — canvas2d 폴백", err);
      _recordKpi("render.fallback", { reason: "init_error", errorMsg: String(err) });
      app = null;
      return false;
    }
    return true;
  }

  /**
   * window resize 시 호출.
   * 격자 Graphics 재생성 (배경 재생성 = resize 시만, 매 프레임 금지).
   */
  function resize(w, h) {
    if (!app) return;
    app.renderer.resize(w, h);
    _buildBg(w, h);
  }

  /**
   * 지렁이 세그먼트 Graphics 그리기 (player / cpu 공용).
   * @param {PIXI.Graphics} gfx
   * @param {Array<{x:number,y:number}>} segs - snake segments
   * @param {{x:number,y:number}} dir
   * @param {number} headColor - pixi 0x color
   * @param {number} bodyColor - pixi 0x color
   * @param {boolean} shieldActive
   * @param {boolean} burstActive
   */
  function _drawSegs(gfx, segs, dir, headColor, bodyColor, shieldActive, burstActive) {
    gfx.clear();
    if (!segs || segs.length === 0) return;
    const len    = segs.length;
    const blinkOn = burstActive && (Math.floor(performance.now() / 500) % 2 === 0);

    segs.forEach((seg, i) => {
      const px = seg.x * CELL + 1;
      const py = seg.y * CELL + 1;
      const alpha = i === 0 ? 1 : Math.max(0.45, 0.85 - (i / len) * 0.4);

      // 몸통 fill
      if (burstActive && blinkOn) {
        gfx.beginFill(0xffffff, 0.9);
      } else if (i === 0) {
        gfx.beginFill(headColor);
      } else {
        gfx.beginFill(bodyColor, alpha);
      }
      gfx.drawRoundedRect(px, py, CELL - 2, CELL - 2, 4);
      gfx.endFill();

      if (i === 0) {
        // SHIELD 글로우 pulse (§6-4)
        if (shieldActive) {
          const glowAlpha = 0.4 + 0.3 * Math.abs(Math.sin(performance.now() / 750));
          gfx.lineStyle(3, PX_SHIELD_GLOW, glowAlpha);
          gfx.drawRoundedRect(seg.x * CELL, seg.y * CELL, CELL, CELL, 4);
          gfx.lineStyle(0);
        }
        // 머리 테두리 (1px, rgba 0.5)
        gfx.lineStyle(2, PX_EYE_BORDER, 0.5);
        gfx.drawRoundedRect(px, py, CELL - 2, CELL - 2, 4);
        gfx.lineStyle(0);

        // 눈 (방향별 위치 — designer §5-2)
        const eyeSize = 3;
        gfx.beginFill(PX_EYE);
        let e1x, e1y, e2x, e2y;
        if (dir.x === 1) {
          e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
          e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
        } else if (dir.x === -1) {
          e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
          e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
        } else if (dir.y === -1) {
          e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
          e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
        } else {
          e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + CELL - 6;
          e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + CELL - 6;
        }
        gfx.drawRect(e1x, e1y, eyeSize, eyeSize);
        gfx.drawRect(e2x, e2y, eyeSize, eyeSize);
        gfx.endFill();
      }
    });
  }

  /** pixi 아이템 아이콘 Graphics 그리기 (기존 drawItemIcon 도형 좌표 동일) */
  function _drawItemIconPixi(gfx, type, cx, cy) {
    gfx.beginFill(0xffffff);
    switch (type) {
      case "SPEED_UP":
        gfx.moveTo(cx + 2, cy - 5);
        gfx.lineTo(cx - 1, cy);
        gfx.lineTo(cx + 1, cy);
        gfx.lineTo(cx - 2, cy + 5);
        gfx.lineTo(cx + 1, cy + 1);
        gfx.lineTo(cx + 0, cy + 1);
        gfx.closePath();
        break;
      case "SLOW_DOWN":
        gfx.moveTo(cx - 4, cy - 5); gfx.lineTo(cx + 4, cy - 5);
        gfx.lineTo(cx, cy); gfx.closePath();
        gfx.moveTo(cx - 4, cy + 5); gfx.lineTo(cx + 4, cy + 5);
        gfx.lineTo(cx, cy); gfx.closePath();
        gfx.drawRect(cx - 4, cy - 1, 8, 2);
        break;
      case "LENGTH_BURST": {
        const arms = 8;
        for (let ai = 0; ai < arms; ai++) {
          const outerR = 5, innerR = 2;
          const outerA = (ai / arms) * Math.PI * 2 - Math.PI / 2;
          const innerA = outerA + Math.PI / arms;
          if (ai === 0) gfx.moveTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
          else          gfx.lineTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
          gfx.lineTo(cx + Math.cos(innerA) * innerR, cy + Math.sin(innerA) * innerR);
        }
        gfx.closePath();
        break;
      }
      case "SHIELD":
        gfx.moveTo(cx, cy - 6);
        gfx.lineTo(cx + 4, cy - 3); gfx.lineTo(cx + 4, cy + 2);
        gfx.lineTo(cx, cy + 5);
        gfx.lineTo(cx - 4, cy + 2); gfx.lineTo(cx - 4, cy - 3);
        gfx.closePath();
        break;
      case "REVERSE":
        // 반원 호 근사 (lineTo 폴리곤)
        for (let ai = 0; ai <= 10; ai++) {
          const a = Math.PI - (ai / 10) * Math.PI;
          const px2 = cx + Math.cos(a) * 4;
          const py2 = cy + Math.sin(a) * 4;
          if (ai === 0) gfx.moveTo(px2, py2);
          else gfx.lineTo(px2, py2);
        }
        gfx.lineTo(cx - 6, cy - 3);
        gfx.lineTo(cx - 6, cy + 1);
        gfx.closePath();
        break;
      default:
        gfx.drawCircle(cx, cy, 3);
    }
    gfx.endFill();
  }

  /**
   * 매 프레임 state 스냅샷으로 scene graph 갱신 + 렌더.
   * @param {Object} st - game state
   */
  function renderFrame(st) {
    if (!app) return;

    // ── 플레이어 지렁이 ──────────────────────────────────────────
    _drawSegs(
      _playerGfx,
      st.snake || [],
      st.dir || { x: 1, y: 0 },
      PX_PLAYER_HEAD,
      PX_PLAYER_BODY,
      st.shieldActive ?? false,
      st.lengthBurstActive ?? false,
    );

    // ── CPU 지렁이 ───────────────────────────────────────────────
    if (!st.cpu || st.cpu.length === 0) {
      _cpuGfx.clear();
    } else {
      _drawSegs(
        _cpuGfx,
        st.cpu,
        st.cpuDir || { x: -1, y: 0 },
        PX_CPU_HEAD,
        PX_CPU_BODY,
        false,
        st.cpuLengthBurstActive ?? false,
      );
    }

    // ── 추가 CPU 지렁이 (extraCpus) ──────────────────────────────
    _extraGfx.clear();
    if (st.extraCpus && st.extraCpus.length > 0) {
      st.extraCpus.forEach((extra) => {
        const body = extra.body || [];
        const dir  = extra.dir || { x: -1, y: 0 };
        const len  = body.length;
        body.forEach((seg, i) => {
          const alpha = i === 0 ? 1 : Math.max(0.40, 0.80 - (i / len) * 0.4);
          if (i === 0) _extraGfx.beginFill(0xff9933);
          else         _extraGfx.beginFill(0xdc8c3c, alpha);
          _extraGfx.drawRoundedRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
          _extraGfx.endFill();
          if (i === 0) {
            _extraGfx.lineStyle(2, PX_EYE_BORDER, 0.5);
            _extraGfx.drawRoundedRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
            _extraGfx.lineStyle(0);
            const eyeSize = 3;
            _extraGfx.beginFill(PX_EYE);
            let e1x, e1y, e2x, e2y;
            if (dir.x === 1) {
              e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
              e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
            } else if (dir.x === -1) {
              e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
              e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
            } else if (dir.y === -1) {
              e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
              e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
            } else {
              e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + CELL - 6;
              e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + CELL - 6;
            }
            _extraGfx.drawRect(e1x, e1y, eyeSize, eyeSize);
            _extraGfx.drawRect(e2x, e2y, eyeSize, eyeSize);
            _extraGfx.endFill();
          }
        });
      });
    }

    // ── 먹이 ────────────────────────────────────────────────────
    _foodGfx.clear();
    if (!st.food) {
      _foodText.visible = false;
    } else {
      const { x, y, multiplier = 1 } = st.food;
      const cx = x * CELL + CELL / 2;
      const cy = y * CELL + CELL / 2;
      const r  = CELL / 2 - 3;
      const cd = PX_MULTIPLIER_COLORS[multiplier] || PX_MULTIPLIER_COLORS[1];

      // 먹이 원 (색상 fill + 중앙 흰색 하이라이트)
      _foodGfx.beginFill(cd.fill);
      _foodGfx.drawCircle(cx, cy, r);
      _foodGfx.endFill();
      _foodGfx.beginFill(0xffffff, 0.7);
      _foodGfx.drawCircle(cx, cy, r * 0.4);
      _foodGfx.endFill();
      // 글로우 링
      _foodGfx.lineStyle(2, cd.glow.color, cd.glow.alpha);
      _foodGfx.drawCircle(cx, cy, r + 2);
      _foodGfx.lineStyle(0);

      // 배수 텍스트
      const fontSize = Math.round(CELL * 0.55);
      _foodText.text  = `${multiplier}×`;
      _foodText.style.fontSize = fontSize;
      _foodText.position.set(cx, cy);
      _foodText.visible = true;
    }

    // ── 아이템 ──────────────────────────────────────────────────
    _itemGfx.clear();
    if (!st.item) {
      _itemContainer.visible = false;
    } else {
      _itemContainer.visible = true;
      const item = st.item;
      const cx   = item.x * CELL + CELL / 2;
      const cy   = item.y * CELL + CELL / 2;
      const cd   = PX_ITEM_COLORS[item.type] || PX_ITEM_COLORS.SPEED_UP;

      // 만료 임박 깜박임 (3초 미만)
      const msLeft = item.expiresAt - Date.now();
      const blink  = msLeft < 3000 && Math.floor(Date.now() / 500) % 2 === 1;
      _itemContainer.alpha = blink ? 0.3 : 1.0;

      // 배경 원
      _itemGfx.beginFill(cd.primary, 0.75);
      _itemGfx.drawCircle(cx, cy, 8);
      _itemGfx.endFill();
      // 글로우 링
      _itemGfx.lineStyle(2, cd.glow.color, cd.glow.alpha);
      _itemGfx.drawCircle(cx, cy, 9);
      _itemGfx.lineStyle(0);
      // 아이콘 (기존 drawItemIcon 도형 좌표 동일)
      _drawItemIconPixi(_itemGfx, item.type, cx, cy);
    }

    // pixi 씬 렌더 (RAF loop 에서 1회 호출 — ticker 미사용)
    app.renderer.render(app.stage);
  }

  /** pixi 자원 해제 (롤백/언마운트 시) */
  function destroy() {
    if (!app) return;
    try { app.destroy(false); } catch (_) {}
    app = null;
    _bgGfx = null; _foodGfx = null; _foodText = null;
    _itemGfx = null; _itemContainer = null;
    _cpuGfx = null; _extraGfx = null; _playerGfx = null;
  }

  return { init, resize, renderFrame, destroy };
})();

// HUD — BF-530 s2 §5-3 (PLAYER / CPU 이중 점수판)
const hudPlayerScoreEl = document.getElementById("hud-player-score");
const hudCPUScoreEl    = document.getElementById("hud-cpu-score");
const hudHighEl        = document.getElementById("hud-high-value");
// BF-504/514/518 하위 호환 별칭 (hidden, hud-player-score 와 동기화)
const hudScoreValueEl  = document.getElementById("hud-score-value");

// 게임 결과 오버레이 — BF-530 s2 §5-4
const goOverlay    = document.getElementById("gameover-overlay");
const goResultEl   = document.getElementById("go-result");
const goScoreEl    = document.getElementById("go-score");
const goCPUScoreEl = document.getElementById("go-cpu-score");
// BF-560: 게임 오버 통계 요소
const goNewRecordEl      = document.getElementById("go-new-record");
const goPrevHighScoreEl  = document.getElementById("go-prev-high-score");
const goPlayTimeEl       = document.getElementById("go-play-time");
const goItemStatsEl      = document.getElementById("go-item-stats");

// PAUSED 오버레이 — BF-524
const pausedOverlay = document.getElementById("paused-overlay");
// BF-560: 일시정지 버튼
const pausedBtnResumeEl  = document.getElementById("paused-btn-resume");
const pausedBtnRestartEl = document.getElementById("paused-btn-restart");
const pausedBtnQuitEl    = document.getElementById("paused-btn-quit");

// BF-560: HUD 상태 패널
const hudStatusPanelEl = document.getElementById("hud-status-panel");
const hudSnakeLengthEl = document.getElementById("hud-snake-length");
const hudSpeedLevelEl  = document.getElementById("hud-speed-level");

// 효과음 토글 — BF-567
const soundToggleEl = document.getElementById("sound-toggle");

// 아이템 HUD — BF-545
const buffBarEl     = document.getElementById("buff-bar");
const itemSlotHudEl = document.getElementById("item-slot-hud");
const slotBoxEl     = itemSlotHudEl ? itemSlotHudEl.querySelector(".slot-box")      : null;
const slotIconEl    = itemSlotHudEl ? itemSlotHudEl.querySelector(".slot-icon")     : null;
const slotKeyHintEl = itemSlotHudEl ? itemSlotHudEl.querySelector(".slot-key-hint") : null;
const slotExpireEl  = itemSlotHudEl ? itemSlotHudEl.querySelector(".slot-expire")   : null;
const toastContainerEl = document.getElementById("toast-container");

// 설정 모달 — BF-579
const settingsTriggerEl   = document.getElementById("settings-trigger");
const settingsModalEl     = document.getElementById("settings-modal");
const settingsValidationEl = document.getElementById("settings-validation-msg");
const settingsCloseEl     = settingsModalEl ? settingsModalEl.querySelector(".settings-close")      : null;
const settingsBtnSaveEl   = settingsModalEl ? settingsModalEl.querySelector(".settings-btn-save")   : null;
const settingsBtnCancelEl = settingsModalEl ? settingsModalEl.querySelector(".settings-btn-cancel") : null;
const settingsBtnResetEl  = settingsModalEl ? settingsModalEl.querySelector(".settings-btn-reset")  : null;
const settingsOverlayEl   = settingsModalEl ? settingsModalEl.querySelector(".settings-modal-overlay") : null;
const pausedBtnSettingsEl = document.getElementById("paused-btn-settings");
const hudTimeRemainingEl  = document.getElementById("hud-time-remaining");
const hudTimeValueEl      = document.getElementById("hud-time-value");

// ─────────────────────────────────────────────────────────────
// 게임 상태
// ─────────────────────────────────────────────────────────────
let state;
let rafId  = null;
let lastTs = 0;

/** 틱 간격 (ms) — 이 값마다 게임 로직 1 스텝 */
const TICK_MS = 120;

/** 제한 시간 (ms) — s2 §1 T5 (BF-579: settings.timeLimitSec 가 우선; 미설정 시 2분 fallback) */
const GAME_DURATION_MS = 120000;

/**
 * 현재 적용 중인 설정 (BF-579 §4-2 — game.start 시 캡처되는 effectiveSettings).
 * 페이지 로드 시 localStorage 에서 load.
 */
let currentSettings = (typeof loadSnakeSettings === "function")
  ? loadSnakeSettings()
  : Object.assign({}, SNAKE_SETTINGS_DEFAULTS || {
      schemaVersion: 1, difficulty: "normal", cpuCount: 1,
      itemsEnabled: false, itemSpawnRate: 0.5, multiplierEnabled: true,
      timeLimitSec: null, initialLength: 3,
    });

/**
 * 다음 게임에 적용될 pending 설정 (BF-579 §4-2 — modal save 시점에 갱신).
 * null 이면 currentSettings 유지.
 */
let pendingSettings = null;

/** 모달 진입 직전 설정 스냅샷 (취소 시 롤백용). */
let draftSettings = null;

/** 시간 만료 임박(타임아웃) 처리는 settings.timeLimitSec 기반 ms 로 계산 */
function getGameDurationMs() {
  if (currentSettings && currentSettings.timeLimitSec != null) {
    return currentSettings.timeLimitSec * 1000;
  }
  return GAME_DURATION_MS;
}

// ─────────────────────────────────────────────────────────────
// KPI 측정 변수 — BF-526 (pause) + BF-530 (competition)
// ─────────────────────────────────────────────────────────────
/** 이번 게임 세션의 멈춤/재개 토글 횟수 */
let pauseToggleCount = 0;
/** 현재 멈춤 구간 시작 타임스탬프 (ms, performance.now()) */
let pauseStartTs = 0;
/** 이번 게임 세션의 누적 멈춤 시간 (ms) */
let totalPausedMs = 0;
/** 이번 게임 시작 타임스탬프 (멈춤 구간 제외 생존시간 측정용) */
let gameStartTs = 0;

/** sessionStorage 키 (BF-526) */
const SS_PAUSE_KPI_KEY = "bf-snake-pause-kpi";

/** localStorage 키 — BF-530 KPI (s2 §6-2) */
const COMP_KPI_KEY   = "bf-snake-comp-kpi";
const COMP_STATS_KEY = "bf-snake-comp-stats";

/** localStorage 키 — BF-533 배수 통계 KPI (명세 §9-1) */
const MULT_KPI_KEY   = "bf-snake-multiplier-kpi";
const MULT_STATS_KEY = "bf-snake-multiplier-stats";

/** localStorage 키 — BF-537 이팩트 트리거 KPI */
const EFFECT_KPI_KEY = "bf-snake-effect-kpi";

/** localStorage 키 — BF-545 아이템 시스템 KPI (명세 §10-1, §10-2) */
const ITEM_STATS_KEY = "bf-snake-item-stats";
const ITEM_KPI_KEY   = "bf-snake-item-kpi";

/** Z 키 힌트 localStorage 플래그 (명세 §6-7) */
const Z_HINT_KEY = "bf-snake-z-hint-shown";

// ── 아이템 스폰 타이머 변수 ────────────────────────────────────
/** 아이템 최초 스폰 지연 — 게임 시작 후 20초 (명세 §6-1) */
const ITEM_FIRST_SPAWN_DELAY_MS  = 20000;
/** 이후 스폰 간격 — 30±5초 (명세 §6-1) */
const ITEM_SPAWN_INTERVAL_MIN_MS = 25000;
const ITEM_SPAWN_INTERVAL_MAX_MS = 35000;

/** 다음 아이템 스폰 예정 타임스탬프 (performance.now 기준). -1 = 비활성 */
let nextItemSpawnTs = -1;

// ── 속도 효과 Tick Accumulator ─────────────────────────────────
/** 플레이어 전용 tick accumulator (ms). 속도 효과에 따라 독립 tick 처리 */
let playerTickAccum = 0;
/** CPU 전용 tick accumulator (ms) */
let cpuTickAccum    = 0;

// ─────────────────────────────────────────────────────────────
// localStorage 헬퍼
// ─────────────────────────────────────────────────────────────
function loadHighScore() {
  try {
    const v = localStorage.getItem(LS_HIGH_SCORE_KEY);
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (_) {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(LS_HIGH_SCORE_KEY, String(score));
  } catch (_) {
    // private mode 등 — 무시
  }
}

// ─────────────────────────────────────────────────────────────
// 효과음 시스템 — BF-567 (Web Audio API + localStorage 연동)
// 명세: docs/spec/snake-sound-toggle-BF-563.md §3, §5, §6
// ─────────────────────────────────────────────────────────────

/** localStorage 키 — BF-567 효과음 토글 */
const LS_SOUND_KEY = "bf-snake-sound-enabled";

/**
 * localStorage 에서 효과음 설정 로드.
 * 키 없으면 기본값 true(ON). 엄격 "true" 비교 (EC-07 처리).
 * @returns {boolean}
 */
function loadSoundEnabled() {
  try {
    const raw = localStorage.getItem(LS_SOUND_KEY);
    if (raw === null) return true;   // EC-01 기본값 ON
    return raw === "true";           // EC-07 엄격 문자열 비교
  } catch (_) {
    return true;                     // EC-01: private mode 등 — 기본값 ON
  }
}

/**
 * 효과음 설정을 localStorage 에 영속화.
 * @param {boolean} enabled
 */
function saveSoundEnabled(enabled) {
  try {
    localStorage.setItem(LS_SOUND_KEY, String(enabled));
  } catch (_) {
    // EC-01: private mode 등 — 무시
  }
}

/** 효과음 ON/OFF 상태 — 페이지 로드 시 localStorage 에서 복원 */
let soundEnabled = loadSoundEnabled();

/** Web Audio API 싱글톤 (최초 사용자 인터랙션 후 생성) */
let _audioCtx = null;

/**
 * AudioContext 싱글톤 반환.
 * 최초 호출 시 생성. 생성 실패 시 null 반환 (EC-02).
 * @returns {AudioContext|null}
 */
function getAudioContext() {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _audioCtx;
  } catch (_) {
    return null; // EC-02: AudioContext 생성 실패
  }
}

/** EC-04: 진행 중인 gameover 오실레이터 참조 (재시작 시 중단) */
let _gameoverOsc = null;

/**
 * 음식 먹기 효과음.
 * BF-600: playSound("ding") 경유 — snake.settings.soundEnabled 검사.
 * BF-567 soundEnabled (#sound-toggle) 도 1차 가드로 유지.
 */
function playEatSound() {
  if (!soundEnabled) return; // BF-567 §5-5: soundEnabled 가드
  // BF-600: 단일 playSound() 경유 — snake.settings.soundEnabled 2차 검사
  playSound("ding");
}

/**
 * 게임 오버 효과음.
 * BF-600: playSound("fail") 경유 — snake.settings.soundEnabled 검사.
 * BF-567 soundEnabled (#sound-toggle) 도 1차 가드로 유지.
 */
function playGameOverSound() {
  if (!soundEnabled) return; // BF-567 §5-6: soundEnabled 가드
  // BF-600: 단일 playSound() 경유 — snake.settings.soundEnabled 2차 검사
  playSound("fail");
}

// ─────────────────────────────────────────────────────────────
// BF-600: 설정 모달 사운드 토글 — snake.settings.soundEnabled
// ─────────────────────────────────────────────────────────────

/** localStorage 키 — BF-600 설정 모달 사운드 토글 */
const LS_SETTINGS_SOUND_KEY = "snake.settings.soundEnabled";

/**
 * 설정 모달 사운드 ON/OFF 로드.
 * 키 없으면 기본값 true(ON). 엄격 "true" 비교.
 * @returns {boolean}
 */
function loadSettingsSoundEnabled() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_SOUND_KEY);
    if (raw === null) return true;   // 기본값 ON
    return raw === "true";           // 엄격 문자열 비교
  } catch (_) {
    return true;                     // private mode 등 — 기본값 ON
  }
}

/**
 * 설정 모달 사운드 ON/OFF 를 localStorage 에 영속화.
 * @param {boolean} enabled
 */
function saveSettingsSoundEnabled(enabled) {
  try {
    localStorage.setItem(LS_SETTINGS_SOUND_KEY, String(enabled));
  } catch (_) {
    // private mode 등 — 무시
  }
}

/**
 * BF-600: 단일 효과음 재생 함수.
 * snake.settings.soundEnabled (설정 모달 토글) 를 검사한다.
 * 첫 사용자 인터랙션 후 AudioContext.resume() 로 자동재생 정책에 대응.
 * @param {"ding"|"fail"} type
 */
function playSound(type) {
  if (!loadSettingsSoundEnabled()) return; // AC-3: 설정 모달 off 시 무음
  const ctx = getAudioContext();
  if (!ctx) return;
  /** @param {AudioContext} c */
  const doPlay = function (c) {
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    if (type === "ding") {
      // AC-1: 880Hz sine 100ms
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, c.currentTime);
      gain.gain.setValueAtTime(0.3, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.1);
    } else if (type === "fail") {
      // AC-2: 220Hz square 300ms
      osc.type = "square";
      osc.frequency.setValueAtTime(220, c.currentTime);
      gain.gain.setValueAtTime(0.3, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.3);
    }
  };
  // 자동재생 정책 대응: suspended 상태이면 resume 후 재생
  if (ctx.state === "suspended") {
    ctx.resume().then(() => doPlay(ctx)).catch(() => {});
  } else {
    doPlay(ctx);
  }
}

/**
 * 토글 버튼 UI 갱신 — aria-pressed·aria-label·textContent 동기화.
 * 명세 §6-5: CSS 는 aria-pressed selector 로 자동 반영.
 * @param {boolean} enabled
 */
function updateSoundToggleUI(enabled) {
  if (!soundToggleEl) return;
  soundToggleEl.textContent = enabled ? "🔊" : "🔇";
  soundToggleEl.setAttribute("aria-pressed", String(enabled));
  soundToggleEl.setAttribute(
    "aria-label",
    enabled ? "효과음 켜짐 — 클릭하여 끄기" : "효과음 꺼짐 — 클릭하여 켜기"
  );
}

// 토글 버튼 클릭 핸들러
if (soundToggleEl) {
  soundToggleEl.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    saveSoundEnabled(soundEnabled);
    updateSoundToggleUI(soundEnabled);
    // AudioContext 미리 생성 (첫 클릭이 사용자 인터랙션 — EC-03 방지)
    getAudioContext();
  });
}

/** KPI 누적 통계 로드 (s2 §6-2-2) */
function loadCompStats() {
  try {
    const v = localStorage.getItem(COMP_STATS_KEY);
    if (v) return JSON.parse(v);
  } catch (_) { /* ignore */ }
  return { totalGames: 0, wins: 0, losses: 0, draws: 0, totalDeaths: 0, cpuCollisionDeaths: 0 };
}

/** KPI 기록 — 게임 종료 시 호출 (s2 §6-2) */
function logKPI() {
  const survivalMs = Math.round(performance.now() - gameStartTs - totalPausedMs);
  const result     = state.result; // "player_win" | "cpu_win" | "draw" | null
  const deathCause = state.deathCause;

  // ── 직전 게임 KPI (bf-snake-comp-kpi) ──────────────────
  const kpiEntry = {
    survivalMs,
    result:      result === "player_win" ? "win" : result === "cpu_win" ? "lose" : "draw",
    playerScore: state.score,
    cpuScore:    state.cpuScore,
    deathCause:  deathCause,
    cpuCollision: deathCause === "cpu_body" || deathCause === "head_on",
    timestamp:   Date.now(),
  };
  try { localStorage.setItem(COMP_KPI_KEY, JSON.stringify(kpiEntry)); } catch (_) { /* EC-5 */ }

  // ── 누적 통계 (bf-snake-comp-stats) ────────────────────
  const stats = loadCompStats();
  stats.totalGames++;
  if (result === "player_win")      stats.wins++;
  else if (result === "cpu_win")    stats.losses++;
  else                              stats.draws++;

  if (result !== "player_win" && deathCause && deathCause !== "timeout") {
    stats.totalDeaths++;
    if (kpiEntry.cpuCollision) stats.cpuCollisionDeaths++;
  }
  try { localStorage.setItem(COMP_STATS_KEY, JSON.stringify(stats)); } catch (_) { /* EC-5 */ }

  // ── console 출력 (s2 §6-2-3) ────────────────────────────
  const winRate =
    stats.totalGames > 0
      ? ((stats.wins / stats.totalGames) * 100).toFixed(1)
      : "0.0";
  console.log(
    `[BF-529 KPI] 결과: ${kpiEntry.result} | 생존시간: ${survivalMs}ms | P:${state.score} vs CPU:${state.cpuScore} | 사망원인: ${deathCause} | 승률: ${winRate}%(${stats.wins}/${stats.totalGames})`
  );

  // ── BF-526 멈춤 KPI console ──────────────────────────────
  console.log(
    `[BF-526 KPI] 멈춤/재개 토글 ${pauseToggleCount}회, 누적 멈춤 ${Math.round(totalPausedMs)}ms`,
  );

  // ── BF-537 이팩트 트리거 KPI ──────────────────────────────
  const fxTotal = Object.values(effectTriggerCount).reduce((s, v) => s + v, 0);
  const fxStr   = [1, 2, 4, 8].map(m => `${m}×:${effectTriggerCount[String(m)]}회`).join(" ");
  console.log(`[BF-537 KPI] 이팩트 트리거 — ${fxStr} | 총합:${fxTotal}회`);

  // ── BF-531 배수 통계 KPI (명세 §9-1~§9-2) ────────────────
  const mStats = state.multiplierStats;
  if (mStats) {
    const totalSpawned = Object.values(mStats).reduce((s, v) => s + v.spawned, 0);

    // 직전 게임 KPI 저장 (bf-snake-multiplier-kpi)
    const perMultiplier = {};
    for (const m of [1, 2, 4, 8]) {
      const k = String(m);
      const eatRate = mStats[k].spawned > 0
        ? Math.round(mStats[k].eaten / mStats[k].spawned * 100) / 100
        : 0;
      perMultiplier[k] = {
        spawned: mStats[k].spawned,
        eaten:   mStats[k].eaten,
        eatRate,
      };
    }
    const multKpiEntry = {
      timestamp:    Date.now(),
      totalSpawned,
      perMultiplier,
      playerScore:  state.score,
      cpuScore:     state.cpuScore,
    };
    try { localStorage.setItem(MULT_KPI_KEY, JSON.stringify(multKpiEntry)); } catch (_) { /* EC-5 */ }

    // 누적 통계 (bf-snake-multiplier-stats)
    let multStats;
    try {
      const v = localStorage.getItem(MULT_STATS_KEY);
      multStats = v ? JSON.parse(v) : null;
    } catch (_) { multStats = null; }
    if (!multStats) {
      multStats = {
        totalGames:   0,
        totalSpawned: { "1": 0, "2": 0, "4": 0, "8": 0 },
        totalEaten:   { "1": 0, "2": 0, "4": 0, "8": 0 },
      };
    }
    multStats.totalGames++;
    for (const m of [1, 2, 4, 8]) {
      const k = String(m);
      multStats.totalSpawned[k] += mStats[k].spawned;
      multStats.totalEaten[k]   += mStats[k].eaten;
    }
    try { localStorage.setItem(MULT_STATS_KEY, JSON.stringify(multStats)); } catch (_) { /* EC-5 */ }

    // console 출력 (명세 §9-2)
    const probStr = [1, 2, 4, 8].map(m => {
      const k = String(m);
      const pct = totalSpawned > 0
        ? (mStats[k].spawned / totalSpawned * 100).toFixed(1)
        : "0.0";
      return `${m}×:${mStats[k].spawned}건(${pct}%)`;
    }).join(" ");
    console.log(`[BF-531 KPI] 배수 통계 — ${probStr} | 총합:${totalSpawned}건`);

    const eatRateStr = [1, 2, 4, 8].map(m => {
      const k = String(m);
      const rate = mStats[k].spawned > 0
        ? (mStats[k].eaten / mStats[k].spawned * 100).toFixed(1)
        : "0.0";
      return `${m}×:${rate}%`;
    }).join(" ");
    console.log(`[BF-531 KPI] 수집률 — ${eatRateStr}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 아이템 KPI 로깅 — BF-545 (명세 §10-1, §10-2)
// ─────────────────────────────────────────────────────────────

/** 아이템 누적 통계 로드 */
function loadItemStats() {
  try {
    const v = localStorage.getItem(ITEM_STATS_KEY);
    if (v) return JSON.parse(v);
  } catch (_) { /* ignore */ }
  return createItemStats ? createItemStats() : {};
}

/** 아이템 KPI 세션 기록 + 누적 통계 저장 (명세 §10-1, §10-2) */
function logItemKPI() {
  if (!state.itemStats) return;

  const iStats = state.itemStats;

  // 누적 통계 업데이트 (bf-snake-item-stats)
  const accumulated = loadItemStats();
  for (const t of ["SPEED_UP", "SLOW_DOWN", "LENGTH_BURST", "SHIELD", "REVERSE"]) {
    if (!accumulated[t]) accumulated[t] = {};
    for (const k of Object.keys(iStats[t] || {})) {
      accumulated[t][k] = (accumulated[t][k] || 0) + (iStats[t][k] || 0);
    }
  }
  try { localStorage.setItem(ITEM_STATS_KEY, JSON.stringify(accumulated)); } catch (_) { /* ignore */ }

  // 세션 KPI (bf-snake-item-kpi)
  const totalAcquired = ["SPEED_UP","SLOW_DOWN","LENGTH_BURST","SHIELD","REVERSE"]
    .reduce((s, t) => s + (iStats[t]?.acquired || 0), 0);
  const totalUsed = (iStats.SHIELD?.used || 0) + (iStats.REVERSE?.used || 0);
  const totalExpired = ["SPEED_UP","SLOW_DOWN","LENGTH_BURST","SHIELD","REVERSE"]
    .reduce((s, t) => s + (iStats[t]?.expired || 0), 0);

  const kpiEntry = {
    timestamp:      Date.now(),
    itemsEnabled:   !!ITEMS_ENABLED,
    itemsAcquired:  totalAcquired,
    itemsUsed:      totalUsed,
    itemsExpired:   totalExpired,
    perType:        iStats,
  };
  try { localStorage.setItem(ITEM_KPI_KEY, JSON.stringify(kpiEntry)); } catch (_) { /* ignore */ }

  // console 출력
  if (totalAcquired > 0) {
    const acqStr = ["SPEED_UP","SLOW_DOWN","LENGTH_BURST","SHIELD","REVERSE"]
      .map(t => `${t}:${iStats[t]?.acquired || 0}`).join(" ");
    console.log(`[BF-545 KPI] 아이템 획득: ${acqStr} | 총:${totalAcquired} 사용:${totalUsed} 만료:${totalExpired}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 이팩트 렌더링 — BF-537
// ─────────────────────────────────────────────────────────────

/** 이팩트 on/off 토글 플래그.
 *  false 로 설정하면 triggerEffect 가 완전히 무효화되어 기존 게임 동작과 동일 (롤백 가능).
 *  브라우저 콘솔에서 EFFECTS_ENABLED = false 로 즉시 비활성화 가능. */
let EFFECTS_ENABLED = true;

/** 세션 내 이팩트 트리거 카운트 (배수별 누적, localStorage 동기화) */
const effectTriggerCount = { "1": 0, "2": 0, "4": 0, "8": 0 };

const effectLayer = document.getElementById("effect-layer");

/** 이팩트 KPI — localStorage 에 누적 카운트 저장 */
function saveEffectKPI() {
  try {
    localStorage.setItem(EFFECT_KPI_KEY, JSON.stringify(effectTriggerCount));
  } catch (_) { /* EC-5: private mode 등 — 무시 */ }
}

// ── 헬퍼 ──────────────────────────────────────────────────────

/** 스크린 플래시 오버레이 (4×/8× 공용) */
function triggerScreenFlash(color, durationMs) {
  const el = document.createElement("div");
  el.className = "fx-flash";
  el.style.cssText = `
    position: fixed; inset: 0;
    background: ${color};
    pointer-events: none;
    z-index: 16;
    animation: fx-screen-flash ${durationMs}ms ease-out forwards;
  `;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

/** 화면 흔들림 (8× 전용) — body 에 적용, canvas 좌표 영향 없음 */
function triggerScreenShake() {
  document.body.style.animation = "fx-screen-shake 200ms ease-in-out";
  setTimeout(() => { document.body.style.animation = ""; }, 200);
}

// ── 배수별 이팩트 함수 ────────────────────────────────────────

/** 1× — 골든 스파클 (명세 §5-1) */
function triggerSparkle(cx, cy) {
  // 중심 플래시 (8px, 120ms)
  const center = document.createElement("div");
  center.className = "fx-particle fx-1x";
  center.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 8px; height: 8px;
    background: #ffcc00;
    border-radius: 50%;
    pointer-events: none;
    animation: fx-sparkle-center 120ms ease-out forwards;
  `;
  effectLayer.appendChild(center);
  center.addEventListener("animationend", () => center.remove(), { once: true });

  // 6개 방사형 파티클 — 60° 간격, travel 28px
  const colors = ["#ffcc00", "#fff3a0"];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 28);
    const ty    = Math.round(Math.sin(angle) * 28);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-1x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 3}px; top: ${cy - 3}px;
      width: 6px; height: 6px;
      background: ${colors[i % 2]};
      border-radius: 50%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-sparkle-particle 380ms cubic-bezier(0.2,0.6,0.4,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** 2× — 사이언 다이아몬드 (명세 §5-2) */
function triggerPop(cx, cy) {
  // 중심 플래시 (#fff, 10px, 150ms)
  const center = document.createElement("div");
  center.className = "fx-particle fx-2x";
  center.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 10px; height: 10px;
    background: #ffffff;
    border-radius: 50%;
    pointer-events: none;
    animation: fx-sparkle-center 150ms ease-out forwards;
  `;
  effectLayer.appendChild(center);
  center.addEventListener("animationend", () => center.remove(), { once: true });

  // 8개 다이아몬드 파티클 — 45° 간격, travel 44px
  const colors = ["#00cfff", "#80e8ff"];
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 44);
    const ty    = Math.round(Math.sin(angle) * 44);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-2x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 3.5}px; top: ${cy - 3.5}px;
      width: 7px; height: 7px;
      background: ${colors[i % 2]};
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-pop-particle 480ms cubic-bezier(0.1,0.7,0.3,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** 4× — 퍼플 버스트 (명세 §5-3) */
function triggerBurst(cx, cy) {
  // 스크린 플래시 (rgba(180,60,255,0.15), 60ms)
  triggerScreenFlash("rgba(180,60,255,0.15)", 60);

  // 중심 링 확장 (border: 2px solid #cc44ff, 0→44px 반지름, 350ms)
  const ring = document.createElement("div");
  ring.className = "fx-ring fx-4x";
  ring.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 0; height: 0;
    border: 2px solid #cc44ff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: fx-burst-ring 350ms cubic-bezier(0.05,0.7,0.25,1) forwards;
  `;
  effectLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });

  const starClip = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

  // 내부 링 — 6개 별, 60° 간격, travel 30px
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 30);
    const ty    = Math.round(Math.sin(angle) * 30);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-4x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 5}px; top: ${cy - 5}px;
      width: 10px; height: 10px;
      background: #cc44ff;
      clip-path: ${starClip};
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-burst-inner 620ms cubic-bezier(0.05,0.7,0.25,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 외부 링 — 6개 별, 30° 오프셋, travel 62px, 50ms 딜레이
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 + 30) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 62);
    const ty    = Math.round(Math.sin(angle) * 62);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-4x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 5}px; top: ${cy - 5}px;
      width: 10px; height: 10px;
      background: #e080ff;
      clip-path: ${starClip};
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-burst-inner 620ms cubic-bezier(0.05,0.7,0.25,1) 50ms forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 위성 원 — 4개, 90° 간격, travel 42px
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 42);
    const ty    = Math.round(Math.sin(angle) * 42);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-4x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 4}px; top: ${cy - 4}px;
      width: 8px; height: 8px;
      background: #ffaaff;
      border-radius: 50%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-burst-inner 620ms cubic-bezier(0.05,0.7,0.25,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** 8× — 메가 블라스트 (명세 §5-4) */
function triggerMegaBlast(cx, cy) {
  // 스크린 플래시 (rgba(255,68,68,0.25), 100ms)
  triggerScreenFlash("rgba(255,68,68,0.25)", 100);
  // 화면 흔들림 ±4px / 200ms
  triggerScreenShake();

  // 쇼크웨이브 링 1 — border: 2px solid #ff4444, 0→60px 반지름, 400ms
  const sw1 = document.createElement("div");
  sw1.className = "fx-ring fx-8x";
  sw1.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 0; height: 0;
    border: 2px solid #ff4444;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: fx-shock1 400ms cubic-bezier(0,0.9,0.2,1) forwards;
  `;
  effectLayer.appendChild(sw1);
  sw1.addEventListener("animationend", () => sw1.remove(), { once: true });

  // 쇼크웨이브 링 2 — rgba(255,136,0,0.6), 0→90px, 600ms, 100ms 딜레이
  const sw2 = document.createElement("div");
  sw2.className = "fx-ring fx-8x";
  sw2.style.cssText = `
    position: absolute;
    left: ${cx}px; top: ${cy}px;
    width: 0; height: 0;
    border: 2px solid rgba(255,136,0,0.6);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    animation: fx-shock2 600ms cubic-bezier(0,0.9,0.2,1) 100ms forwards;
  `;
  effectLayer.appendChild(sw2);
  sw2.addEventListener("animationend", () => sw2.remove(), { once: true });

  // 내부 불꽃 파티클 — 8개, 45° 간격, travel 52px, 840ms
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 52);
    const ty    = Math.round(Math.sin(angle) * 52);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 5}px; top: ${cy - 7}px;
      width: 10px; height: 14px;
      background: linear-gradient(to bottom, #ff4444, #ff8800);
      border-radius: 80% 20% 80% 20%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-main 840ms cubic-bezier(0,0.9,0.2,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 외부 원 파티클 — 8개, 22.5° 오프셋, travel 96px, 840ms
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 + 22.5) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 96);
    const ty    = Math.round(Math.sin(angle) * 96);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 4}px; top: ${cy - 4}px;
      width: 8px; height: 8px;
      background: #ff8800;
      border-radius: 50%;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-main 840ms cubic-bezier(0,0.9,0.2,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 드리프트 별 — 4개, 위쪽 방향 중심, travel 80px, 1100ms (linear)
  const driftAngles = [-90, -60, -120, -75];
  for (let i = 0; i < 4; i++) {
    const angle = driftAngles[i] * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 80);
    const ty    = Math.round(Math.sin(angle) * 80);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 6}px; top: ${cy - 6}px;
      width: 12px; height: 12px;
      background: #ffcc00;
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-drift 1100ms linear forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // 스파크 — 4방향, 직선 (2×16px), travel 36px, 840ms
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90) * Math.PI / 180;
    const tx    = Math.round(Math.cos(angle) * 36);
    const ty    = Math.round(Math.sin(angle) * 36);
    const el    = document.createElement("div");
    el.className = "fx-particle fx-8x";
    el.style.cssText = `
      position: absolute;
      left: ${cx - 1}px; top: ${cy - 8}px;
      width: 2px; height: 16px;
      background: #ffffff;
      pointer-events: none;
      --tx: ${tx}px; --ty: ${ty}px;
      animation: fx-mega-main 840ms cubic-bezier(0,0.9,0.2,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

// ─────────────────────────────────────────────────────────────
// 아이템 이팩트 — BF-545 (명세 §5-6, §5-7)
// ─────────────────────────────────────────────────────────────

/** SPEED_UP 발동 이팩트 (명세 §5-6) */
function triggerSpeedEffect(cx, cy) {
  // 화면 플래시
  triggerScreenFlash("rgba(255,170,0,0.18)", 80);
  // 중심 플래시 원
  const center = document.createElement("div");
  center.style.cssText = `
    position:absolute; left:${cx}px; top:${cy}px;
    width:8px; height:8px;
    background:#ffaa00; border-radius:50%;
    pointer-events:none;
    animation:fx-sparkle-center 120ms ease-out forwards;
  `;
  effectLayer.appendChild(center);
  center.addEventListener("animationend", () => center.remove(), { once: true });
  // 6개 방사형 파티클
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60) * Math.PI / 180;
    const tx = Math.round(Math.cos(angle) * 32);
    const ty = Math.round(Math.sin(angle) * 32);
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${cx-3}px; top:${cy-3}px;
      width:6px; height:6px;
      background:#ffaa00; border-radius:50%;
      pointer-events:none;
      --tx:${tx}px; --ty:${ty}px;
      animation:fx-item-particle 300ms cubic-bezier(0.2,0.6,0.4,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** SLOW_DOWN 발동 이팩트 (명세 §5-6) */
function triggerSlowEffect(cx, cy) {
  // 냉기 링 확장
  const ring = document.createElement("div");
  ring.style.cssText = `
    position:absolute; left:${cx}px; top:${cy}px;
    width:0; height:0;
    border:2px solid #00ddcc; border-radius:50%;
    transform:translate(-50%,-50%);
    pointer-events:none;
    animation:fx-slow-ring 400ms cubic-bezier(0.05,0.7,0.25,1) forwards;
  `;
  effectLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
  // 4개 다이아몬드 파티클
  for (let i = 0; i < 4; i++) {
    const angle = (i * 90) * Math.PI / 180;
    const tx = Math.round(Math.cos(angle) * 22);
    const ty = Math.round(Math.sin(angle) * 22);
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${cx-3}px; top:${cy-3}px;
      width:6px; height:6px;
      background:#00ddcc;
      transform:rotate(45deg);
      pointer-events:none;
      --tx:${tx}px; --ty:${ty}px;
      animation:fx-item-particle 350ms cubic-bezier(0.2,0.6,0.4,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
  // 중심 청록 플래시
  const center = document.createElement("div");
  center.style.cssText = `
    position:absolute; left:${cx}px; top:${cy}px;
    width:8px; height:8px;
    background:#00ddcc; border-radius:50%;
    pointer-events:none;
    animation:fx-sparkle-center 150ms ease-out forwards;
  `;
  effectLayer.appendChild(center);
  center.addEventListener("animationend", () => center.remove(), { once: true });
}

/** LENGTH_BURST 발동 이팩트 (명세 §5-6) */
function triggerBurstEffect(cx, cy) {
  triggerScreenFlash("rgba(255,102,0,0.22)", 100);
  // 폭발 링
  const ring = document.createElement("div");
  ring.style.cssText = `
    position:absolute; left:${cx}px; top:${cy}px;
    width:0; height:0;
    border:2px solid #ff6600; border-radius:50%;
    transform:translate(-50%,-50%);
    pointer-events:none;
    animation:fx-item-ring 500ms cubic-bezier(0,0.9,0.2,1) forwards;
  `;
  effectLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
  // 12개 폭발 파티클
  const colors = ["#ff6600", "#ff9900"];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30) * Math.PI / 180;
    const tx = Math.round(Math.cos(angle) * 50);
    const ty = Math.round(Math.sin(angle) * 50);
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${cx-4}px; top:${cy-4}px;
      width:8px; height:8px;
      background:${colors[i % 2]}; border-radius:50%;
      pointer-events:none;
      --tx:${tx}px; --ty:${ty}px;
      animation:fx-burst-orange 550ms cubic-bezier(0,0.9,0.2,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** SHIELD 발동 이팩트 (명세 §5-7) */
function triggerShieldEffect(cx, cy) {
  // 방패 링 파동
  const ring = document.createElement("div");
  ring.style.cssText = `
    position:absolute; left:${cx}px; top:${cy}px;
    width:0; height:0;
    border:2px solid #4488ff; border-radius:50%;
    transform:translate(-50%,-50%);
    pointer-events:none;
    animation:fx-item-ring 350ms cubic-bezier(0.05,0.7,0.25,1) forwards;
  `;
  effectLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
  // 8개 파란 파티클
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const tx = Math.round(Math.cos(angle) * 26);
    const ty = Math.round(Math.sin(angle) * 26);
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${cx-2.5}px; top:${cy-2.5}px;
      width:5px; height:5px;
      background:#4488ff;
      transform:rotate(45deg);
      pointer-events:none;
      --tx:${tx}px; --ty:${ty}px;
      animation:fx-item-particle 400ms cubic-bezier(0.2,0.6,0.4,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/** REVERSE 발동 이팩트 (명세 §5-7) */
function triggerReverseEffect(cx, cy) {
  triggerScreenFlash("rgba(34,255,170,0.15)", 80);
  // 소용돌이 링
  const ring = document.createElement("div");
  ring.style.cssText = `
    position:absolute; left:${cx}px; top:${cy}px;
    width:0; height:0;
    border:2px solid #22ffaa; border-radius:50%;
    transform:translate(-50%,-50%);
    pointer-events:none;
    animation:fx-item-ring 400ms cubic-bezier(0.05,0.7,0.25,1) forwards;
  `;
  effectLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
  // 16개 소용돌이 파티클
  for (let i = 0; i < 16; i++) {
    const angle = (i * 22.5) * Math.PI / 180;
    const tx = Math.round(Math.cos(angle + Math.PI / 2) * 32);
    const ty = Math.round(Math.sin(angle + Math.PI / 2) * 32);
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute; left:${cx-2.5}px; top:${cy-2.5}px;
      width:5px; height:5px;
      background:#22ffaa; border-radius:50%;
      pointer-events:none;
      --tx:${tx}px; --ty:${ty}px;
      animation:fx-swirl-particle 600ms cubic-bezier(0.2,0.6,0.4,1) forwards;
    `;
    effectLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }
}

/**
 * 아이템 이팩트 트리거 메인 디스패처 (명세 §6-6).
 * @param {number} cx
 * @param {number} cy
 * @param {string} type  아이템 타입
 */
function triggerItemEffect(cx, cy, type) {
  if (!EFFECTS_ENABLED) return;
  switch (type) {
    case "SPEED_UP":     triggerSpeedEffect(cx, cy);   break;
    case "SLOW_DOWN":    triggerSlowEffect(cx, cy);    break;
    case "LENGTH_BURST": triggerBurstEffect(cx, cy);   break;
    case "SHIELD":       triggerShieldEffect(cx, cy);  break;
    case "REVERSE":      triggerReverseEffect(cx, cy); break;
  }
}

/**
 * 파티클 이팩트 트리거 — 메인 디스패처 (명세 §6-3)
 * @param {number} cx  이팩트 원점 X (px, 뷰포트 기준)
 * @param {number} cy  이팩트 원점 Y (px, 뷰포트 기준)
 * @param {1|2|4|8} multiplier
 */
function triggerEffect(cx, cy, multiplier) {
  if (!EFFECTS_ENABLED) return;                 // on/off 토글 — off 시 기존 동작 완전 동일

  // KPI 트리거 카운트 누적 (AC-3)
  const k = String(multiplier);
  effectTriggerCount[k] = (effectTriggerCount[k] || 0) + 1;
  saveEffectKPI();

  switch (multiplier) {
    case 1: triggerSparkle(cx, cy);    break;
    case 2: triggerPop(cx, cy);        break;
    case 4: triggerBurst(cx, cy);      break;
    case 8: triggerMegaBlast(cx, cy);  break;
  }
}

// ─────────────────────────────────────────────────────────────
// 캔버스 크기 조정
// ─────────────────────────────────────────────────────────────
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  // BF-595: pixi 백엔드 resize (격자 재생성)
  if (RENDER_BACKEND === "pixi") {
    SnakeRenderer.resize(canvas.width, canvas.height);
  }
}

function getGridSize() {
  return {
    cols: Math.floor(canvas.width  / CELL),
    rows: Math.floor(canvas.height / CELL),
  };
}

// ─────────────────────────────────────────────────────────────
// 렌더링
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// 아이템 캔버스 렌더링 — BF-545 (명세 §5-1, §6-3)
// ─────────────────────────────────────────────────────────────

/** 아이템 컬러 팔레트 (명세 §6-3) */
const ITEM_COLORS = {
  SPEED_UP:     { primary: "#ffaa00", glow: "rgba(255,170,0,0.40)" },
  SLOW_DOWN:    { primary: "#00ddcc", glow: "rgba(0,221,204,0.40)" },
  LENGTH_BURST: { primary: "#ff6600", glow: "rgba(255,102,0,0.45)" },
  SHIELD:       { primary: "#4488ff", glow: "rgba(68,136,255,0.45)" },
  REVERSE:      { primary: "#22ffaa", glow: "rgba(34,255,170,0.40)" },
};

/**
 * 아이콘 Canvas Path 렌더링 (명세 §5-1 개별 path).
 * ctx.fillStyle 은 호출 전 "#ffffff" 으로 세팅되어 있어야 함.
 */
function drawItemIcon(iconCtx, type, cx, cy) {
  iconCtx.fillStyle = "#ffffff";
  switch (type) {
    case "SPEED_UP": {
      // 번개 폴리곤 (명세 §5-1 SPEED_UP)
      iconCtx.beginPath();
      iconCtx.moveTo(cx + 2, cy - 5);
      iconCtx.lineTo(cx - 1, cy);
      iconCtx.lineTo(cx + 1, cy);
      iconCtx.lineTo(cx - 2, cy + 5);
      iconCtx.lineTo(cx + 1, cy + 1);
      iconCtx.lineTo(cx + 0, cy + 1);
      iconCtx.closePath();
      iconCtx.fillStyle = "#ffffff";
      iconCtx.fill();
      break;
    }
    case "SLOW_DOWN": {
      // 모래시계 (명세 §5-1 SLOW_DOWN)
      iconCtx.fillStyle = "#ffffff";
      iconCtx.beginPath();
      iconCtx.moveTo(cx - 4, cy - 5); iconCtx.lineTo(cx + 4, cy - 5);
      iconCtx.lineTo(cx, cy);
      iconCtx.closePath();
      iconCtx.fill();
      iconCtx.beginPath();
      iconCtx.moveTo(cx - 4, cy + 5); iconCtx.lineTo(cx + 4, cy + 5);
      iconCtx.lineTo(cx, cy);
      iconCtx.closePath();
      iconCtx.fillStyle = "#ffffff";
      iconCtx.fill();
      iconCtx.fillRect(cx - 4, cy - 1, 8, 2);
      break;
    }
    case "LENGTH_BURST": {
      // 8방향 스타 버스트 (명세 §5-1 LENGTH_BURST)
      const arms = 8;
      iconCtx.beginPath();
      for (let i = 0; i < arms; i++) {
        const outerR = 5, innerR = 2;
        const outerA = (i / arms) * Math.PI * 2 - Math.PI / 2;
        const innerA = outerA + Math.PI / arms;
        if (i === 0) iconCtx.moveTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
        else         iconCtx.lineTo(cx + Math.cos(outerA) * outerR, cy + Math.sin(outerA) * outerR);
        iconCtx.lineTo(cx + Math.cos(innerA) * innerR, cy + Math.sin(innerA) * innerR);
      }
      iconCtx.closePath();
      iconCtx.fillStyle = "#ffffff";
      iconCtx.fill();
      break;
    }
    case "SHIELD": {
      // 육각형 방패 (명세 §5-1 SHIELD)
      iconCtx.beginPath();
      iconCtx.moveTo(cx, cy - 6);
      iconCtx.lineTo(cx + 4, cy - 3);
      iconCtx.lineTo(cx + 4, cy + 2);
      iconCtx.lineTo(cx, cy + 5);
      iconCtx.lineTo(cx - 4, cy + 2);
      iconCtx.lineTo(cx - 4, cy - 3);
      iconCtx.closePath();
      iconCtx.fillStyle = "#ffffff";
      iconCtx.fill();
      // 방패 중앙 십자
      iconCtx.fillStyle = "#4488ff";
      iconCtx.fillRect(cx - 1, cy - 3, 2, 6);
      iconCtx.fillRect(cx - 3, cy - 1, 6, 2);
      break;
    }
    case "REVERSE": {
      // 역방향 화살표 (명세 §5-1 REVERSE)
      iconCtx.beginPath();
      iconCtx.arc(cx, cy, 4, Math.PI, 0, false);
      iconCtx.strokeStyle = "#ffffff";
      iconCtx.lineWidth = 2;
      iconCtx.stroke();
      iconCtx.beginPath();
      iconCtx.moveTo(cx - 4, cy);
      iconCtx.lineTo(cx - 6, cy - 3);
      iconCtx.lineTo(cx - 6, cy + 1);
      iconCtx.closePath();
      iconCtx.fillStyle = "#ffffff";
      iconCtx.fill();
      break;
    }
  }
}

/**
 * 보드 위 아이템 셀 렌더링 (명세 §6-3).
 * FIXME(BF-545): §5-1 명세의 drawItem 구현
 */
function drawItem() {
  const item = state.item;
  if (!item) return;

  const cx = item.x * CELL + CELL / 2;
  const cy = item.y * CELL + CELL / 2;
  const { primary, glow } = ITEM_COLORS[item.type] || ITEM_COLORS.SPEED_UP;

  // [1] 배경 원 (75% opacity ≈ bf hex)
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = primary + "bf";
  ctx.fill();

  // [2] 외곽 광채 링
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.strokeStyle = glow;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // [3] 아이콘
  drawItemIcon(ctx, item.type, cx, cy);

  // [4] 만료 임박 깜박임 (3초 미만)
  const msLeft = item.expiresAt - Date.now();
  if (msLeft < 3000 && Math.floor(Date.now() / 500) % 2 === 1) {
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#0d0d0d";
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ─────────────────────────────────────────────────────────────
// HUD 업데이트 함수 — BF-545
// ─────────────────────────────────────────────────────────────

/** 토스트 알림 표시 (명세 §5-5) */
function showToast(message, cssClass) {
  if (!toastContainerEl) return;
  const el = document.createElement("div");
  el.className = `toast ${cssClass}`;
  el.textContent = message;
  toastContainerEl.appendChild(el);
  // 1.5s 표시 + 0.3s fade-out → 총 1.8s 후 제거
  setTimeout(() => el.remove(), 1800);
}

/** Z 키 힌트 오버레이 (명세 §5-4, §6-7) */
function maybeShowZHint(itemType) {
  try {
    if (localStorage.getItem(Z_HINT_KEY)) return;
    const colorMap = {
      SHIELD:  "#4488ff",
      REVERSE: "#22ffaa",
    };
    const color = colorMap[itemType] || "#ffffff";
    const iconMap = { SHIELD: "🛡️", REVERSE: "🌀" };
    const icon  = iconMap[itemType] || "";
    const el    = document.createElement("div");
    el.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.80);
      border:1px solid ${color};
      border-radius:8px; padding:10px 20px;
      font-family:'Courier New',monospace; font-size:13px;
      color:${color}; z-index:12; pointer-events:none;
      animation:toast-in 0.25s ease-out forwards;
    `;
    el.innerHTML = `${icon} 획득! <span style="background:${color};color:#0d0d0d;padding:1px 5px;border-radius:3px;font-weight:bold;">Z</span> 키로 사용`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
    localStorage.setItem(Z_HINT_KEY, "1");
  } catch (_) { /* private mode — 무시 */ }
}

/** 버프 상태줄 업데이트 (명세 §5-2) */
function updateBuffBar() {
  if (!buffBarEl) return;

  const nowMs    = Date.now();
  const stack    = state.speedStack || [];
  const burst    = state.lengthBurstActive;
  const burstEnd = state.lengthBurstEndMs || 0;

  // 활성 버프 목록 수집
  const activeBuffs = [];

  // speedStack에서 player 효과 추출
  const playerSpeedEntries = stack.filter(e => e.target === "player");
  for (const e of playerSpeedEntries) {
    const remainMs = Math.max(0, e.expiresAtMs - nowMs);
    const totalMs  = ITEM_DURATION_MS ? ITEM_DURATION_MS[e.type] : 5000;
    activeBuffs.push({ type: e.type, remainMs, totalMs });
  }

  // LENGTH_BURST
  if (burst && burstEnd > nowMs) {
    const remainMs = Math.max(0, burstEnd - nowMs);
    activeBuffs.push({ type: "LENGTH_BURST", remainMs, totalMs: 5000 });
  }

  // 숨기기/보이기
  if (activeBuffs.length === 0) {
    buffBarEl.setAttribute("hidden", "");
    return;
  }
  buffBarEl.removeAttribute("hidden");

  // DOM 재구성
  const cssClassMap = {
    SPEED_UP:     "buff-speed",
    SLOW_DOWN:    "buff-slow",
    LENGTH_BURST: "buff-burst",
  };
  const iconMap = { SPEED_UP: "⚡", SLOW_DOWN: "🐢", LENGTH_BURST: "🔥" };
  const labelMap = { SPEED_UP: "SPEED", SLOW_DOWN: "SLOW", LENGTH_BURST: "BURST" };

  // 기존 항목과 비교해 최소 업데이트
  buffBarEl.innerHTML = "";
  for (const { type, remainMs, totalMs } of activeBuffs) {
    const pct       = Math.max(0, Math.min(100, (remainMs / totalMs) * 100));
    const secStr    = (remainMs / 1000).toFixed(1) + "s";
    const isExpiring = remainMs < 1000;
    const div = document.createElement("div");
    div.className = `buff-item ${cssClassMap[type] || ""}`;
    div.dataset.expiring = isExpiring ? "true" : "false";
    div.innerHTML = `
      <span class="buff-icon">${iconMap[type] || ""}</span>
      <span class="buff-label">${labelMap[type] || type}</span>
      <div class="buff-progress-track">
        <div class="buff-progress-bar" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <span class="buff-time">${secStr}</span>
    `;
    buffBarEl.appendChild(div);
  }

  // #buff-bar top 동적 계산 (명세 §4-2, F-2)
  const hudRect = document.getElementById("hud").getBoundingClientRect();
  buffBarEl.style.top = (hudRect.bottom + 10) + "px";
}

/** 보유 아이템 슬롯 HUD 업데이트 (명세 §5-3) */
function updateItemSlotHUD() {
  if (!slotBoxEl) return;

  const nowMs   = Date.now();
  const held    = state.heldItem;

  if (!held) {
    slotBoxEl.dataset.state    = "empty";
    slotBoxEl.dataset.expiring = "false";
    slotBoxEl.removeAttribute("style");
    if (slotIconEl)    slotIconEl.textContent    = "—";
    if (slotKeyHintEl) slotKeyHintEl.style.color  = "rgba(255,255,255,0.25)";
    if (slotExpireEl)  slotExpireEl.textContent   = "";
    return;
  }

  const colorMap = { SHIELD: "#4488ff", REVERSE: "#22ffaa" };
  const iconMap  = { SHIELD: "🛡️",    REVERSE: "🌀" };
  const color    = colorMap[held.type] || "#ffffff";
  const icon     = iconMap[held.type]  || "?";
  const remainMs = Math.max(0, held.expiresAt - nowMs);
  const remainSec = Math.ceil(remainMs / 1000);
  const isExpiring = remainMs < 5000;

  slotBoxEl.dataset.state    = `held-${held.type.toLowerCase()}`;
  slotBoxEl.dataset.expiring = isExpiring ? "true" : "false";
  slotBoxEl.style.border     = `2px solid ${color}`;
  slotBoxEl.style.boxShadow  = `0 0 10px ${color}88`;

  if (slotIconEl)    slotIconEl.textContent   = icon;
  if (slotKeyHintEl) {
    slotKeyHintEl.textContent = "[Z]";
    slotKeyHintEl.style.color = color;
  }
  if (slotExpireEl)  slotExpireEl.textContent  = `${remainSec}s`;
  if (isExpiring && slotExpireEl) slotExpireEl.style.color = "#ff4444";
  else if (slotExpireEl)          slotExpireEl.style.color = "#aaa";
}

// ─────────────────────────────────────────────────────────────
// 배경 격자
// ─────────────────────────────────────────────────────────────

/** 배경 격자 */
function drawBackground() {
  ctx.fillStyle = "#0d0d0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= state.cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, state.rows * CELL);
    ctx.stroke();
  }
  for (let y = 0; y <= state.rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(state.cols * CELL, y * CELL);
    ctx.stroke();
  }
}

/** 플레이어 지렁이 — 초록 계열 (#4cff80 / #00cc44) */
function drawSnake() {
  // BF-545: LENGTH_BURST 깜박임 효과 — 0.5초 주기로 흰색↔초록 (명세 §5-8)
  const isLengthBurstActive = state.lengthBurstActive ?? false;
  const blinkOn = isLengthBurstActive && (Math.floor(performance.now() / 500) % 2 === 0);

  state.snake.forEach((seg, i) => {
    const alpha = i === 0 ? 1 : 0.85 - (i / state.snake.length) * 0.4;
    // LENGTH_BURST 중 깜박임: 흰색(0.9α)↔일반 초록
    const burstFill = (isLengthBurstActive && blinkOn) ? "rgba(255,255,255,0.90)" : null;
    ctx.fillStyle = burstFill ?? (i === 0 ? "#00cc44" : `rgba(60,210,100,${alpha})`);
    ctx.beginPath();
    ctx.roundRect(
      seg.x * CELL + 1,
      seg.y * CELL + 1,
      CELL - 2,
      CELL - 2,
      4,
    );
    ctx.fill();

    // 헤드 테두리 (2px) — s2 §5-1
    if (i === 0) {
      // BF-545: SHIELD 글로우 — 파란 외곽선 pulse (명세 §5-9)
      if (state.shieldActive) {
        const glowAlpha = 0.4 + 0.3 * Math.abs(Math.sin(performance.now() / 750));
        ctx.strokeStyle = `rgba(68,136,255,${glowAlpha.toFixed(2)})`;
        ctx.lineWidth   = 3;
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL, seg.y * CELL, CELL, CELL, 4);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.stroke();

      // 눈
      ctx.fillStyle = "#0d0d0d";
      const eyeSize = 3;
      const dir = state.dir;
      let e1x, e1y, e2x, e2y;
      if (dir.x === 1) {
        e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.x === -1) {
        e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.y === -1) {
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
      } else {
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + CELL - 6;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + CELL - 6;
      }
      ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
      ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
    }
  });
}

/** CPU 지렁이 — 주황-빨강 계열 (#ff6b4c / #cc2200) — s2 §5-1 */
function drawCpuSnake() {
  if (!state.cpu || state.cpu.length === 0) return;
  // BF-545: CPU LENGTH_BURST 깜박임 효과 (명세 §5-8)
  const isCpuBurstActive = state.cpuLengthBurstActive ?? false;
  const cpuBlinkOn = isCpuBurstActive && (Math.floor(performance.now() / 500) % 2 === 0);

  state.cpu.forEach((seg, i) => {
    const alpha = i === 0 ? 1 : 0.85 - (i / state.cpu.length) * 0.4;
    const cpuBurstFill = (isCpuBurstActive && cpuBlinkOn) ? "rgba(255,200,150,0.90)" : null;
    ctx.fillStyle = cpuBurstFill ?? (i === 0 ? "#cc2200" : `rgba(210,60,60,${alpha})`);
    ctx.beginPath();
    ctx.roundRect(
      seg.x * CELL + 1,
      seg.y * CELL + 1,
      CELL - 2,
      CELL - 2,
      4,
    );
    ctx.fill();

    // 헤드 테두리 (2px) — s2 §5-1
    if (i === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.stroke();

      // CPU 눈
      ctx.fillStyle = "#0d0d0d";
      const eyeSize = 3;
      const dir = state.cpuDir;
      let e1x, e1y, e2x, e2y;
      if (dir.x === 1) {
        e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.x === -1) {
        e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
        e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
      } else if (dir.y === -1) {
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
      } else {
        e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + CELL - 6;
        e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + CELL - 6;
      }
      ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
      ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
    }
  });
}

/** BF-584: 추가 CPU 지렁이 (extraCpus) 렌더링.
 *  주황-노랑 계열로 main CPU 와 구분 (head: #ff9933, body: rgba(220,140,60,a)). */
function drawExtraCpus() {
  if (!state.extraCpus || state.extraCpus.length === 0) return;
  state.extraCpus.forEach((extra) => {
    const body = extra.body || [];
    const dir  = extra.dir || DIR.LEFT;
    body.forEach((seg, i) => {
      const alpha = i === 0 ? 1 : 0.80 - (i / body.length) * 0.4;
      ctx.fillStyle = i === 0 ? "#ff9933" : `rgba(220,140,60,${alpha})`;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();
      if (i === 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 4);
        ctx.stroke();
        // 눈 (방향 표시)
        ctx.fillStyle = "#0d0d0d";
        const eyeSize = 3;
        let e1x, e1y, e2x, e2y;
        if (dir.x === 1) {
          e1x = seg.x * CELL + CELL - 6; e1y = seg.y * CELL + 4;
          e2x = seg.x * CELL + CELL - 6; e2y = seg.y * CELL + CELL - 4 - eyeSize;
        } else if (dir.x === -1) {
          e1x = seg.x * CELL + 3;        e1y = seg.y * CELL + 4;
          e2x = seg.x * CELL + 3;        e2y = seg.y * CELL + CELL - 4 - eyeSize;
        } else if (dir.y === -1) {
          e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + 3;
          e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + 3;
        } else {
          e1x = seg.x * CELL + 4;              e1y = seg.y * CELL + CELL - 6;
          e2x = seg.x * CELL + CELL - 4 - eyeSize; e2y = seg.y * CELL + CELL - 6;
        }
        ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
        ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
      }
    });
  });
}

/** BF-584: 추가 CPU 지렁이 (extraCpus) 1 틱 이동.
 *  player + main CPU + 다른 extras + 자기 몸통 + 격자 경계를 장애물로 인식.
 *  음식 방향 Manhattan 거리 최소 방향 우선 (단순 greedy).
 *  유효 방향이 없으면 해당 extra 제거 (사망). 음식은 먹지 않음 (점수 격리). */
function tickExtraCpus() {
  if (!state.extraCpus || state.extraCpus.length === 0) return;

  const cols = state.cols;
  const rows = state.rows;
  const dirsAll = [DIR.UP, DIR.DOWN, DIR.LEFT, DIR.RIGHT];
  const playerCells = state.snake.map((s) => `${s.x},${s.y}`);
  const mainCpuCells = (state.cpu || []).map((s) => `${s.x},${s.y}`);

  const survivors = [];
  for (let i = 0; i < state.extraCpus.length; i++) {
    const e    = state.extraCpus[i];
    const body = e.body || [];
    if (body.length === 0) continue;

    const obstacles = new Set([...playerCells, ...mainCpuCells]);
    for (let j = 0; j < state.extraCpus.length; j++) {
      if (j === i) continue;
      const ob = state.extraCpus[j].body || [];
      ob.forEach((c) => obstacles.add(`${c.x},${c.y}`));
    }
    // 자기 몸통 (머리 제외 — 머리 다음 칸 이동 후 자리)
    body.slice(1).forEach((c) => obstacles.add(`${c.x},${c.y}`));

    const head = body[0];
    const cur  = e.dir || DIR.LEFT;
    const candidates = dirsAll.filter((d) => {
      // 자살 방향 제거
      if (d.x + cur.x === 0 && d.y + cur.y === 0) return false;
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
      if (obstacles.has(`${nx},${ny}`)) return false;
      return true;
    });

    if (candidates.length === 0) continue; // 사망 — 제거

    // 음식 거리 최소 방향 (state.food 가 있을 때만)
    let chosen = candidates[0];
    if (state.food) {
      let bestDist = Infinity;
      for (const d of candidates) {
        const nx = head.x + d.x;
        const ny = head.y + d.y;
        const dist = Math.abs(nx - state.food.x) + Math.abs(ny - state.food.y);
        if (dist < bestDist) {
          bestDist = dist;
          chosen   = d;
        }
      }
    }

    const newHead = { x: head.x + chosen.x, y: head.y + chosen.y };
    const newBody = [newHead, ...body.slice(0, -1)];
    survivors.push({ body: newBody, dir: chosen, recentPositions: [] });
  }
  state = Object.assign({}, state, { extraCpus: survivors });
}

/** 먹이 — BF-533: 배수별 색상·레이블 렌더링 (명세 §2-1) */
function drawFood() {
  if (!state.food) return;
  const { x, y, multiplier = 1 } = state.food;
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  const r  = CELL / 2 - 3;

  // 배수별 색상 (MULTIPLIER_COLORS || fallback)
  const colorDef = (MULTIPLIER_COLORS && MULTIPLIER_COLORS[multiplier])
    || { fill: "#ffcc00", glow: "rgba(255,200,0,0.3)" };
  const fillColor = colorDef.fill;
  const glowColor = colorDef.glow;

  // 빛나는 원 (배수별 색상)
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0,   "#ffffff");
  grd.addColorStop(0.4, fillColor);
  grd.addColorStop(1,   fillColor);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // 광채 링 (배수별 색상)
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // 배수 레이블 (명세 §2-1: 흰색 굵은 폰트, 원 중앙)
  const fontSize = Math.round(CELL * 0.55);
  ctx.fillStyle    = "#ffffff";
  ctx.font         = `bold ${fontSize}px 'Courier New', monospace`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${multiplier}×`, cx, cy);
}

/** HUD 업데이트 — BF-530 s2 §5-3 양쪽 점수 */
function updateHUD() {
  hudPlayerScoreEl.textContent = state.score;
  if (hudScoreValueEl) hudScoreValueEl.textContent = state.score; // BF-504 하위 호환
  hudCPUScoreEl.textContent    = state.cpuScore;
  hudHighEl.textContent        = state.highScore;
}

// ─────────────────────────────────────────────────────────────
// BF-560: HUD 상태 패널 갱신 (길이·속도) — 명세 §5-1, §7-5
// ─────────────────────────────────────────────────────────────

/** 직전 속도 레벨 (속도 변경 감지용) */
let _prevSpeedLevel = "NORMAL";

/**
 * HUD 상태 패널 갱신 — 길이 + 속도 레벨 도트.
 * render() 에서 매 프레임 호출 → 60fps 끊김 없이 갱신 (AC-1).
 */
function updateHUDStatus() {
  if (!hudSnakeLengthEl || !hudSpeedLevelEl) return;

  // 길이
  hudSnakeLengthEl.textContent = state.snake ? state.snake.length : 3;

  // 속도 레벨
  const newLevel = getSpeedLevel(state.speedStack || [], "player");
  const dots     = getSpeedDots(newLevel);

  hudSpeedLevelEl.textContent          = dots;
  hudSpeedLevelEl.setAttribute("data-speed", newLevel);

  // 속도 변경 시 speed-change-flash 클래스 토글 (명세 §7-5)
  if (newLevel !== _prevSpeedLevel) {
    hudSpeedLevelEl.classList.remove("speed-change-flash");
    void hudSpeedLevelEl.offsetWidth;    // reflow — 애니메이션 재시작
    hudSpeedLevelEl.classList.add("speed-change-flash");
    _prevSpeedLevel = newLevel;
  }
}

// ─────────────────────────────────────────────────────────────
// 배수 통계 패널 업데이트 — BF-533 (명세 §7-3, §7-4)
// ─────────────────────────────────────────────────────────────

/** 배수별 실제 등장 확률 계산 (명세 §7-3) */
function calcSpawnProb(multiplierStats, m) {
  const total = Object.values(multiplierStats).reduce((s, v) => s + v.spawned, 0);
  if (total === 0) return "—";
  const prob = (multiplierStats[String(m)].spawned / total * 100).toFixed(1);
  return `${prob}%`;
}

/** 통계 패널 DOM 갱신 (명세 §7-4: 스폰 직후 즉시 갱신) */
function updateMultiplierStatsUI() {
  const stats = state.multiplierStats;
  if (!stats) return;
  for (const m of [1, 2, 4, 8]) {
    const countEl = document.getElementById(`ms-count-${m}`);
    const probEl  = document.getElementById(`ms-prob-${m}`);
    if (!countEl || !probEl) continue;
    countEl.textContent = stats[String(m)].spawned;
    probEl.textContent  = `(${calcSpawnProb(stats, m)})`;
  }
}

/** 전체 프레임 렌더 */
function render() {
  if (RENDER_BACKEND === "pixi") {
    // BF-595: pixi 렌더 백엔드 — scene graph 갱신 + renderer.render()
    SnakeRenderer.renderFrame(state);
  } else {
    // Canvas2D 폴백 경로 (롤백 가능 — BF-595 §3-5, §8)
    drawBackground();
    drawFood();
    drawItem();           // BF-545: 보드 위 아이템 렌더링
    drawSnake();
    drawCpuSnake();
    drawExtraCpus();      // BF-584: 추가 CPU 지렁이 렌더링
  }
  // DOM HUD — 백엔드 무관 (캔버스 밖 DOM — 불변)
  updateHUD();
  updateHUDStatus();    // BF-560: 길이·속도 HUD (60fps 실시간)
  updateMultiplierStatsUI();
  updateBuffBar();      // BF-545: 버프 상태바 (즉시발동 효과 타이머)
  updateItemSlotHUD();  // BF-545: 보유 아이템 슬롯 HUD
  // BF-579: HUD 남은 시간 + ⚙ 진입 버튼 disabled 상태 갱신
  if (typeof updateHUDTimeRemaining === "function") updateHUDTimeRemaining();
  if (typeof updateSettingsTriggerState === "function") updateSettingsTriggerState();
}

// ─────────────────────────────────────────────────────────────
// Game Over / 결과 오버레이 처리 — BF-530 s2 §5-4
// BF-560: 통계 화면 확장 (신기록·플레이 시간·아이템 카운트)
// ─────────────────────────────────────────────────────────────
function showGameOver() {
  // 결과 텍스트 + 색상 (s2 §5-4)
  const resultMap = {
    player_win: { text: "YOU WIN",  color: "#4cff80"  },
    cpu_win:    { text: "YOU LOSE", color: "#ff4c4c"  },
    draw:       { text: "DRAW",     color: "#ffcc44"  },
  };
  const info = resultMap[state.result] || { text: "GAME OVER", color: "#cc2200" };
  goResultEl.textContent  = info.text;
  goResultEl.style.color  = info.color;
  goScoreEl.textContent    = state.score;
  goCPUScoreEl.textContent = state.cpuScore;

  // ── BF-560: 최고 점수 비교 + 신기록 표시 (명세 §5-3) ────────
  const prevHighScore = loadHighScore();        // 현재 세션 이전 최고 점수
  const isNewRecord   = state.score > prevHighScore;

  saveHighScore(state.highScore);               // 최고 점수 영속화

  if (goNewRecordEl) {
    if (isNewRecord && prevHighScore > 0) {
      // 신기록 배지 + 이전 최고 점수 표시 (명세 §5-3)
      goNewRecordEl.removeAttribute("hidden");
      goScoreEl.style.color = "#ffcc00";
      goScoreEl.style.fontWeight = "700";
      if (goPrevHighScoreEl) {
        goPrevHighScoreEl.textContent = `이전 기록: ${prevHighScore}점`;
        goPrevHighScoreEl.removeAttribute("hidden");
      }
    } else {
      goNewRecordEl.setAttribute("hidden", "");
      goScoreEl.style.color      = "";
      goScoreEl.style.fontWeight = "";
      if (goPrevHighScoreEl) goPrevHighScoreEl.setAttribute("hidden", "");
    }
  }

  // ── BF-560: 플레이 시간 표시 (명세 §5-3) ────────────────────
  if (goPlayTimeEl) {
    const survivedMs = Math.max(0, Math.round(performance.now() - gameStartTs - totalPausedMs));
    goPlayTimeEl.textContent = `플레이 시간: ${formatPlayTime(survivedMs)}`;
  }

  // ── BF-560: 아이템 통계 갱신 (명세 §5-3) ────────────────────
  if (goItemStatsEl) {
    const iStats = state.itemStats || {};
    const itemTypes = ["SPEED_UP", "SLOW_DOWN", "LENGTH_BURST", "SHIELD", "REVERSE"];
    itemTypes.forEach((type) => {
      const li    = goItemStatsEl.querySelector(`li[data-item-type="${type}"]`);
      if (!li) return;
      const count = iStats[type]?.acquired || 0;
      li.setAttribute("data-item-count", String(count));
      const countEl = li.querySelector(".go-item-count");
      if (countEl) countEl.textContent = `×${count}`;
    });
  }

  // ── BF-560: HUD KPI 기록 ──────────────────────────────────
  try {
    const survivedMs = Math.max(0, Math.round(performance.now() - gameStartTs - totalPausedMs));
    const hudKpi = {
      timestamp:    Date.now(),
      playTimeMs:   survivedMs,
      finalScore:   state.score,
      highScore:    state.highScore,
      isNewRecord,
      snakeLength:  state.snake ? state.snake.length : 0,
    };
    localStorage.setItem("bf-snake-hud-kpi", JSON.stringify(hudKpi));
    console.log(`[BF-560 KPI] 플레이 시간: ${formatPlayTime(survivedMs)} | 최종 점수: ${state.score} | 최고 점수: ${state.highScore} | 신기록: ${isNewRecord}`);
  } catch (_) { /* private mode — 무시 */ }

  goOverlay.removeAttribute("hidden");
  logKPI();
  logItemKPI();  // BF-545: 아이템 KPI 세션 기록
  // BF-595: render FPS KPI 집계 (게임 종료 시 1회)
  _flushFpsKpi();
}

function hideGameOver() {
  goOverlay.setAttribute("hidden", "");
}

// ─────────────────────────────────────────────────────────────
// PAUSED 오버레이 처리 — BF-524
// ─────────────────────────────────────────────────────────────
function showPaused() {
  pausedOverlay.removeAttribute("hidden");
}

function hidePaused() {
  pausedOverlay.setAttribute("hidden", "");
}

/** 멈춤/재개 토글 — playing ↔ paused.
 *  playing 이 아닌 상태 (gameover 등) 에서는 동작 안 함 (AC §3).
 *  BF-526 AC §4: 토글 횟수 · 누적 멈춤 시간 KPI 를 sessionStorage + console 에 기록.
 */
function togglePause() {
  if (state.status === "playing") {
    // 게임 루프 즉시 중단
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // KPI: 멈춤 시작 타임스탬프 기록 + 토글 횟수 증가
    pauseToggleCount++;
    pauseStartTs = performance.now();

    state = Object.assign({}, state, { status: "paused" });
    render();      // 현재 프레임 유지 (지렁이·먹이 고정)
    showPaused();
  } else if (state.status === "paused") {
    // KPI: 누적 멈춤 시간 계산 → sessionStorage 저장 + console 기록
    const pausedMs = performance.now() - pauseStartTs;
    totalPausedMs += pausedMs;
    try {
      sessionStorage.setItem(
        SS_PAUSE_KPI_KEY,
        JSON.stringify({ toggleCount: pauseToggleCount, totalPausedMs: Math.round(totalPausedMs) }),
      );
    } catch (_) {
      // private mode 등 — 무시
    }

    hidePaused();
    state = Object.assign({}, state, { status: "playing" });
    // BF-545: 일시정지 해제 시 tick accumulator 리셋 (긴 정지 후 burst 방지)
    playerTickAccum = 0;
    cpuTickAccum    = 0;
    startLoop();   // lastTs 리셋 후 RAF 재시작 → 위치·방향·점수 보존
  }
}

// ─────────────────────────────────────────────────────────────
// 게임 루프 (rAF + 틱 타이머) — BF-530: tickFull → BF-545: tickWithItems
// ─────────────────────────────────────────────────────────────
function loop(ts) {
  if (state.status !== "playing") return;

  rafId = requestAnimationFrame(loop);

  // BF-545: elapsed 를 각 entity accumulator 에 누적 (최대 200ms 캡)
  const elapsed = Math.min(ts - lastTs, 200);
  lastTs = ts;

  // BF-595: FPS KPI 프레임 추적 (실제 프레임 간격)
  if (_fpsLastTs > 0) _trackFrame(ts - _fpsLastTs);
  _fpsLastTs = ts;

  playerTickAccum += elapsed;
  cpuTickAccum    += elapsed;

  // ── 속도 효과 틱 간격 계산 ─────────────────────────────────
  const playerSpeedStack  = (state.speedStack || []).filter(e => e.target === "player");
  const hasPlayerSpeedUp  = playerSpeedStack.some(e => e.type === "SPEED_UP");
  const hasPlayerSlowDown = playerSpeedStack.some(e => e.type === "SLOW_DOWN");
  const playerTickInterval = hasPlayerSpeedUp  ? TICK_MS / 2
                           : hasPlayerSlowDown ? TICK_MS * 2
                           : TICK_MS;

  const cpuSpeedStack  = (state.speedStack || []).filter(e => e.target === "cpu");
  const hasCpuSpeedUp  = cpuSpeedStack.some(e => e.type === "SPEED_UP");
  const hasCpuSlowDown = cpuSpeedStack.some(e => e.type === "SLOW_DOWN");
  const cpuTickInterval = hasCpuSpeedUp  ? TICK_MS / 2
                        : hasCpuSlowDown ? TICK_MS * 2
                        : TICK_MS;

  const movePlayer = playerTickAccum >= playerTickInterval;
  const moveCpu    = cpuTickAccum    >= cpuTickInterval;

  if (!movePlayer && !moveCpu) {
    render();
    return;
  }

  if (movePlayer) playerTickAccum = Math.max(0, playerTickAccum - playerTickInterval);
  if (moveCpu)    cpuTickAccum    = Math.max(0, cpuTickAccum    - cpuTickInterval);

  // T5: 제한 시간 초과 → 점수 비교 (s2 §2, §3-2)
  // BF-579: settings.timeLimitSec === null 이면 무제한 — 만료 검사 skip
  const survivedMs = performance.now() - gameStartTs - totalPausedMs;
  const timeLimitMs = (currentSettings && currentSettings.timeLimitSec != null)
    ? currentSettings.timeLimitSec * 1000
    : Infinity;
  if (timeLimitMs !== Infinity && survivedMs >= timeLimitMs) {
    cancelAnimationFrame(rafId);
    rafId = null;
    let result;
    if      (state.score > state.cpuScore) result = "player_win";
    else if (state.score < state.cpuScore) result = "cpu_win";
    else                                    result = "draw";
    state = Object.assign({}, state, {
      status:     "gameover",
      result,
      deathCause: "timeout",
      highScore:  Math.max(state.highScore, state.score),
    });
    render();
    playGameOverSound(); // BF-567: 효과음 (AC-2)
    showGameOver();
    return;
  }

  // ── BF-545: 아이템 스폰 타이머 (명세 §6-1) ─────────────────
  // BF-579: ITEMS_ENABLED 대신 settings.itemsEnabled 사용
  const nowMs = Date.now();
  const itemsOn = currentSettings.itemsEnabled === true && currentSettings.itemSpawnRate > 0;
  if (itemsOn && state.item === null
      && nextItemSpawnTs > 0 && nowMs >= nextItemSpawnTs) {
    const cell = spawnItemCell(state.cols, state.rows, state.snake, state.cpu, state.food);
    if (cell !== null) {
      const itype  = pickItemType();
      const iStats = state.itemStats || createItemStats();
      state = {
        ...state,
        item: {
          type:      itype,
          x:         cell.x,
          y:         cell.y,
          spawnedAt: nowMs,
          expiresAt: nowMs + ITEM_LIFESPAN_MS,
        },
        itemStats: {
          ...iStats,
          [itype]: { ...iStats[itype], spawned: (iStats[itype]?.spawned || 0) + 1 },
        },
      };
    }
    // 다음 스폰 예약 (스폰 성공 여부 무관)
    // BF-579 §2-2: itemSpawnRate 가 높을수록 스폰 빈도↑.
    //   rate=0.5 가 기본값 — 기존 25~35초 간격을 1배로 매핑 (회귀 안정성).
    //   rate=1.0 → 0.5배 간격 (자주), rate=0.1 → 5배 간격 (드물게)
    const baseIvMs = ITEM_SPAWN_INTERVAL_MIN_MS
      + Math.random() * (ITEM_SPAWN_INTERVAL_MAX_MS - ITEM_SPAWN_INTERVAL_MIN_MS);
    const rate     = Math.max(0.01, currentSettings.itemSpawnRate);
    const ivMs     = baseIvMs * (0.5 / rate);
    nextItemSpawnTs = nowMs + ivMs;
  }

  // ── 게임 틱 — tickWithItems (BF-545; 이전: tickFull(state)) ─────────────────────
  const prevFood     = state.food;           // BF-537: 수집 감지용 스냅샷
  const prevItem     = state.item;           // BF-545: 아이템 획득 감지용
  const prevAcqCount = prevItem
    ? (state.itemStats?.[prevItem.type]?.acquired || 0)
    : 0;

  state = tickWithItems(state, nowMs, movePlayer, moveCpu);

  // BF-584: 추가 CPU 지렁이 (extraCpus) 1 틱 이동 — main CPU 와 동일 간격 (moveCpu 일 때만)
  if (moveCpu) tickExtraCpus();

  // BF-537: 먹이 수집 감지 → 이팩트 트리거 (명세 §6-4)
  if (prevFood !== null && state.food !== prevFood) {
    const { x, y, multiplier } = prevFood;
    triggerEffect(x * CELL + CELL / 2, y * CELL + CELL / 2, multiplier);
    playEatSound(); // BF-567: 효과음 (AC-2)
  }

  // BF-545: 아이템 획득 감지 → 이팩트 + 토스트 (명세 §6-6)
  if (prevItem !== null && state.item === null) {
    const itype   = prevItem.type;
    const currAcq = state.itemStats?.[itype]?.acquired || 0;
    if (currAcq > prevAcqCount) {
      // player 가 아이템 획득
      const cx = prevItem.x * CELL + CELL / 2;
      const cy = prevItem.y * CELL + CELL / 2;
      triggerItemEffect(cx, cy, itype);
      const cssClass = "toast-" + itype.toLowerCase().replace(/_/g, "-");
      if (ITEM_CATEGORY[itype] === "HOLDABLE") {
        maybeShowZHint(itype);
        showToast(itype.replace(/_/g, " ") + " 획득!", cssClass);
      } else {
        const durSec = ITEM_DURATION_MS[itype]
          ? (ITEM_DURATION_MS[itype] / 1000).toFixed(0)
          : "5";
        showToast(itype.replace(/_/g, " ") + " +" + durSec + "s", cssClass);
      }
    }
  }

  render();

  if (state.status === "gameover") {
    cancelAnimationFrame(rafId);
    rafId = null;
    render(); // 최종 프레임
    playGameOverSound(); // BF-567: 효과음 (AC-2)
    showGameOver();
  }
}

function startLoop() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  lastTs = performance.now();
  rafId  = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────
// BF-579: 설정 모달 핸들러 (planner §3, §4 / designer §6-6)
// ─────────────────────────────────────────────────────────────

/** 매 render frame 호출 — HUD 남은 시간 row 갱신 (planner §6-3, designer §5-12). */
function updateHUDTimeRemaining() {
  if (!hudTimeRemainingEl || !hudTimeValueEl) return;
  const limit = currentSettings && currentSettings.timeLimitSec;
  if (limit == null) {
    hudTimeRemainingEl.setAttribute("hidden", "");
    return;
  }
  hudTimeRemainingEl.removeAttribute("hidden");
  // 게임 시작 안 했거나 paused 면 limit 전체 표시
  let elapsedSec;
  if (state && state.status === "playing") {
    const elapsedMs = Math.max(0, performance.now() - gameStartTs - totalPausedMs);
    elapsedSec = Math.floor(elapsedMs / 1000);
  } else {
    elapsedSec = 0;
  }
  const remainSec = Math.max(0, limit - elapsedSec);
  const mm = Math.floor(remainSec / 60);
  const ss = remainSec % 60;
  hudTimeValueEl.textContent =
    String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
}

/** ⚙ 진입 버튼 disabled — state.status === "playing" 시 (planner §3-1, §8-9). */
function updateSettingsTriggerState() {
  if (!settingsTriggerEl) return;
  const isPlaying = state && state.status === "playing";
  if (isPlaying) settingsTriggerEl.setAttribute("disabled", "");
  else           settingsTriggerEl.removeAttribute("disabled");
}

/** 현재 draftSettings 값을 모달 컨트롤에 반영 (planner §4-3). */
function reflectDraftToControls() {
  if (!settingsModalEl) return;
  const d = draftSettings;
  // 라디오 그룹
  settingsModalEl.querySelectorAll(".ctrl-radio-group").forEach((group) => {
    const key = group.getAttribute("data-key");
    if (!key || !(key in d)) return;
    const cur = d[key];
    group.querySelectorAll(".ctrl-radio").forEach((btn) => {
      const v   = btn.getAttribute("data-value");
      let match = false;
      if (key === "timeLimitSec") {
        if (v === "null") match = (cur === null);
        else if (v === "custom") {
          const presets = [null, 60, 180, 300, 600];
          match = (cur !== null && presets.indexOf(cur) < 0);
        } else {
          match = (String(cur) === v);
        }
      } else if (key === "cpuCount" || key === "initialLength") {
        match = (String(cur) === v);
      } else {
        match = (String(cur) === v);
      }
      btn.setAttribute("aria-pressed", match ? "true" : "false");
    });
  });
  // 토글 스위치
  settingsModalEl.querySelectorAll(".ctrl-toggle").forEach((tog) => {
    const key = tog.getAttribute("data-key");
    if (!key || !(key in d)) return;
    const on   = d[key] === true;
    tog.setAttribute("aria-checked", on ? "true" : "false");
    const txt = tog.querySelector(".ctrl-toggle-text");
    if (txt) txt.textContent = on ? "on" : "off";
  });
  // 슬라이더 (itemSpawnRate)
  const slider = settingsModalEl.querySelector('.ctrl-slider input[type="range"][data-key="itemSpawnRate"]');
  if (slider) {
    const tens = Math.round((d.itemSpawnRate || 0) * 10);
    slider.value = String(tens);
    const valEl = slider.parentElement.querySelector(".ctrl-slider-value");
    if (valEl) valEl.textContent = (tens / 10).toFixed(1);
  }
  // 의존 컨트롤 disabled — itemsEnabled = false 면 itemSpawnRate row 회색
  const rateRow = slider ? slider.closest(".ctrl-row") : null;
  if (rateRow) {
    if (d.itemsEnabled) rateRow.removeAttribute("data-disabled");
    else                rateRow.setAttribute("data-disabled", "true");
  }
  // 직접 입력 셀
  const customWrap  = settingsModalEl.querySelector(".ctrl-time-custom");
  const customInput = customWrap ? customWrap.querySelector('input[type="number"]') : null;
  if (customWrap && customInput) {
    const presets = [null, 60, 180, 300, 600];
    const isCustom = (d.timeLimitSec !== null && presets.indexOf(d.timeLimitSec) < 0);
    if (isCustom) {
      customWrap.removeAttribute("hidden");
      customInput.value = String(d.timeLimitSec);
    } else {
      customWrap.setAttribute("hidden", "");
    }
  }
  // 검증 메시지 클리어
  hideValidationMsg();
}

function showValidationMsg(msg) {
  if (!settingsValidationEl) return;
  settingsValidationEl.textContent = msg;
  settingsValidationEl.removeAttribute("hidden");
}
function hideValidationMsg() {
  if (!settingsValidationEl) return;
  settingsValidationEl.setAttribute("hidden", "");
  settingsValidationEl.textContent = "";
}

/** 모달 열기 (planner §3-1). state.status === "playing" 이면 차단. */
function openSettingsModal(source) {
  if (!settingsModalEl) return;
  if (state && state.status === "playing") return;
  // draftSettings 초기화: pendingSettings 우선, 그 다음 currentSettings
  const base = pendingSettings || currentSettings || SNAKE_SETTINGS_DEFAULTS;
  draftSettings = Object.assign({}, base);
  // BF-600: 설정 모달 사운드 토글 — localStorage 에서 복원 (AC-4)
  draftSettings.soundEnabled = loadSettingsSoundEnabled();
  reflectDraftToControls();
  settingsModalEl.removeAttribute("hidden");
  console.log("[BF-579] settings.modal.open source=" + (source || "unknown"));
}

/** 모달 닫기 (no save). */
function closeSettingsModal(outcome) {
  if (!settingsModalEl) return;
  settingsModalEl.setAttribute("hidden", "");
  draftSettings = null;
  console.log("[BF-579] settings.modal.close outcome=" + (outcome || "cancel"));
  // BF-592: 초기 진입 시 (state 미초기화) — 저장/취소 후 게임 시작.
  // state 가 undefined 이면 아직 initGame() 가 실행되지 않은 최초 진입 상태.
  // pendingSettings 는 saveSettingsModal 에서 이미 설정됐을 수 있으므로 initGame() 에서 적용됨.
  if (!state) {
    initGame();
  }
}

/** 검증: 직접 입력 timeLimitSec 등 범위 확인 (BF-582 AC3). */
function validateDraft() {
  if (!draftSettings) return { ok: false, msg: "내부 오류: draft 없음" };
  // 직접 입력 timeLimitSec 검증
  const customWrap  = settingsModalEl ? settingsModalEl.querySelector(".ctrl-time-custom") : null;
  const customInput = customWrap ? customWrap.querySelector('input[type="number"]') : null;
  if (customWrap && !customWrap.hasAttribute("hidden") && customInput) {
    const raw = customInput.value.trim();
    if (raw === "") return { ok: false, msg: "제한 시간을 입력해 주세요." };
    const n = Number(raw);
    const lim = SNAKE_SETTINGS_LIMITS.timeLimitSec;
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, msg: "제한 시간은 정수여야 합니다." };
    }
    if (n < lim.min || n > lim.max) {
      return { ok: false, msg: `제한 시간은 ${lim.min}~${lim.max}초 범위여야 합니다.` };
    }
    draftSettings.timeLimitSec = n;
  }
  // itemSpawnRate 검증
  const lim2 = SNAKE_SETTINGS_LIMITS.itemSpawnRate;
  if (draftSettings.itemSpawnRate < lim2.min || draftSettings.itemSpawnRate > lim2.max) {
    return { ok: false, msg: `아이템 등장 확률은 ${lim2.min}~${lim2.max} 범위여야 합니다.` };
  }
  return { ok: true };
}

/** 모달 저장 — planner §3-3, §8-3. */
function saveSettingsModal() {
  const v = validateDraft();
  if (!v.ok) {
    showValidationMsg(v.msg);
    return;
  }
  // BF-600: 사운드 토글 — 별도 localStorage 키에 영속 (AC-3)
  if (typeof draftSettings.soundEnabled === "boolean") {
    saveSettingsSoundEnabled(draftSettings.soundEnabled);
  }
  const merged = validateAndMergeSettings(draftSettings);
  // localStorage 영속 (validateAndMergeSettings 는 soundEnabled 를 무시하므로 bf-snake-settings 오염 없음)
  if (typeof saveSnakeSettings === "function") {
    saveSnakeSettings(merged);
  } else {
    try {
      localStorage.setItem("bf-snake-settings", JSON.stringify(merged));
    } catch (_) { /* private mode */ }
  }
  // 현재 게임 영향 없음 — 다음 시작 시 적용 (planner §6-1)
  pendingSettings = merged;
  console.log("[BF-579] settings.save snapshot=", JSON.stringify(merged));
  closeSettingsModal("save");
}

/** 기본값 복원 (planner §3-3, §8-6) — draftSettings 만 갱신, 저장은 별도 [저장] 필요. */
function resetSettingsToDefaults() {
  draftSettings = Object.assign({}, SNAKE_SETTINGS_DEFAULTS);
  reflectDraftToControls();
  console.log("[BF-579] settings.reset → defaults");
}

/** 라디오 그룹 클릭 핸들러. */
function handleRadioClick(group, btn) {
  const key = group.getAttribute("data-key");
  if (!key || !draftSettings) return;
  if (btn.hasAttribute("disabled")) return;
  const raw = btn.getAttribute("data-value");
  let value;
  if (key === "timeLimitSec") {
    if (raw === "null") value = null;
    else if (raw === "custom") {
      // 직접 입력 토글 활성화 — 현재 값이 preset 이면 그대로 표시 + custom row 노출
      // value 는 현재 draftSettings.timeLimitSec 유지 (또는 customInput 의 기본값 사용)
      const customInput = settingsModalEl.querySelector('.ctrl-time-custom input[type="number"]');
      const presets = [null, 60, 180, 300, 600];
      let n = draftSettings.timeLimitSec;
      if (n === null || presets.indexOf(n) >= 0) {
        n = customInput ? Number(customInput.value) || 120 : 120;
      }
      value = n;
    } else {
      value = Number(raw);
    }
  } else if (key === "cpuCount" || key === "initialLength") {
    value = Number(raw);
  } else {
    value = raw;
  }
  draftSettings[key] = value;
  reflectDraftToControls();
}

/** 토글 스위치 클릭 핸들러. */
function handleToggleClick(tog) {
  const key = tog.getAttribute("data-key");
  if (!key || !draftSettings) return;
  draftSettings[key] = !(draftSettings[key] === true);
  reflectDraftToControls();
}

/** 슬라이더 input 핸들러 (itemSpawnRate). */
function handleSliderInput(slider) {
  const key = slider.getAttribute("data-key");
  if (!key || !draftSettings) return;
  const tens = Number(slider.value);
  if (!Number.isFinite(tens)) return;
  draftSettings[key] = Math.max(0, Math.min(1, tens / 10));
  reflectDraftToControls();
}

/** 직접 입력 숫자 input 핸들러. */
function handleCustomTimeInput(input) {
  if (!draftSettings) return;
  const n = Number(input.value);
  if (Number.isFinite(n) && Number.isInteger(n)) {
    draftSettings.timeLimitSec = n;
  }
  // 검증 메시지는 [저장] 시 표시 — 즉시 표시는 거슬림
}

// 모달 진입 이벤트
if (settingsTriggerEl) {
  settingsTriggerEl.addEventListener("click", () => {
    if (settingsTriggerEl.hasAttribute("disabled")) return;
    openSettingsModal("start");
  });
}
if (pausedBtnSettingsEl) {
  pausedBtnSettingsEl.addEventListener("click", () => {
    if (state && state.status === "paused") {
      openSettingsModal("pause");
    }
  });
}
// 모달 내부 컨트롤 이벤트 (위임)
if (settingsModalEl) {
  settingsModalEl.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target === settingsOverlayEl) {
      closeSettingsModal("cancel");
      return;
    }
    const radio = target.closest(".ctrl-radio");
    if (radio) {
      const group = radio.closest(".ctrl-radio-group");
      if (group) handleRadioClick(group, radio);
      return;
    }
    const tog = target.closest(".ctrl-toggle");
    if (tog) {
      handleToggleClick(tog);
      return;
    }
  });
  settingsModalEl.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === "range") {
      handleSliderInput(target);
    } else if (target.type === "number") {
      handleCustomTimeInput(target);
    }
  });
}
if (settingsCloseEl)     settingsCloseEl.addEventListener("click", () => closeSettingsModal("cancel"));
if (settingsBtnCancelEl) settingsBtnCancelEl.addEventListener("click", () => closeSettingsModal("cancel"));
if (settingsBtnSaveEl)   settingsBtnSaveEl.addEventListener("click", () => saveSettingsModal());
if (settingsBtnResetEl)  settingsBtnResetEl.addEventListener("click", () => resetSettingsToDefaults());

// ─────────────────────────────────────────────────────────────
// 게임 초기화 / 재시작
// ─────────────────────────────────────────────────────────────
function initGame() {
  resizeCanvas();
  const { cols, rows } = getGridSize();
  const hs = loadHighScore();
  // BF-579: pendingSettings 가 있으면 적용 (start trigger 시점)
  if (pendingSettings) {
    currentSettings = pendingSettings;
    pendingSettings = null;
  }
  state = createInitialState(cols, rows, hs, currentSettings);
  // BF-595: pixi 렌더러 초기화 (최초 initGame 시 1회)
  if (RENDER_BACKEND === "pixi") {
    const ok = SnakeRenderer.init(canvas, canvas.width, canvas.height);
    if (!ok) {
      // pixi 초기화 실패 → canvas2d 폴백 (전역 RENDER_BACKEND 는 const 이므로 런타임 경고만)
      console.warn("[BF-595] SnakeRenderer.init 실패 — canvas2d draw* 로 동작");
    }
  }
  // BF-595: KPI 리셋 (새 게임마다)
  _resetFpsKpi();
  hideGameOver();
  updateSoundToggleUI(soundEnabled); // BF-567: localStorage 복원값으로 UI 초기화
  updateHUDTimeRemaining();           // BF-579: HUD 남은 시간 row 갱신
  updateSettingsTriggerState();       // BF-579: playing 중 disabled
  // KPI 타이머 시작
  gameStartTs      = performance.now();
  totalPausedMs    = 0;
  // BF-545: tick accumulator 리셋 + 아이템 스폰 타이머 (게임 시작 20초 후 첫 스폰)
  playerTickAccum  = 0;
  cpuTickAccum     = 0;
  nextItemSpawnTs  = (currentSettings.itemsEnabled && currentSettings.itemSpawnRate > 0)
    ? performance.now() + ITEM_FIRST_SPAWN_DELAY_MS
    : -1;
  console.log("[BF-579] game.start effectiveSettings:", JSON.stringify(currentSettings));
  render();
  startLoop();
}

function doRestart() {
  hideGameOver();
  // BF-567 EC-04: 진행 중인 gameover 효과음 중단
  if (_gameoverOsc) {
    try { _gameoverOsc.stop(); } catch (_) {}
    _gameoverOsc = null;
  }
  // KPI 초기화 — 새 게임마다 리셋 (BF-526 AC §4 + BF-530)
  pauseToggleCount = 0;
  pauseStartTs     = 0;
  totalPausedMs    = 0;
  gameStartTs      = performance.now();
  // BF-537: 이팩트 카운트 리셋
  for (const k of ["1", "2", "4", "8"]) effectTriggerCount[k] = 0;
  // BF-579: pendingSettings 적용 (저장된 변경분 다음 게임에 반영)
  if (pendingSettings) {
    currentSettings = pendingSettings;
    pendingSettings = null;
  }
  // BF-545: tick accumulator + 아이템 스폰 타이머 리셋
  playerTickAccum  = 0;
  cpuTickAccum     = 0;
  nextItemSpawnTs  = (currentSettings.itemsEnabled && currentSettings.itemSpawnRate > 0)
    ? performance.now() + ITEM_FIRST_SPAWN_DELAY_MS
    : -1;
  state = restartGame(state, currentSettings);
  saveHighScore(state.highScore);
  updateHUDTimeRemaining();           // BF-579
  updateSettingsTriggerState();       // BF-579
  console.log("[BF-579] game.start effectiveSettings:", JSON.stringify(currentSettings));
  startLoop();
}

// ─────────────────────────────────────────────────────────────
// 키보드 이벤트
// ─────────────────────────────────────────────────────────────
const KEY_DIR = {
  ArrowUp:    DIR.UP,
  ArrowDown:  DIR.DOWN,
  ArrowLeft:  DIR.LEFT,
  ArrowRight: DIR.RIGHT,
  // WASD 지원 — BF-514 AC §2
  w: DIR.UP,    W: DIR.UP,
  s: DIR.DOWN,  S: DIR.DOWN,
  a: DIR.LEFT,  A: DIR.LEFT,
  d: DIR.RIGHT, D: DIR.RIGHT,
};

// ─────────────────────────────────────────────────────────────
// BF-560: 일시정지 모달 버튼 이벤트 핸들러 (명세 §5-2)
// ─────────────────────────────────────────────────────────────
if (pausedBtnResumeEl) {
  pausedBtnResumeEl.addEventListener("click", () => {
    if (state.status === "paused") togglePause();
  });
}
if (pausedBtnRestartEl) {
  pausedBtnRestartEl.addEventListener("click", () => {
    if (state.status === "paused") {
      hidePaused();
      state = Object.assign({}, state, { status: "playing" });
      doRestart();
    }
  });
}
if (pausedBtnQuitEl) {
  pausedBtnQuitEl.addEventListener("click", () => {
    if (state.status === "paused") {
      hidePaused();
      // 종료: 게임 오버 상태로 전환 후 통계 화면 표시
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      state = Object.assign({}, state, {
        status:    "gameover",
        result:    null,
        deathCause: "quit",
        highScore: Math.max(state.highScore, state.score),
      });
      render();
      showGameOver();
    }
  });
}

window.addEventListener("keydown", (e) => {
  // ⓪ BF-579: 설정 모달이 열려 있으면 Esc/Enter 만 받음 — 방향키 / 다른 단축키 차단 (planner EC-7)
  if (settingsModalEl && !settingsModalEl.hasAttribute("hidden")) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSettingsModal("cancel");
    } else if (e.key === "Enter" || e.code === "Enter") {
      // Enter 가 input 안에서 발생하면 form 동작 방지
      e.preventDefault();
      saveSettingsModal();
    }
    return;
  }

  // ① 게임 오버 상태: Space → 재시작, S → 설정 모달 (AC §3 + BF-579 §3-1)
  if (state.status === "gameover") {
    if (e.code === "Space") {
      e.preventDefault();
      doRestart();
    } else if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      openSettingsModal("hotkey");
    }
    return;
  }

  // ② 멈춤/재개 토글 — playing 또는 paused 상태에서만 (AC §1, §2)
  //    BF-560: P키 추가 지원 (명세 AC-2)
  if (e.code === "Space" || e.code === "KeyP") {
    e.preventDefault();
    togglePause();
    return;
  }

  // ② 일시정지 중 R키 → 재시작, Q키 → 종료, S키 → 설정 모달 (BF-560 + BF-579 §3-1)
  if (state.status === "paused") {
    if (e.code === "KeyR") {
      e.preventDefault();
      hidePaused();
      state = Object.assign({}, state, { status: "playing" });
      doRestart();
    } else if (e.code === "KeyQ") {
      e.preventDefault();
      hidePaused();
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      state = Object.assign({}, state, {
        status:    "gameover",
        result:    null,
        deathCause: "quit",
        highScore: Math.max(state.highScore, state.score),
      });
      render();
      showGameOver();
    } else if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      openSettingsModal("hotkey");
    }
    return;
  }

  // ③ Z 키 — 보유 아이템 발동 (BF-545, 명세 §8-2)
  if (state.status === "playing" && (e.key === "z" || e.key === "Z")) {
    e.preventDefault();
    if (state.heldItem) {
      const heldType = state.heldItem.type;
      const cx = state.snake[0].x * CELL + CELL / 2;
      const cy = state.snake[0].y * CELL + CELL / 2;
      state = useHeldItem(state);
      triggerItemEffect(cx, cy, heldType);
      showToast(
        heldType.replace(/_/g, " ") + " 발동!",
        "toast-" + heldType.toLowerCase().replace(/_/g, "-"),
      );
      updateItemSlotHUD();
    }
    return;
  }

  // ④ 방향키는 playing 상태에서만 허용 (paused 중 방향 변경 불가)
  if (state.status === "playing") {
    const dir = KEY_DIR[e.key];
    if (dir) {
      e.preventDefault();
      state = changeDirection(state, dir);
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 창 크기 변경 — 격자 재계산 후 재시작
// ─────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  resizeCanvas();
  const { cols, rows } = getGridSize();
  const hs = Math.max(state.highScore, loadHighScore());
  // BF-579: 현재 게임의 settings 를 그대로 사용 — resize 가 settings 적용 시점은 아님
  state = createInitialState(cols, rows, hs, currentSettings);
  if (rafId !== null) cancelAnimationFrame(rafId);
  hideGameOver();
  gameStartTs      = performance.now();
  totalPausedMs    = 0;
  // BF-545: tick accumulator + 아이템 스폰 타이머 리셋
  playerTickAccum  = 0;
  cpuTickAccum     = 0;
  nextItemSpawnTs  = (currentSettings.itemsEnabled && currentSettings.itemSpawnRate > 0)
    ? performance.now() + ITEM_FIRST_SPAWN_DELAY_MS
    : -1;
  updateHUDTimeRemaining();           // BF-579
  startLoop();
});

// ─────────────────────────────────────────────────────────────
// 엔트리
// ─────────────────────────────────────────────────────────────
// BF-592: 게임 진입 시 설정창 자동 오픈.
// state 가 미초기화(undefined) 상태에서 openSettingsModal("entry") 호출 →
//   state && state.status === "playing" 조건이 false → 조기 리턴 없이 draftSettings 정상 초기화.
// 사용자가 저장(save) 또는 취소(cancel/Esc/오버레이클릭) 시
//   closeSettingsModal 내 !state 가드가 initGame() 을 호출해 게임 시작.
openSettingsModal("entry");
