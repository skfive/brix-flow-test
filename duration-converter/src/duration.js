// 기간 변환기(duration-converter) 핵심 로직 + DOM 동기화 컨트롤러
// frozen 설계 근거: docs/plans/BF-1969/implementation-plan.md (§4 디바운스/§5 무한루프 가드/§6 메모이제이션/§7 API/§9 edge case)
//
// 의도적으로 import/export(ESM) 문법을 쓰지 않는 고전(classic) 스크립트로 작성한다.
// index.html을 file://로 직접 열면 <script type="module">의 모듈 fetch는 브라우저 CORS 정책으로
// 차단되지만(교차 출처 "null" 오류), <script src="...">(비-module)는 file://에서도 정상 로드된다.
// 이 파일은 공개 API를 globalThis.DurationConverter에 얹어 브라우저/Node 양쪽에서 동일하게 쓴다.
// (Node ESM 테스트에서는 side-effect import 후 globalThis.DurationConverter에서 꺼내 쓴다.)

const DEBOUNCE_MS = 120; // P2(150ms) 상한 대비 30ms 여유 — 계획서 §4

const SECONDS_PER_UNIT = { day: 86400, hour: 3600, minute: 60, second: 1 };

// §9: 일→시간→분→초 고정 순서, 각 성분 최대 1회, 음수/소수 불가
const DURATION_PATTERN = /^(?:(\d+)일)?\s*(?:(\d+)시간)?\s*(?:(\d+)분)?\s*(?:(\d+)초)?$/;

const QUICK_SELECT_SECONDS = { '30s': 30, '5m': 300, '1h': 3600, '1d': 86400 };

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

const ERROR_MESSAGES = {
  EMPTY: '값을 입력하세요',
  INVALID_SECONDS: '0 이상의 정수를 입력하세요',
  TOO_LARGE: '값이 너무 큽니다',
  INVALID_DURATION_FORMAT: '형식을 인식할 수 없습니다 (예: 1시간 30분)',
};

const STATE = {
  IDLE: 'idle',
  SECONDS_ACTIVE: 'seconds-active',
  DURATION_ACTIVE: 'duration-active',
  ERROR: 'error',
};

const STATE_LABEL = {
  [STATE.IDLE]: '대기 중',
  [STATE.SECONDS_ACTIVE]: '초 단위 입력 중',
  [STATE.DURATION_ACTIVE]: '기간 표현 입력 중',
  [STATE.ERROR]: '오류',
};

// §6: 음수/소수/NaN 방지, 0 이상의 정수로 정규화 (BF-1971 수용 기준: 소수점 초는 반올림)
function canonicalizeSeconds(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return 0;
  const rounded = Math.round(seconds);
  return rounded < 0 ? 0 : rounded;
}

// §6: 캐시 키는 canonical seconds — 동치 표현("90분"="1시간 30분")이 항상 같은 결과로 수렴(F3)
const secondsToDurationCache = new Map();

function computeDurationText(seconds) {
  let remaining = seconds;
  const day = Math.floor(remaining / SECONDS_PER_UNIT.day);
  remaining -= day * SECONDS_PER_UNIT.day;
  const hour = Math.floor(remaining / SECONDS_PER_UNIT.hour);
  remaining -= hour * SECONDS_PER_UNIT.hour;
  const minute = Math.floor(remaining / SECONDS_PER_UNIT.minute);
  remaining -= minute * SECONDS_PER_UNIT.minute;
  const second = remaining;

  const parts = [];
  if (day > 0) parts.push(`${day}일`);
  if (hour > 0) parts.push(`${hour}시간`);
  if (minute > 0) parts.push(`${minute}분`);
  if (second > 0) parts.push(`${second}초`);
  return parts.length > 0 ? parts.join(' ') : '0초'; // F2: 0초는 "0초"로 표시
}

function formatDuration(seconds) {
  const key = canonicalizeSeconds(seconds);
  if (secondsToDurationCache.has(key)) return secondsToDurationCache.get(key);
  const text = computeDurationText(key);
  secondsToDurationCache.set(key, text);
  return text;
}

// 테스트 전용 훅 — 수용 기준(동일 정규화 값 기준 재변환 skip) 검증에 사용
function _durationCacheSizeForTest() {
  return secondsToDurationCache.size;
}
function _resetDurationCacheForTest() {
  secondsToDurationCache.clear();
}

