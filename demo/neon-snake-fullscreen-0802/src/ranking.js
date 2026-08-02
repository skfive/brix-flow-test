// 네온 스네이크 · 랭킹 보드 표현/검증 + DOM 보드 컨트롤러 (BF-1550)
// 설계 기준: docs/plans/snake-ranking-plan-BF-1548.md §3.2, §6, §7 (ui-contract@v1)
//
// 표현·검증 로직(isValidNickname/topEntries/statusText)은 DOM/window/네트워크/시간/난수에
// 의존하지 않는 순수 함수다(frozen §3.2). createRankingBoard 는 주입된 fetchImpl(frozen §3.1
// 네트워크 계층)과 DOM 요소로 배선되며, fetchImpl·요소를 페이크로 주입하면 결정론적으로 검증된다.

import { fetchScores, submitScore, RANKING_PERIODS } from './scores-api.js';

// frozen §3.2 · 닉네임 유효성: trim 후 비어 있지 않은가(클라이언트 방어).
// 요청 미발송(빈/공백 닉네임 → idle 유지)만 담당한다. 한글/영문/숫자 2~12자 등 전체 규칙은
// 서버측 검증(scores-api.js isValidNicknameStrict → 400)의 책임이다.
export function isValidNickname(nickname) {
  return typeof nickname === 'string' && nickname.trim().length > 0;
}

// frozen §3.2 · 상태별 화면 텍스트 (ui-contract@v1 §6.2).
export function statusText(state, rank) {
  switch (state) {
    case 'submitting':
      return '등록 중…';
    case 'success':
      return `등록 완료 · 내 순위 ${rank}위`;
    case 'error':
      return '랭킹을 불러올 수 없습니다';
    case 'idle':
    default:
      return '';
  }
}

// frozen §3.2 · 상위 N개 정렬·절삭: score 내림차순 상위 limit 개, 각 항목에 1-based rank 부여.
// 비배열/빈 배열은 [] 반환. 이미 rank 가 있어도 정렬 결과 기준으로 다시 부여한다.
export function topEntries(entries, limit = 10) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      nickname: entry.nickname,
      score: entry.score,
      recordedAt: entry.recordedAt,
    }));
}

// 랭킹 보드 DOM 컨트롤러 (ui-contract@v1 §6, planning-contract §7 hook).
// elements: { boardEl(#snake-rank-board), nicknameEl(#snake-rank-nickname),
//             submitEl(#snake-rank-submit), statusEl(#snake-rank-status) }
// fetchImpl: frozen §3.1 네트워크 계층에 주입할 fetch 구현(브라우저는 window.fetch 또는
//            정적 데모용 createStoreFetch, 테스트는 페이크 fetch).
// DOM 은 boardEl.ownerDocument 로 접근하여 전역 document 에 의존하지 않는다.
export function createRankingBoard({ boardEl, nicknameEl, submitEl, statusEl, fetchImpl }) {
  const doc = boardEl.ownerDocument;
  let context = { score: 0, mode: 'local' };

  function setState(state, rank) {
    statusEl.textContent = statusText(state, rank);
    // submitting 중에만 버튼을 비활성화 → idle/success/error 에서는 재활성(control 재사용).
    submitEl.disabled = state === 'submitting';
  }

  // 상위 10개 순위 행(순위·닉네임·점수)을 화면 텍스트로 렌더한다.
  function renderEntries(entries) {
    const rows = topEntries(entries, 10);
    boardEl.replaceChildren(
      ...rows.map((entry) => {
        const row = doc.createElement('div');
        row.className = 'snake-rank__row';
        row.textContent = `${entry.rank}위 · ${entry.nickname} · ${entry.score}`;
        return row;
      }),
    );
  }

  // 종료 화면 진입 시: 확정 점수·모드 바인딩 + 상위 랭킹 조회(idle). 실패 시 error.
  async function open({ score, mode }) {
    context = { score, mode };
    setState('idle');
    try {
      const { entries } = await fetchScores(fetchImpl, { mode, limit: 10 });
      renderEntries(entries);
    } catch {
      setState('error');
    }
  }

  // "랭킹 등록" 클릭: 유효 닉네임이면 submitting → 등록 → success + 보드 갱신, 실패 시 error.
  async function submit() {
    const nickname = nicknameEl.value;
    if (!isValidNickname(nickname)) {
      setState('idle'); // 빈/공백 닉네임은 요청 없이 idle 유지(클라이언트 방어).
      return;
    }
    setState('submitting');
    try {
      const { rank, entries } = await submitScore(fetchImpl, {
        nickname,
        score: context.score,
        mode: context.mode,
      });
      renderEntries(entries);
      setState('success', rank);
    } catch {
      // 실패 시 error 표시 + 버튼 재활성(control 재사용). 게임 흐름은 호출 측에서 보존.
      setState('error');
    }
  }

  // 초기화·취소·재시작: 보드를 idle 초기값으로 되돌린다(후조건 복원).
  function reset() {
    context = { score: 0, mode: 'local' };
    boardEl.replaceChildren();
    if ('value' in nicknameEl) {
      nicknameEl.value = '';
    }
    setState('idle');
  }

  submitEl.addEventListener('click', submit);

  return { open, submit, reset };
}

