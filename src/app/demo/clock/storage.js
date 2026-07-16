// BF-842 · /demo/clock 표시 형식 localStorage 추상 utility
// - 기획 SSOT: docs/planning/clock-BF-839.md §5.3
//   - "clock:hourFormat" → "12" | "24" (기본 "24")
//   - 정지/재개 상태는 저장하지 않음 (형식만 영속화)
// - 외부 네트워크 미사용 (기획 §6) — localStorage 만 사용
// - notepad/timer/stopwatch 의 storage 패턴과 동일 컨벤션

import { normalizeHourFormat, HOUR_FORMAT_24 } from "./clock.js";

export const CLOCK_PREFIX = "clock:";
export const CLOCK_HOUR_FORMAT_KEY = CLOCK_PREFIX + "hourFormat";

/**
 * Web Storage API(localStorage) 호환 in-memory adapter.
 * stopwatch/storage.js 와 동일 패턴 — 브라우저 외(node) 테스트용.
 * @returns {Storage}
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

/**
 * 시계 표시 형식 저장소 factory.
 * @param {Storage} [storage] Web Storage API 호환 객체. 기본 globalThis.localStorage.
 * @returns {{ loadFormat: () => ("24" | "12"), saveFormat: (f: unknown) => void }}
 */
export function createClockStore(storage = globalThis.localStorage) {
  /**
   * 저장된 표시 형식 복원. 없거나 손상 시 기본 "24".
   * @returns {"24" | "12"}
   */
  function loadFormat() {
    let raw = null;
    try {
      raw = storage?.getItem(CLOCK_HOUR_FORMAT_KEY) ?? null;
    } catch {
      // private mode 등 접근 불가 — 기본값 fallback
      return HOUR_FORMAT_24;
    }
    return normalizeHourFormat(raw);
  }

  /**
   * 표시 형식 저장. 유효하지 않은 값은 정규화 후 저장.
   * @param {unknown} format
   */
  function saveFormat(format) {
    const normalized = normalizeHourFormat(format);
    try {
      storage?.setItem(CLOCK_HOUR_FORMAT_KEY, normalized);
    } catch {
      // 저장 실패는 치명적이지 않음 — silent (기획 §5.3 선택적 영속화)
    }
  }

  return { loadFormat, saveFormat };
}
