// BF-407 · 타이머 localStorage 추상 utility
// - 명세: docs/design/timer-BF-405.md
// - key prefix: "timer:"
// - 마지막 설정값: "timer:last" → JSON.stringify({ minutes, seconds })
// - 브라우저: globalThis.localStorage 주입 (default)
// - 테스트: createMemoryStorage() 로 in-memory adapter 주입

export const TIMER_PREFIX = "timer:";
export const TIMER_LAST_KEY = TIMER_PREFIX + "last";

/**
 * Web Storage API (localStorage) 호환 in-memory adapter.
 * notepad/storage.js 와 동일한 패턴 — 테스트·서버사이드 미리보기용.
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

function validateMmSs(value) {
  if (!value || typeof value !== "object") {
    throw new Error("minutes/seconds 객체가 필요합니다.");
  }
  const { minutes, seconds } = value;
  if (
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    minutes < 0 ||
    minutes > 99 ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new Error("minutes/seconds 가 허용 범위(0–99 / 0–59)를 벗어났습니다.");
  }
}

/**
 * 타이머 저장소 factory.
 * @param {Storage} [storage] - Web Storage API 호환 객체. 기본 globalThis.localStorage.
 */
export function createTimerStore(storage = globalThis.localStorage) {
  if (!storage) {
    throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
  }

  function saveLast(value) {
    validateMmSs(value);
    storage.setItem(
      TIMER_LAST_KEY,
      JSON.stringify({ minutes: value.minutes, seconds: value.seconds }),
    );
  }

  function loadLast() {
    const raw = storage.getItem(TIMER_LAST_KEY);
    if (raw == null) return null;
    try {
      const parsed = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Number.isFinite(parsed.minutes) ||
        !Number.isFinite(parsed.seconds)
      ) {
        return null;
      }
      return { minutes: parsed.minutes, seconds: parsed.seconds };
    } catch {
      return null;
    }
  }

  function clearLast() {
    storage.removeItem(TIMER_LAST_KEY);
  }

  return { saveLast, loadLast, clearLast };
}