// ============================================================================
// BF-1554 · 랭킹 기간 필터 토글 (frozen ui-contract@v1 §4, additive)
// 기존 createRankingBoard(등록 흐름)와 독립적인 additive 컨트롤러. 전체/최근 7일 토글을
// 재조회·상태 표시하며 selector·token 을 재정의하지 않는다.
// ============================================================================

// frozen §4.2 · 기간 필터 상태별 화면 텍스트. 색상 외에 상태명/문구를 텍스트로 노출한다.
// idle/success 는 보드 자체가 결과를 표현하므로 빈 문자열, loading/error 는 명시 문구.
export function periodStatusText(state) {
  switch (state) {
    case 'loading':
      return '랭킹 불러오는 중…';
    case 'error':
      return '랭킹을 불러올 수 없습니다';
    case 'success':
    case 'idle':
    default:
      return '';
  }
}

// 기간 필터 랭킹 보드 컨트롤러 (frozen ui-contract@v1 §4).
// elements: { toggleEl(#ranking-period-toggle), allEl(#ranking-period-all),
//             sevenEl(#ranking-period-7d), listEl(#ranking-board-list), statusEl }
// fetchImpl: frozen §3.1 네트워크 계층(fetchScores 에 주입). mode 는 조회 대상 게임 모드.
// 상태: idle → loading → success/error. 실패·취소·초기화 뒤에는 전체(all) 초기값으로 복원하고
//       토글 control 을 항상 사용 가능하게 유지한다(비활성화하지 않는다).
export function createPeriodRankingBoard({ toggleEl, allEl, sevenEl, listEl, statusEl, fetchImpl }) {
  const doc = listEl.ownerDocument;
  const optionByPeriod = { all: allEl, '7d': sevenEl };
  let context = { mode: 'local' };
  let period = 'all'; // 초기 상태: 전체
  let requestId = 0; // 경쟁/취소 방지: 최신 요청 결과만 반영

  // 선택된 기간에 active class·aria-pressed 를 반영(색상 외 상태도 접근성 이름으로 노출).
  function setActive(next) {
    period = next;
    for (const key of RANKING_PERIODS) {
      const btn = optionByPeriod[key];
      const active = key === next;
      btn.classList.toggle('ranking-toggle__option--active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function setState(state) {
    statusEl.textContent = periodStatusText(state);
    // 토글은 loading 중에도 비활성화하지 않는다 → 재선택 가능(control 재사용 후조건).
  }

  // 상위 10개 순위 행을 화면 텍스트로 렌더한다(createRankingBoard 와 동일한 행 표현).
  function renderEntries(entries) {
    const rows = topEntries(entries, 10);
    listEl.replaceChildren(
      ...rows.map((entry) => {
        const row = doc.createElement('div');
        row.className = 'snake-rank__row';
        row.setAttribute('role', 'listitem');
        row.textContent = `${entry.rank}위 · ${entry.nickname} · ${entry.score}`;
        return row;
      }),
    );
  }

  // 선택 기간으로 재조회: loading → success(렌더)/error. 오래된 응답은 폐기한다.
  async function load(next) {
    setActive(next);
    setState('loading');
    const myId = (requestId += 1);
    try {
      const { entries } = await fetchScores(fetchImpl, {
        mode: context.mode,
        limit: 10,
        period: next,
      });
      if (myId !== requestId) return; // 더 최신 요청이 있으면 이 결과는 무시
      renderEntries(entries);
      setState('success');
    } catch {
      if (myId !== requestId) return;
      // 조회 실패 → error 텍스트 표시. 토글은 재사용 가능 상태로 유지(게임 흐름 미영향).
      setState('error');
    }
  }

  function select(next) {
    if (!RANKING_PERIODS.includes(next)) return;
    void load(next);
  }

  // 종료 화면 진입: 모드 바인딩 + 전체(all) 기준 초기 조회.
  function open({ mode }) {
    context = { mode };
    return load('all');
  }

  // 초기화·취소·재시작: 진행 중 요청을 무효화하고 전체(all) 초기 상태로 복원한다(후조건 복원).
  function reset() {
    requestId += 1; // 진행 중 조회 취소
    context = { mode: 'local' };
    listEl.replaceChildren();
    setActive('all');
    setState('idle');
  }

  // frozen §4.4 · 좌우 화살표 키로 옵션 간 이동(이동 후 선택 반영).
  function onKeyDown(event) {
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = key === 'ArrowRight' ? 1 : -1;
    const idx = RANKING_PERIODS.indexOf(period);
    const next = RANKING_PERIODS[(idx + delta + RANKING_PERIODS.length) % RANKING_PERIODS.length];
    const btn = optionByPeriod[next];
    if (typeof btn.focus === 'function') {
      btn.focus();
    }
    select(next);
  }

  allEl.addEventListener('click', () => select('all'));
  sevenEl.addEventListener('click', () => select('7d'));
  toggleEl.addEventListener('keydown', onKeyDown);

  setActive('all');
  setState('idle');

  return { open, select, reset };
}
