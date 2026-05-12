// BF-417 · 스톱워치 localStorage 추상 utility
// - 명세: docs/design/stopwatch-BF-415.md
//   §6.8 은 "비저장 정책" 이지만 BF-417 의 acceptance criteria 가
//   "랩 리스트 localStorage 영구화 + 정지 후 새로고침 시 복원" 을 요구 →
//   디자인 정책을 task 요구사항으로 override. PR Implementation Notes 에 사유 명시.
// - key prefix: "stopwatch:"
//   - "stopwatch:laps"    → JSON.stringify(Array<{ index, cumulativeMs, deltaMs }>)
//   - "stopwatch:elapsed" → JSON.stringify(number)
//     정지 시점의 elapsedMs. 새로고침 시 stopped 상태로 복원 가능.

export const STOPWATCH_PREFIX = "stopwatch:";
export const STOPWATCH_LAPS_KEY = STOPWATCH_PREFIX + "laps";
export const STOPWATCH_ELAPSED_KEY = STOPWATCH_PREFIX + "elapsed";

/**
 * Web Storage API (localStorage) 호환 in-memory adapter.
 * notepad/storage.js · timer/storage.js 와 동일한 패턴.
 */
export function createMemoryStorage() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(i) {
      return Array.from(map.keys())[i] ?? null;
    },
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, String(v));
    },
    removeItem(k) {
      map.delete(k);
    },
    clear() {
      map.clear();
    },
  };
}

function isLapEntry(o) {
  return (
    o &&
    typeof o === "object" &&
    Number.isFinite(o.index) &&
    Number.isFinite(o.cumulativeMs) &&
    Number.isFinite(o.deltaMs)
  );
}

/**
 * 스톱워치 저장소 factory.
 * @param {Storage} [storage] - Web Storage API 호환 객체. 기본 globalThis.localStorage.
 */
export function createStopwatchStore(storage = globalThis.localStorage) {
  if (!storage) {
    throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
  }

  function saveLaps(laps) {
    if (!Array.isArray(laps)) {
      throw new Error("laps 는 배열(array) 이어야 합니다.");
    }
    storage.setItem(STOPWATCH_LAPS_KEY, JSON.stringify(laps));
  }

  function loadLaps() {
    const raw = storage.getItem(STOPWATCH_LAPS_KEY);
    if (raw == null) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // 깨진 항목 필터 (다른 항목 보호)
      return parsed.filter(isLapEntry);
    } catch {
      return [];
    }
  }

  function saveElapsed(ms) {
    if (!Number.isFinite(ms)) {
      throw new Error("elapsed 는 숫자(number) 여야 합니다.");
    }
    storage.setItem(STOPWATCH_ELAPSED_KEY, JSON.stringify(ms));
  }

  function loadElapsed() {
    const raw = storage.getItem(STOPWATCH_ELAPSED_KEY);
    if (raw == null) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!Number.isFinite(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function clearAll() {
    storage.removeItem(STOPWATCH_LAPS_KEY);
    storage.removeItem(STOPWATCH_ELAPSED_KEY);
  }

  return { saveLaps, loadLaps, saveElapsed, loadElapsed, clearAll };
}
