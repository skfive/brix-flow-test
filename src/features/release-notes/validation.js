// BF-1087 릴리스 노트 요약 보드 — 입력 검증 (기획 §4, 디자인 §7)
// 순수 함수: 부작용 없음. 실패 필드를 "한 번에 모두" 반환한다(기획 §4).

import {
  IMPORTANCE_VALUES,
  USER_IMPACT_VALUES,
  TITLE_MAX_LENGTH,
  CHANGE_MAX_LENGTH,
  CHANGES_MAX_COUNT,
} from './constants.js';

/**
 * @typedef {{ field: string, reason: string }} ValidationError
 * @typedef {{ valid: boolean, errors: ValidationError[] }} ValidationResult
 */

/**
 * 요약 카드 입력을 검증한다. 여러 필드가 동시에 실패하면 모두 반환한다(기획 §4).
 * 요청 본문 자체가 객체가 아니면 필드 오류가 아닌 요청 레벨 오류로 구분한다.
 * @param {unknown} input
 * @returns {ValidationResult}
 */
export function validateSummaryInput(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      valid: false,
      errors: [{ field: '_request', reason: '요청 본문이 올바른 객체가 아닙니다.' }],
    };
  }

  /** @type {ValidationError[]} */
  const errors = [];
  const record = /** @type {Record<string, unknown>} */ (input);

  validateTitle(record.title, errors);
  validateChanges(record.changes, errors);
  validateEnumField(
    record.importance,
    IMPORTANCE_VALUES,
    'importance',
    '중요도',
    errors,
  );
  validateEnumField(
    record.userImpact,
    USER_IMPACT_VALUES,
    'userImpact',
    '사용자 영향도',
    errors,
  );

  return { valid: errors.length === 0, errors };
}

/**
 * @param {unknown} title
 * @param {ValidationError[]} errors
 */
function validateTitle(title, errors) {
  if (typeof title !== 'string' || title.trim().length === 0) {
    errors.push({ field: 'title', reason: '릴리스 제목을 입력하세요.' });
    return;
  }
  const trimmedLength = title.trim().length;
  if (trimmedLength > TITLE_MAX_LENGTH) {
    errors.push({
      field: 'title',
      reason: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다. (현재 ${trimmedLength}자)`,
    });
  }
}

/**
 * @param {unknown} changes
 * @param {ValidationError[]} errors
 */
function validateChanges(changes, errors) {
  if (!Array.isArray(changes) || changes.length === 0) {
    errors.push({ field: 'changes', reason: '변경 항목을 1개 이상 입력하세요.' });
    return;
  }
  if (changes.length > CHANGES_MAX_COUNT) {
    errors.push({
      field: 'changes',
      reason: `변경 항목은 최대 ${CHANGES_MAX_COUNT}개까지 입력할 수 있습니다. (현재 ${changes.length}개)`,
    });
    return;
  }
  changes.forEach((item, index) => {
    const isBlank = typeof item !== 'string' || item.trim().length === 0;
    const isTooLong = typeof item === 'string' && item.trim().length > CHANGE_MAX_LENGTH;
    if (isBlank || isTooLong) {
      errors.push({
        field: `changes[${index}]`,
        reason: `${index + 1}번째 항목을 확인하세요. (공백 불가 · ${CHANGE_MAX_LENGTH}자 이하)`,
      });
    }
  });
}

/**
 * enum 필드(미선택/허용값 외) 검증.
 * @param {unknown} value
 * @param {readonly string[]} allowed
 * @param {string} field
 * @param {string} labelKo
 * @param {ValidationError[]} errors
 */
function validateEnumField(value, allowed, field, labelKo, errors) {
  if (value === undefined || value === null || value === '') {
    errors.push({ field, reason: `${labelKo}를 선택하세요.` });
    return;
  }
  if (typeof value !== 'string' || !allowed.includes(value)) {
    errors.push({
      field,
      reason: `${labelKo}는 ${allowed.join(', ')} 중 하나여야 합니다.`,
    });
  }
}