// §9: seconds-input — 빈 문자열/음수/소수/비숫자 → error, safe-integer 초과 → error
function parseSecondsInput(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed === '') {
    return { ok: false, error: ERROR_MESSAGES.EMPTY };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: ERROR_MESSAGES.INVALID_SECONDS };
  }
  const value = Number(trimmed);
  if (value > MAX_SAFE) {
    return { ok: false, error: ERROR_MESSAGES.TOO_LARGE };
  }
  return { ok: true, seconds: value };
}

// §9: duration-input — DURATION_PATTERN 문법만 허용, 최소 1개 성분 필요
function parseDurationInput(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed === '') {
    return { ok: false, error: ERROR_MESSAGES.EMPTY };
  }
  const match = DURATION_PATTERN.exec(trimmed);
  if (!match || (!match[1] && !match[2] && !match[3] && !match[4])) {
    return { ok: false, error: ERROR_MESSAGES.INVALID_DURATION_FORMAT };
  }
  const [, dayStr, hourStr, minuteStr, secondStr] = match;
  const day = dayStr ? Number(dayStr) : 0;
  const hour = hourStr ? Number(hourStr) : 0;
  const minute = minuteStr ? Number(minuteStr) : 0;
  const second = secondStr ? Number(secondStr) : 0;
  const total =
    day * SECONDS_PER_UNIT.day + hour * SECONDS_PER_UNIT.hour + minute * SECONDS_PER_UNIT.minute + second;
  if (total > MAX_SAFE) {
    return { ok: false, error: ERROR_MESSAGES.TOO_LARGE };
  }
  return { ok: true, seconds: total };
}

/**
 * DOM 동기화 컨트롤러 (§3 상태 전이 / §4 디바운스 / §5 무한루프 가드).
 * elements: { secondsInput, durationInput, secondsField, durationField, errorMessage, statusText, quickSelectButtons }
 * 순수 DOM 요소이든 테스트용 fake 요소이든 addEventListener/value/classList만 있으면 동작한다.
 */
