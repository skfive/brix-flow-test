// BF-412 · 계산기 localStorage 추상 utility
// - 명세: docs/design/calculator-BF-410.md, task BF-412 AC1/AC2
// - key prefix: "calc:"
// - 마지막 결과: "calc:last" → 문자열 (숫자의 string 표현, 예: "5", "3.14")
// - notepad/storage.js, timer/storage.js 와 동일 패턴 (Web Storage 호환 어댑터 주입 가능)

export const CALC_PREFIX = "calc:";
export const CALC_LAST_KEY = CALC_PREFIX + "last";

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

export function createCalcStore(storage = globalThis.localStorage) {
  if (!storage) {
    throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
  }

  function saveLast(value) {
    let s;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error(
          "saveLast: 유한한 숫자가 아닙니다 (Infinity/NaN 저장 불가).",
        );
      }
      s = String(value);
    } else if (typeof value === "string") {
      if (value.length === 0) {
        throw new Error("saveLast: 빈 문자열은 저장하지 않습니다.");
      }
      s = value;
    } else {
      throw new Error("saveLast: number 또는 string 만 허용됩니다.");
    }
    storage.setItem(CALC_LAST_KEY, s);
  }

  function loadLast() {
    const raw = storage.getItem(CALC_LAST_KEY);
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return raw;
  }

  function clearLast() {
    storage.removeItem(CALC_LAST_KEY);
  }

  return { saveLast, loadLast, clearLast };
}
