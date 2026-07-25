// 리뷰 증거 히트맵 — 순수 로직 (필터·통계·aria-label) (BF-1190)
// DOM 비의존 — node --test 로 단독 검증 가능.

import { RISK_META, VERIFY_META } from './data.js';

/**
 * 위험도/검증상태 필터 적용.
 * @param {ReadonlyArray<object>} files
 * @param {{ risks?: Set<string>|Array<string>, verify?: Set<string>|Array<string> }} filters
 *   각 Set 이 비어 있으면(또는 미지정) 해당 축은 "전체"로 간주.
 * @returns {Array<object>} 필터 통과 파일 (원본 순서 유지)
 */
export function filterFiles(files, filters = {}) {
  const risks = toSet(filters.risks);
  const verify = toSet(filters.verify);
  return files.filter((f) => {
    const riskOk = risks.size === 0 || risks.has(f.risk);
    const verifyOk = verify.size === 0 || verify.has(f.verify);
    return riskOk && verifyOk;
  });
}

function toSet(v) {
  if (v instanceof Set) return v;
  if (Array.isArray(v)) return new Set(v);
  return new Set();
}

/**
 * 요약 통계.
 * @returns {{ total:number, critical:number, high:number, unverified:number }}
 *   unverified = verified 가 아닌 파일 수(대기·실패·재검증).
 */
export function computeStats(files) {
  let critical = 0;
  let high = 0;
  let unverified = 0;
  for (const f of files) {
    if (f.risk === 'critical') critical += 1;
    if (f.risk === 'high') high += 1;
    if (f.verify !== 'verified') unverified += 1;
  }
  return { total: files.length, critical, high, unverified };
}

/**
 * 셀 aria-label (명세 §5.2 형식).
 * 예: "src/auth/session.js, 위험도 심각, 검증실패, 이슈 3건"
 */
export function cellAriaLabel(file) {
  const risk = RISK_META[file.risk]?.label ?? file.risk;
  const verify = VERIFY_META[file.verify]?.label ?? file.verify;
  return `${file.path}, 위험도 ${risk}, ${verify}, 이슈 ${file.findings}건`;
}

/** 결과 카운트 문구 (명세 §5.4). */
export function countLabel(shown, total) {
  return `표시 중 ${shown} / ${total} 파일`;
}