function createDurationConverter(elements, options = {}) {
  const { debounceMs = DEBOUNCE_MS, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = options;
  const { secondsInput, durationInput, secondsField, durationField, errorMessage, statusText, quickSelectButtons } =
    elements;

  // §5: 프로그램적 대입과 사용자 입력을 구분하는 가드
  let isProgrammaticUpdate = false;
  let activeField = null; // 'seconds' | 'duration' | null
  let debounceTimerId = null; // §3 T7: 단일 공유 타이머
  let state = STATE.IDLE;

  function setState(next) {
    state = next;
    if (statusText) statusText.textContent = `상태: ${STATE_LABEL[next]}`;
  }

  function clearFieldModifiers() {
    if (secondsField) secondsField.classList.remove('field--active', 'field--error');
    if (durationField) durationField.classList.remove('field--active', 'field--error');
  }

  function setActiveField(name) {
    activeField = name;
    clearFieldModifiers();
    if (name === 'seconds' && secondsField) secondsField.classList.add('field--active');
    if (name === 'duration' && durationField) durationField.classList.add('field--active');
  }

  function setErrorField(name, message) {
    clearFieldModifiers();
    if (name === 'seconds' && secondsField) secondsField.classList.add('field--error');
    if (name === 'duration' && durationField) durationField.classList.add('field--error');
    if (errorMessage) errorMessage.textContent = message;
    setState(STATE.ERROR);
  }

  function clearError() {
    if (errorMessage) errorMessage.textContent = '';
  }

  // §5: 모든 프로그램적 대입은 이 헬퍼 하나만 거친다. 대상은 항상 activeField의 반대쪽 필드.
  function writeValue(el, value) {
    isProgrammaticUpdate = true;
    el.value = value;
    isProgrammaticUpdate = false; // 동기 실행이므로 즉시 원복
  }

  function cancelDebounce() {
    if (debounceTimerId !== null) {
      clearTimeoutFn(debounceTimerId);
      debounceTimerId = null;
    }
  }

  function handleFieldInput(sourceName) {
    const sourceEl = sourceName === 'seconds' ? secondsInput : durationInput;
    const targetEl = sourceName === 'seconds' ? durationInput : secondsInput;
    const parse = sourceName === 'seconds' ? parseSecondsInput : parseDurationInput;
    const nextState = sourceName === 'seconds' ? STATE.SECONDS_ACTIVE : STATE.DURATION_ACTIVE;
    const formatForTarget = (seconds) =>
      sourceName === 'seconds' ? formatDuration(seconds) : String(canonicalizeSeconds(seconds));

    return function onInput() {
      if (isProgrammaticUpdate) return; // §5 가드: 프로그램적 대입 재유발 차단

      const raw = sourceEl.value;
      const otherEmpty = targetEl.value.trim() === '';
      const result = parse(raw); // F2: 즉시 동기 검증

      cancelDebounce(); // §4-4: 오류/재입력 시 대기 중인 타이머 즉시 취소

      if (!result.ok) {
        if (raw.trim() === '' && otherEmpty) {
          // T6: 활성 필드와 상대 필드가 모두 비면 idle로 복귀
          clearFieldModifiers();
          clearError();
          activeField = null;
          setState(STATE.IDLE);
          return;
        }
        setErrorField(sourceName, result.error);
        return;
      }

      // T4: 오류에서 복귀 — error-message 즉시 해제, 두 입력란 모두 갱신 가능한 상태 유지
      clearError();
      setActiveField(sourceName);
      // 상태 텍스트는 "현재 편집 중인 필드"를 즉시 반영한다 — field--active(시각)와 동기화해
      // 색상만으로 상태를 구분하지 않는다는 §2.6 접근성 요구를 항상 만족시킨다.
      // (반대로 상대 필드에 실제로 쓰는 값 갱신 자체는 P1 디바운스를 그대로 따른다.)
      setState(nextState);

      debounceTimerId = setTimeoutFn(() => {
        if (targetEl === sourceEl) return; // §5 방어: writeValue 대상은 항상 activeField 반대쪽(구조상 항상 false — 리팩터 안전망)
        const formatted = formatForTarget(result.seconds);
        if (targetEl.value !== formatted) {
          // 수용 기준(재변환 skip): 이미 동일한 값이 반영돼 있으면 재작성을 skip
          writeValue(targetEl, formatted);
        }
        debounceTimerId = null;
      }, debounceMs); // P1
    };
  }

  function handleQuickSelect(seconds) {
    cancelDebounce(); // T5: 디바운스 미적용, 즉시 반영
    clearError();
    writeValue(secondsInput, String(seconds));
    writeValue(durationInput, formatDuration(seconds));
    setActiveField('seconds');
    setState(STATE.SECONDS_ACTIVE);
  }

  const onSecondsInput = handleFieldInput('seconds');
  const onDurationInput = handleFieldInput('duration');
  secondsInput.addEventListener('input', onSecondsInput);
  durationInput.addEventListener('input', onDurationInput);

  if (quickSelectButtons) {
    for (const [key, seconds] of Object.entries(QUICK_SELECT_SECONDS)) {
      const btn = quickSelectButtons[key];
      if (btn) btn.addEventListener('click', () => handleQuickSelect(seconds));
    }
  }

  setState(STATE.IDLE);

  return {
    getState: () => state,
    getActiveField: () => activeField,
    _handleSecondsInputForTest: onSecondsInput,
    _handleDurationInputForTest: onDurationInput,
    _handleQuickSelectForTest: handleQuickSelect,
  };
}

function bootstrapFromDocument() {
  const secondsInput = document.getElementById('seconds-input');
  const durationInput = document.getElementById('duration-input');
  if (!secondsInput || !durationInput) return null;

  return createDurationConverter({
    secondsInput,
    durationInput,
    secondsField: document.getElementById('seconds-field'),
    durationField: document.getElementById('duration-field'),
    errorMessage: document.getElementById('error-message'),
    statusText: document.getElementById('status-text'),
    quickSelectButtons: {
      '30s': document.getElementById('quick-select-30s'),
      '5m': document.getElementById('quick-select-5m'),
      '1h': document.getElementById('quick-select-1h'),
      '1d': document.getElementById('quick-select-1d'),
    },
  });
}

// 공개 API를 globalThis에 노출 — 브라우저(classic script)와 Node(테스트) 양쪽에서 동일하게 사용.
globalThis.DurationConverter = {
  DEBOUNCE_MS,
  QUICK_SELECT_SECONDS,
  STATE,
  canonicalizeSeconds,
  formatDuration,
  parseSecondsInput,
  parseDurationInput,
  createDurationConverter,
  _durationCacheSizeForTest,
  _resetDurationCacheForTest,
};

// Node 테스트 환경(document 없음)에서는 DOM 부트스트랩을 실행하지 않는다 — 위 API만 사용 가능.
if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
  bootstrapFromDocument();
}
