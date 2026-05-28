/* rps/logic.js — 가위바위보 순수 로직
 * BF-648 · docs/design/rps-BF-645.md §10.5
 * UMD 패턴 — 브라우저: globalThis.RpsLogic, Node: module.exports
 * file:// CORS 안전 — 외부 CDN·fetch 0건
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RpsLogic = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ─── 상수 ─── */
  var CHOICES = {
    scissors: { emoji: '✌️', name: '가위' },
    rock:     { emoji: '✊', name: '바위' },
    paper:    { emoji: '🖐', name: '보'  },
  };

  var RESULTS = {
    win:  { text: 'WIN!',  icon: '🎉', dataResult: 'win'  },
    lose: { text: 'LOSE',  icon: '😤', dataResult: 'lose' },
    draw: { text: 'DRAW',  icon: '🤝', dataResult: 'draw' },
  };

  /** CPU 랜덤 선택 */
  function cpuPick() {
    var keys = Object.keys(CHOICES);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  /**
   * 승패 판정 (명세 §7.1 9가지 판정 표)
   * @param {string} player - 'scissors'|'rock'|'paper'
   * @param {string} cpu    - 'scissors'|'rock'|'paper'
   * @returns {'win'|'lose'|'draw'}
   */
  function judge(player, cpu) {
    if (player === cpu) return 'draw';
    if (
      (player === 'scissors' && cpu === 'paper')    ||
      (player === 'rock'     && cpu === 'scissors') ||
      (player === 'paper'    && cpu === 'rock')
    ) return 'win';
    return 'lose';
  }

  /**
   * 점수 스토어 팩토리 (localStorage 추상화 — 명세 §9)
   * @param {Storage} storage - localStorage 또는 테스트용 mock
   */
  function createScoreStore(storage) {
    var KEY = 'rps:score';
    var DEFAULT = { win: 0, draw: 0, lose: 0 };

    return {
      load: function () {
        try {
          var raw = storage.getItem(KEY);
          if (!raw) return { win: 0, draw: 0, lose: 0 };
          var parsed = JSON.parse(raw);
          return {
            win:  Number(parsed.win)  || 0,
            draw: Number(parsed.draw) || 0,
            lose: Number(parsed.lose) || 0,
          };
        } catch (e) {
          return { win: 0, draw: 0, lose: 0 };
        }
      },
      save: function (score) {
        storage.setItem(KEY, JSON.stringify(score));
      },
      reset: function () {
        storage.setItem(KEY, JSON.stringify({ win: 0, draw: 0, lose: 0 }));
      },
    };
  }

  return { CHOICES: CHOICES, RESULTS: RESULTS, cpuPick: cpuPick, judge: judge, createScoreStore: createScoreStore };
});
