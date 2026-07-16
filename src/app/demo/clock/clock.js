// BF-842 · /demo/clock 순수 시계 로직 유틸
// - DOM·네트워크 의존성 없음 → node:test 단위 테스트 가능
// - 기획 SSOT: docs/planning/clock-BF-839.md (§3 표시 규칙, §5 12/24 규칙)
// - 디자인: docs/design/clock-BF-839.md (§5 컴포넌트)
//
// 표시 규칙은 로케일 API(toLocaleDateString/toLocaleTimeString)를 쓰지 않고
// 고정 포맷을 자체 계산한다(기획 §3.1 — 결정론적 테스트 보장).

/** 요일 고정 배열 — 로케일 API 미사용 (기획 §3.1) */
export const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 표시 형식 종류 */
export const HOUR_FORMAT_24 = "24";
export const HOUR_FORMAT_12 = "12";

/**
 * 정수를 2자리 zero-pad 문자열로. (기획 §3.1/§3.2)
 * @param {number} n
 * @returns {string}
 */
export function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * 로컬 날짜를 `YYYY-MM-DD (요일)` 형식으로. (기획 §3.1)
 * @param {Date} date
 * @returns {string} 예: "2026-07-16 (목)"
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const w = WEEKDAYS_KO[date.getDay()];
  return `${y}-${m}-${d} (${w})`;
}

/**
 * 24시간 값(0~23)을 12시간 표시로 변환. (기획 §5.2 SSOT)
 *  00 → 오전 12 / 01~11 → 오전 / 12 → 오후 12 / 13~23 → 오후(값-12)
 * @param {number} hours24 0~23
 * @returns {{ period: "오전" | "오후", hour12: number }}
 */
export function to12Hour(hours24) {
  const period = hours24 < 12 ? "오전" : "오후";
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { period, hour12 };
}

/**
 * 로컬 시각을 표시 형식에 맞는 파트 객체로. (기획 §3.2 / §5.2)
 * @param {Date} date
 * @param {"24" | "12"} [format] 기본 "24"
 * @returns {{ prefix: string | null, hh: string, mm: string, ss: string }}
 *   prefix: 12시간 형식일 때 "오전"/"오후", 24시간이면 null
 */
export function formatTime(date, format = HOUR_FORMAT_24) {
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  const hours24 = date.getHours();
  if (format === HOUR_FORMAT_12) {
    const { period, hour12 } = to12Hour(hours24);
    return { prefix: period, hh: pad2(hour12), mm, ss };
  }
  return { prefix: null, hh: pad2(hours24), mm, ss };
}

/**
 * 임의 입력을 유효한 표시 형식("24"|"12")으로 정규화. (기획 §5.3)
 * 저장된 값이 손상됐거나 없으면 기본 "24".
 * @param {unknown} value
 * @returns {"24" | "12"}
 */
export function normalizeHourFormat(value) {
  return value === HOUR_FORMAT_12 ? HOUR_FORMAT_12 : HOUR_FORMAT_24;
}

/**
 * 현재 형식의 반대 형식을 반환(토글용). (기획 §5.1)
 * @param {"24" | "12"} format
 * @returns {"24" | "12"}
 */
export function toggleHourFormat(format) {
  return format === HOUR_FORMAT_12 ? HOUR_FORMAT_24 : HOUR_FORMAT_12;
}
