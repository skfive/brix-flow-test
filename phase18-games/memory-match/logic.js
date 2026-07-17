/* BF-919 · 메모리 매치 순수 로직 (셔플·초기상태·뒤집기·판정)
 * 기획 SSOT: docs/plan/memory-match-BF-916.md §2~§6 (게임 규칙·상태 모델·순수 함수 contract)
 * 디자인 SSOT: docs/design/memory-match-BF-916.md (시각 계약)
 * file:// CORS 안전 — ES module / 원격 요청 / 외부 CDN / 영속 저장 0건
 * UMD 패턴 — 브라우저: globalThis.MemoryMatchLogic, Node: module.exports (node --test 대상)
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MemoryMatchLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var PAIR_COUNT = 8; // 8쌍 = 16장 (planner §2.1)

  /**
   * Fisher-Yates 셔플 (원본 비변경, 새 배열 반환) — planner §6.1
   * @param {Array} array
   * @param {() => number} [rng] 0~1 난수 생성기 (기본 Math.random)
   * @returns {Array} 셔플된 새 배열
   */
  function shuffle(array, rng) {
    var random = typeof rng === "function" ? rng : Math.random;
    var out = array.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /**
   * 카드 덱 생성 (셔플 포함) — planner §6.1
   * @param {number} pairCount 쌍 개수 (본 게임 고정값 8)
   * @param {() => number} [rng] 결정적 테스트용 난수 주입 가능
   * @returns {Array<{id:number, pairId:number, state:'hidden'}>} 길이 16 배열(셔플됨)
   */
  function createDeck(pairCount, rng) {
    var count = typeof pairCount === "number" ? pairCount : PAIR_COUNT;
    var cards = [];
    for (var p = 0; p < count; p++) {
      cards.push({ pairId: p });
      cards.push({ pairId: p });
    }
    var shuffled = shuffle(cards, rng);
    // 셔플 후 안정적 id 부여 (id = 보드 위치 0~15)
    return shuffled.map(function (c, index) {
      return { id: index, pairId: c.pairId, state: "hidden" };
    });
  }

  /**
   * 초기 게임 상태 생성 — planner §3.4 / §6.1
   * @param {Array} deck createDeck() 반환값
   * @returns {object} status:'idle', moves:0, matchedPairs:0, startedAt:null
   */
  function createInitialState(deck) {
    return {
      status: "idle",
      deck: deck.map(function (c) {
        return { id: c.id, pairId: c.pairId, state: c.state || "hidden" };
      }),
      revealedIds: [],
      moves: 0,
      matchedPairs: 0,
      startedAt: null,
      finishedAt: null,
    };
  }

  // 상태 얕은 복제 (불변 — 원본 미변경) : deck 카드도 새 객체로 복제
  function cloneState(state) {
    return {
      status: state.status,
      deck: state.deck.map(function (c) {
        return { id: c.id, pairId: c.pairId, state: c.state };
      }),
      revealedIds: state.revealedIds.slice(),
      moves: state.moves,
      matchedPairs: state.matchedPairs,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
    };
  }

  function findCard(deck, cardId) {
    for (var i = 0; i < deck.length; i++) {
      if (deck[i].id === cardId) return deck[i];
    }
    return null;
  }

  /**
   * 카드 클릭 처리 (1장 뒤집기) — planner §6.1 / §6.2
   * @param {object} state 현재 게임 상태
   * @param {number} cardId 클릭된 카드 id
   * @param {number} [now] 현재 시각(ms) — 최초 flip 시 startedAt 기록용
   * @returns {object} 새 게임 상태 (불변 — 원본 미변경)
   */
  function flipCard(state, cardId, now) {
    // checking(판정 대기) 중이면 입력 무시 (EC-02)
    if (state.status === "checking" || state.status === "won") {
      return state;
    }
    var next = cloneState(state);
    var card = findCard(next.deck, cardId);
    // 대상 카드가 hidden 이 아니면 no-op (EC-01)
    if (!card || card.state !== "hidden") {
      return state;
    }
    // 이미 2장 공개 중이면 무시 (안전장치, checking 이 아닌 경우는 없어야 함)
    if (next.revealedIds.length >= 2) {
      return state;
    }

    card.state = "revealed";
    next.revealedIds.push(card.id);

    if (next.status === "idle") {
      // 최초 flip — 타이머 시작
      next.status = "playing";
      next.startedAt = typeof now === "number" ? now : Date.now();
    }

    if (next.revealedIds.length === 2) {
      // 2번째 카드 공개 시점 — 이동 횟수 +1, 판정 대기
      next.moves += 1;
      next.status = "checking";
    }

    return next;
  }

  /**
   * checking 상태의 두 카드 판정 — planner §6.1 / §6.2
   * @param {object} state status==='checking' 인 게임 상태
   * @param {number} [now] 현재 시각(ms) — 승리 시 finishedAt 기록용
   * @returns {object} 새 게임 상태
   */
  function evaluateCheck(state, now) {
    if (state.status !== "checking" || state.revealedIds.length !== 2) {
      return state;
    }
    var next = cloneState(state);
    var a = findCard(next.deck, next.revealedIds[0]);
    var b = findCard(next.deck, next.revealedIds[1]);

    if (a.pairId === b.pairId) {
      // 일치 — matched 고정
      a.state = "matched";
      b.state = "matched";
      next.matchedPairs += 1;
      next.revealedIds = [];
      if (next.matchedPairs === PAIR_COUNT) {
        next.status = "won";
        next.finishedAt = typeof now === "number" ? now : Date.now();
      } else {
        next.status = "playing";
      }
    } else {
      // 불일치 — 두 카드 hidden 복귀
      a.state = "hidden";
      b.state = "hidden";
      next.revealedIds = [];
      next.status = "playing";
    }

    return next;
  }

  var GRID_COLS = 4; // 4x4 보드 (design §4.2)

  /**
   * 방향키 이동 목표 인덱스 계산 (그리드 경계 클램프) — BF-956 / design §4.2
   * DOM 순서 = 시각 격자 순서 = 인덱스 순서 전제. 카드 상태는 건드리지 않음(포커스만).
   * 가장자리에서 바깥 방향은 원 인덱스 유지(래핑 없음, planner AC-K02).
   * @param {number} index 현재 활성 인덱스 (0 ~ total-1)
   * @param {'up'|'down'|'left'|'right'} direction 이동 방향
   * @param {number} [cols] 열 수 (기본 4)
   * @param {number} [total] 카드 수 (기본 16)
   * @returns {number} 이동 후 인덱스 (경계/무효 입력이면 원 인덱스)
   */
  function nextIndex(index, direction, cols, total) {
    var columns = typeof cols === "number" && cols > 0 ? cols : GRID_COLS;
    var count = typeof total === "number" && total > 0 ? total : PAIR_COUNT * 2;
    var rows = Math.ceil(count / columns);
    // 범위 밖 인덱스는 안전하게 원값 유지
    if (typeof index !== "number" || index < 0 || index >= count) return index;

    var row = Math.floor(index / columns);
    var col = index % columns;

    switch (direction) {
      case "right": col = Math.min(col + 1, columns - 1); break;
      case "left": col = Math.max(col - 1, 0); break;
      case "down": row = Math.min(row + 1, rows - 1); break;
      case "up": row = Math.max(row - 1, 0); break;
      default: return index; // 알 수 없는 방향 = no-op
    }

    var target = row * columns + col;
    // 마지막 행이 꽉 차지 않은 경우(본 게임은 4x4 로 항상 꽉 참) 범위 밖이면 클램프
    return target < count ? target : index;
  }

  return {
    PAIR_COUNT: PAIR_COUNT,
    GRID_COLS: GRID_COLS,
    shuffle: shuffle,
    createDeck: createDeck,
    createInitialState: createInitialState,
    flipCard: flipCard,
    evaluateCheck: evaluateCheck,
    nextIndex: nextIndex,
  };
});
