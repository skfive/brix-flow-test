// format-time.js — 시각 포맷 순수 함수 (부수효과 없음)
// 브라우저와 node:test 가 그대로 import 하는 ESM 런타임 파일. 빌드 도구 없음.

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * 주어진 시각을 12/24시간제 표시 문자열로 변환한다.
 * - is24Hour === true  → 'HH:mm:ss'        (시 00–23)
 * - is24Hour === false → 'hh:mm:ss AM/PM'  (시 01–12)
 * 인자 Date 를 변형하지 않는 결정론적 순수 함수.
 * @param {Date} date 표시할 시각
 * @param {boolean} is24Hour 24시간제 여부
 * @returns {string}
 */
export function formatTime(date, is24Hour) {
  const hours = date.getHours();
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());

  if (is24Hour) {
    return `${pad2(hours)}:${minutes}:${seconds}`;
  }

  const period = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${pad2(hour12)}:${minutes}:${seconds} ${period}`;
}
