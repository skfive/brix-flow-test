/* BF-850 · /demo/dice 순수 굴림 로직
 *
 * UMD 패턴 — 브라우저는 globalThis.DiceDemoRoll, Node 는 module.exports (단위 테스트용).
 * file:// CORS 안전 (vanilla-static): import/export/fetch/외부 CDN 0건.
 *   - module.exports 는 CommonJS (ES module 아님) — 정책 허용.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.DiceDemoRoll = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* 주사위 눈 1~6 → 유니코드 글리프 (0/7+ 등 범위 밖 표시 금지) */
  var DICE_GLYPHS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  /* 1~6 무작위 정수. rng 주입 시 [0,1) 값을 사용 (테스트 결정성). */
  function rollOne(rng) {
    var r = typeof rng === "function" ? rng() : Math.random();
    if (!(r >= 0) || r >= 1) r = 0; /* NaN/범위 밖 방어 → 1 */
    return 1 + Math.floor(r * 6);
  }

  /* 1~6 정수만 글리프로 매핑, 그 외(0·7+·소수·NaN·비수)는 "" */
  function glyph(n) {
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 6) {
      return "";
    }
    return DICE_GLYPHS[n - 1];
  }

  return {
    DICE_GLYPHS: DICE_GLYPHS,
    rollOne: rollOne,
    glyph: glyph,
  };
});
