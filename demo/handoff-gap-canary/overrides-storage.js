// 후속 액션 로컬 보완 저장 (s1 §7). 단일 envelope 로 원자적 read/write.
// localStorage 실패 시 in-memory 폴백(크래시 금지, s1 §7.5 R3).

/** 단일 저장 키 (s1 §7.1). */
export const OVERRIDES_KEY = 'handoff-gap-canary:overrides';

/** envelope 스키마 버전. */
export const SCHEMA_VERSION = 1;

/** 후속 액션 최대 길이(trim 후 기준, s1 §7.2). */
export const MAX_FOLLOWUP_LEN = 200;

/**
 * envelope 문자열을 파싱해 유효한 오버라이드 맵만 반환한다(s1 §7.3 V1~V5, §7.5 R1/R2).
 * @param {string|null} raw localStorage 원본 문자열
 * @param {Iterable<string>|null} [knownIds] fixture 에 존재하는 id 집합(orphan 검사용)
 * @returns {{[id:string]:{followUpAction:string,savedAt:string}}}
 */
export function parseEnvelope(raw, knownIds = null) {
  if (raw == null) return {}; // V1: 보완 없음 초기 상태

  let parsed;
  try {
    parsed = JSON.parse(raw); // V2
  } catch {
    return {}; // R1: 전체 폴백
  }

  // V3: 최상위 object + schemaVersion===1 + overrides object
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    parsed.schemaVersion !== SCHEMA_VERSION ||
    typeof parsed.overrides !== 'object' ||
    parsed.overrides === null ||
    Array.isArray(parsed.overrides)
  ) {
    return {}; // R1: 전체 폴백
  }

  const idSet = knownIds ? new Set(knownIds) : null;
  /** @type {{[id:string]:{followUpAction:string,savedAt:string}}} */
  const result = {};

  for (const [id, entry] of Object.entries(parsed.overrides)) {
    // V5: orphan 무시
    if (idSet && !idSet.has(id)) continue;
    // V4: 엔트리 단위 검증 — 위반 엔트리만 드롭(R2)
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof entry.followUpAction !== 'string' ||
      typeof entry.savedAt !== 'string'
    ) {
      continue;
    }
    const trimmed = entry.followUpAction.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_FOLLOWUP_LEN) continue;
    result[id] = { followUpAction: trimmed, savedAt: entry.savedAt };
  }

  return result;
}

/**
 * storage 에서 오버라이드 맵을 읽는다. getItem 예외도 방어(크래시 금지).
 * @param {Storage|{getItem:(k:string)=>string|null}} storage
 * @param {Iterable<string>|null} [knownIds]
 * @returns {{[id:string]:{followUpAction:string,savedAt:string}}}
 */
export function readOverrides(storage, knownIds = null) {
  let raw = null;
  try {
    raw = storage ? storage.getItem(OVERRIDES_KEY) : null;
  } catch {
    raw = null;
  }
  return parseEnvelope(raw, knownIds);
}

/**
 * 오버라이드 맵을 storage 에 기록한다. 실패 시 false 반환(호출측 in-memory 폴백, R3).
 * @param {Storage|{setItem:(k:string,v:string)=>void}} storage
 * @param {{[id:string]:{followUpAction:string,savedAt:string}}} overridesMap
 * @returns {boolean} 영속 저장 성공 여부
 */
export function writeOverrides(storage, overridesMap) {
  const envelope = { schemaVersion: SCHEMA_VERSION, overrides: overridesMap };
  try {
    storage.setItem(OVERRIDES_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false; // R3: 재시도하지 않고 in-memory 로만 유지
  }
}

/**
 * 후속 액션 입력값 검증(s1 §7.2). trim 후 1~200자, 초과 시 오류.
 * @param {string} text
 * @returns {{ok:true,value:string,isRemoval:boolean}|{ok:false,error:string,length:number}}
 */
export function validateFollowUp(text) {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') {
    // 공백/빈 값 → 오버라이드 삭제(오류 아님, EC-08)
    return { ok: true, value: '', isRemoval: true };
  }
  if (trimmed.length > MAX_FOLLOWUP_LEN) {
    return {
      ok: false,
      error: `후속 액션은 ${MAX_FOLLOWUP_LEN}자 이하여야 합니다 (현재 ${trimmed.length}자)`,
      length: trimmed.length,
    };
  }
  return { ok: true, value: trimmed, isRemoval: false };
}

/**
 * 오버라이드 맵에 항목 보완을 적용한 새 맵을 반환한다(불변).
 * 빈 값이면 해당 id 제거, 아니면 최신 1건 덮어쓰기(s1 §7.2).
 * @param {{[id:string]:{followUpAction:string,savedAt:string}}} overridesMap
 * @param {string} id
 * @param {string} value trim 완료된 유효 값(빈 문자열이면 삭제)
 * @param {string} savedAt ISO8601 저장 시각
 * @returns {{[id:string]:{followUpAction:string,savedAt:string}}}
 */
export function applyOverride(overridesMap, id, value, savedAt) {
  const next = { ...overridesMap };
  if (value === '') {
    delete next[id];
  } else {
    next[id] = { followUpAction: value, savedAt };
  }
  return next;
}

/**
 * in-memory 폴백 storage (localStorage 미지원/차단 환경, s1 §7.5 R3 · 테스트용).
 * @returns {{getItem:(k:string)=>string|null,setItem:(k:string,v:string)=>void,removeItem:(k:string)=>void}}
 */
export function createMemoryStorage() {
  /** @type {Map<string,string>} */
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}
