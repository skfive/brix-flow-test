// 네온 스네이크 · 모드별 최고 기록 저장/조회/신기록 판정 순수 모듈
// 설계 기준: docs/plans/snake-highscore-BF-1513.md §3 (planning-contract@v1)
//
// 이 모듈은 DOM/window/시간/난수에 의존하지 않는다. 저장소는 인자로 주입하며
// (storage 어댑터 = { getItem, setItem }), 저장소를 고정하면 결정론적으로 테스트된다.
// 브라우저에서는 window.localStorage 를, 테스트에서는 페이크 저장소를 주입한다.

// 저장 키 네임스페이스 (기존 game.js HIGH_SCORE_STORAGE_KEY 컨벤션 계승).
// 레거시 단일 플레이 키(neon-snake-fullscreen-0802:highscore, suffix 없음)와는
// :{mode} suffix 로 격리되어 additive 로 공존한다.
export const HIGH_SCORE_NAMESPACE = 'neon-snake-fullscreen-0802:highscore';

// 모드별 저장 키 파생 — 모드 문자열을 그대로 결합해 모드별로 기록을 격리한다.
export function storageKeyFor(mode) {
  return `${HIGH_SCORE_NAMESPACE}:${mode}`;
}

// 점수 유효성: 유한한 비음수 정수인가.
function isValidScore(score) {
  return (
    typeof score === 'number' &&
    Number.isFinite(score) &&
    Number.isInteger(score) &&
    score >= 0
  );
}

// 조회: 값이 없거나 손상(음수/NaN/비수치/null)되면 0. 접근 예외는 삼키고 0.
export function loadBest(storage, mode) {
  try {
    const raw = storage.getItem(storageKeyFor(mode));
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

// 저장: 유효한 비음수 정수이고 기존 최고보다 클 때만 기록(no-downgrade).
// 반환값은 저장 후 최고 기록. 접근 예외는 삼키고 기존 최고를 반환(no-op).
export function saveBest(storage, mode, score) {
  const current = loadBest(storage, mode);
  if (isValidScore(score) && score > current) {
    try {
      storage.setItem(storageKeyFor(mode), String(score));
      return score;
    } catch {
      return current;
    }
  }
  return current;
}

// 신기록 판정: score 가 저장된 최고보다 엄격히 큰가 (동점=false).
export function isNewRecord(storage, mode, score) {
  return isValidScore(score) && score > loadBest(storage, mode);
}

// frozen 상태 텍스트 포매터 (순수) — UI 연결 시 화면 텍스트로 상태를 구분한다.
export function formatBestText(n) {
  return `최고 기록 ${n}`;
}
export function formatCurrentText(n) {
  return `이번 점수 ${n}`;
}
