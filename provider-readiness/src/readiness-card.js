// Provider 실행 준비 상태 카드 — 브라우저가 직접 import 하는 실행 가능한 ESM 모듈.
// frozen UI 계약(implementation-plan §5)의 selector/token/텍스트/상태 모델만 소비한다.
// 인증 토큰 · Provider secret · 세션 cookie 값은 어디에도 노출하지 않는다.

/** 상태별 화면 텍스트 (frozen 계약 §5.4). */
export const STATE_TEXT = Object.freeze({
  loading: '확인 중…',
  ready: '준비됨',
  blocked: '차단됨 — 설정 필요',
  unset: '설정되지 않음',
  error: '상태를 불러오지 못했습니다',
});

/** 상태별 status class modifier (frozen 계약 §5.3). loading/error 는 modifier 없음. */
const STATUS_CLASS = Object.freeze({
  ready: 'readiness-card__status--ready',
  blocked: 'readiness-card__status--blocked',
  unset: 'readiness-card__status--unset',
});

const MODIFIER_CLASSES = Object.freeze([
  'readiness-card__status--ready',
  'readiness-card__status--blocked',
  'readiness-card__status--unset',
]);

/**
 * 상태 카드 렌더링에 필요한 표현값을 계산하는 순수 함수.
 * implementation-plan §1 판정 규칙을 그대로 구현한다.
 *
 * @param {{ phase?: 'loading'|'loaded'|'error', providerSelected?: boolean, policyAllowed?: boolean }} [data]
 * @returns {{ state: string, statusText: string, statusClass: (string|null),
 *   showSettingsLink: boolean, showRetry: boolean, showProgress: boolean }}
 */
export function resolveReadiness(data) {
  const phase = data && data.phase ? data.phase : 'loading';

  // 1. 조회 진행 중 → loading
  if (phase === 'loading') return descriptor('loading');
  // 2. 조회 실패 → error
  if (phase === 'error') return descriptor('error');

  // phase === 'loaded'
  // 3. Provider 미선택 → unset
  if (!data || !data.providerSelected) return descriptor('unset');
  // 4/5. 선택됨 → 정책 허용이면 ready, 아니면 blocked
  return descriptor(data.policyAllowed ? 'ready' : 'blocked');
}

function descriptor(state) {
  return {
    state,
    statusText: STATE_TEXT[state],
    statusClass: STATUS_CLASS[state] || null,
    showSettingsLink: state === 'blocked' || state === 'unset',
    showRetry: state === 'error',
    showProgress: state === 'loading',
  };
}

/** 데이터 부재 시 '설정되지 않음' 을 표시한다. secret 은 소비하지 않는다. */
function displayValue(value) {
  if (value === null || value === undefined || value === '') return STATE_TEXT.unset;
  return String(value);
}

/**
 * 기본 데이터 소스 — 읽기전용. 실제 Planning/Provider 조회 계약이 주입되지 않은
 * 정적 환경에서는 데이터 부재(unset)로 판정한다. window.__READINESS_DATA__ 로
 * 읽기전용 표시 데이터(또는 () => data)를 주입할 수 있으며 secret 은 담지 않는다.
 */
export async function defaultLoader() {
  const src = typeof window !== 'undefined' ? window.__READINESS_DATA__ : null;
  if (typeof src === 'function') return src();
  if (src) return src;
  return { phase: 'loaded', providerSelected: false, mode: null, provider: null };
}

/**
 * 상태 카드를 DOM 에 마운트하고 데이터 조회 결과를 렌더링한다.
 * 초기화·실패·재시도 뒤에는 loading 진행 표시를 복원하고 readiness-retry 를 재활성화한다.
 *
 * @param {{ root?: (Document|Element), loader?: () => Promise<object>, document?: Document }} [options]
 * @returns {{ run: () => Promise<void> }}
 */
export function initReadinessCard(options = {}) {
  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('initReadinessCard requires a document');
  const root = options.root || doc;
  const loader = options.loader || defaultLoader;

  const els = {
    mode: root.querySelector('#readiness-mode'),
    provider: root.querySelector('#readiness-provider'),
    status: root.querySelector('#readiness-status'),
    settingsLink: root.querySelector('#readiness-settings-link'),
    retry: root.querySelector('#readiness-retry'),
  };

  function paint(desc, data) {
    if (els.mode) els.mode.textContent = desc.showProgress ? STATE_TEXT.loading : displayValue(data && data.mode);
    if (els.provider) els.provider.textContent = desc.showProgress ? STATE_TEXT.loading : displayValue(data && data.provider);
    if (els.status) {
      els.status.textContent = desc.statusText;
      els.status.classList.remove(...MODIFIER_CLASSES);
      if (desc.statusClass) els.status.classList.add(desc.statusClass);
      els.status.classList.toggle('is-loading', desc.showProgress);
    }
    if (els.settingsLink) els.settingsLink.hidden = !desc.showSettingsLink;
    if (els.retry) els.retry.hidden = !desc.showRetry;
  }

  async function run() {
    // 초기화·재시도 시 loading 진행 표시 복원, retry 는 조회 중 비활성화
    paint(resolveReadiness({ phase: 'loading' }), null);
    if (els.retry) els.retry.disabled = true;
    try {
      const data = await loader();
      paint(resolveReadiness(data), data);
    } catch {
      paint(resolveReadiness({ phase: 'error' }), null);
    } finally {
      // 조회 종료 후 readiness-retry control 재활성화
      if (els.retry) els.retry.disabled = false;
    }
  }

  if (els.retry) els.retry.addEventListener('click', () => { run(); });

  run();

  return { run };
}
