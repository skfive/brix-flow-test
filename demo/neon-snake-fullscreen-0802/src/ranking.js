// 네온 스네이크 · 랭킹 보드 표현/검증 + API 클라이언트 + DOM 보드 컨트롤러 (BF-1550)
// 설계 기준: docs/plans/snake-ranking-plan-BF-1548.md §3, §6, §7 (ui-contract@v1)
//
// 표현·검증 로직(statusText/topEntries/isValidNickname)은 DOM/네트워크에 의존하지 않는
// 순수 함수다. createLocalClient/createRankingBoard 는 주입된 저장소·DOM 요소로 배선되며,
// 저장소·요소를 페이크로 주입하면 결정론적으로 검증된다.

import { isValidNickname } from './scores-api.js';

// 닉네임 검증은 저장소와 동일 규칙(scores-api)을 재사용해 클라이언트 방어를 일치시킨다.
export { isValidNickname };

// frozen 상태별 화면 텍스트 (ui-contract@v1 §6.2).
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

// 상위 N개 정렬·절삭: score 내림차순 상위 limit 개, 각 항목에 1-based rank 부여.
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

// in-process API 클라이언트: 주입된 저장소({ post, get })를 호출해
// 비 2xx 응답은 throw(→ UI error 상태), 2xx 는 body 를 반환한다(관심사 분리).
export function createLocalClient(store) {
  return {
    async fetchScores({ mode, limit = 10 }) {
      const res = store.get({ mode, limit });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`랭킹 조회 실패: ${res.status}`);
      }
      return res.body; // { entries }
    },
    async submitScore({ nickname, score, mode }) {
      const res = store.post({ nickname, score, mode });
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`랭킹 등록 실패: ${res.status}`);
      }
      return res.body; // { rank, entries }
    },
  };
}

// 랭킹 보드 DOM 컨트롤러 (ui-contract@v1 §6, planning-contract §7 hook).
// elements: { boardEl(#snake-rank-board), nicknameEl(#snake-rank-nickname),
//             submitEl(#snake-rank-submit), statusEl(#snake-rank-status) }
// client: { fetchScores, submitScore } (createLocalClient 결과 또는 fetch 어댑터).
// DOM 은 boardEl.ownerDocument 로 접근하여 전역 document 에 의존하지 않는다.
export function createRankingBoard({ boardEl, nicknameEl, submitEl, statusEl, client }) {
  const doc = boardEl.ownerDocument;
  let context = { score: 0, mode: 'single' };

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
      const { entries } = await client.fetchScores({ mode, limit: 10 });
      renderEntries(entries);
    } catch {
      setState('error');
    }
  }

  // "랭킹 등록" 클릭: 유효 닉네임이면 submitting → 등록 → success + 보드 갱신, 실패 시 error.
  async function submit() {
    const nickname = nicknameEl.value;
    if (!isValidNickname(nickname)) {
      setState('idle'); // 빈/무효 닉네임은 요청 없이 idle 유지(클라이언트 방어).
      return;
    }
    setState('submitting');
    try {
      const { rank, entries } = await client.submitScore({
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
    context = { score: 0, mode: 'single' };
    boardEl.replaceChildren();
    if ('value' in nicknameEl) {
      nicknameEl.value = '';
    }
    setState('idle');
  }

  submitEl.addEventListener('click', submit);

  return { open, submit, reset };
}
