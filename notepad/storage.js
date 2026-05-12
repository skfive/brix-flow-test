// BF-402 · localStorage 추상 utility
// - notepad: prefix 한 키 공간만 다룸 (다른 키와 충돌 없음)
// - 브라우저: `globalThis.localStorage` 주입 (default)
// - 테스트: `createMemoryStorage()` 로 in-memory adapter 주입
//
// Note 모델: { id, title, body, createdAt, updatedAt }
//   - id: ULID (notepad/ulid.js)
//   - createdAt / updatedAt: epoch ms (number)

export const NOTE_PREFIX = "notepad:";

/**
 * Web Storage API (localStorage) 호환 in-memory adapter.
 * 테스트·서버사이드 미리보기용.
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
 * 메모 저장소 factory.
 * @param {Storage} [storage] - Web Storage API 호환 객체. 기본 globalThis.localStorage.
 */
export function createNoteStore(storage = globalThis.localStorage) {
  if (!storage) {
    throw new Error("storage 가 제공되지 않았습니다 (브라우저 외 환경).");
  }
  const key = (id) => NOTE_PREFIX + id;

  function save(note) {
    if (!note || typeof note.id !== "string" || !note.id) {
      throw new Error("note.id (string) 가 필요합니다.");
    }
    storage.setItem(key(note.id), JSON.stringify(note));
  }

  function get(id) {
    const raw = storage.getItem(key(id));
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function remove(id) {
    storage.removeItem(key(id));
  }

  function list() {
    const out = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k || !k.startsWith(NOTE_PREFIX)) continue;
      const raw = storage.getItem(k);
      if (raw == null) continue;
      try {
        out.push(JSON.parse(raw));
      } catch {
        // 깨진 항목은 조용히 건너뜀 (다른 항목 보호)
      }
    }
    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return out;
  }

  return { save, get, remove, list };
}
