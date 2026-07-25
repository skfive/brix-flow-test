/**
 * sync-status/fixtures.js — 동기화 상태 센터 정적 fixture 데이터 (BF-1164)
 *
 * planner 명세(BF-1162) §3.2 를 따른다.
 * - 외부 API/네트워크 호출 0건, 비밀 정보 0건 — 정적 더미 데이터만 포함한다.
 * - 각 저장소는 독립된 `outcomes` 큐를 가지며 cursor 순서대로 소비(순환)된다.
 * - outcome 리터럴은 'clean' | 'stale' | 'conflict' | 'error' 4종만 허용.
 *
 * UMD 패턴: 브라우저 전역 `window.SYNC_FIXTURES`, Node 테스트 환경 `module.exports`.
 * (file:// 에서 ESM CORS 차단 회피 — 본 repo 관례 승계)
 */
(function (global) {
  'use strict';

  /**
   * 저장소별 시나리오 큐.
   * - name: 표시용 저장소 식별자(org/repo, mono 표기)
   * - outcomes: 확인/재시도 시마다 순서대로 소비되는 결과 큐(순환)
   * - divergence: behind/conflict 상태에서 표시할 ahead/behind 값(정적, 결정론적)
   */
  var SYNC_FIXTURES = {
    repos: [
      {
        id: 'repo-alpha',
        name: 'brix-flow/brix-web',
        outcomes: ['clean', 'stale', 'clean', 'conflict'],
        divergence: { ahead: 2, behind: 5 },
      },
      {
        id: 'repo-beta',
        name: 'brix-flow/brix-api',
        outcomes: ['error', 'error', 'clean'],
        divergence: { ahead: 0, behind: 3 },
      },
      {
        id: 'repo-gamma',
        name: 'brix-flow/brix-docs',
        outcomes: ['stale', 'clean'],
        divergence: { ahead: 1, behind: 4 },
      },
      {
        id: 'repo-delta',
        name: 'brix-flow/brix-infra',
        outcomes: ['conflict', 'clean', 'stale'],
        divergence: { ahead: 3, behind: 2 },
      },
    ],
  };

  /**
   * 오류/충돌 원인 문구 사전 (designer 명세 BF-1163 §7.1 톤).
   * 색이 아니라 텍스트로 원인·다음 행동을 전달한다(색 비의존).
   * 최종 상태('conflict' | 'failed')로 조회한다.
   */
  var SYNC_REASONS = {
    conflict: {
      text: '로컬 변경과 원격 변경이 충돌합니다',
      hint: '충돌을 해결한 뒤 다시 동기화하세요.',
    },
    failed: {
      text: '원격 저장소에 연결할 수 없습니다 (timeout)',
      hint: '네트워크 상태를 확인한 뒤 재시도하세요.',
    },
  };

  var api = { SYNC_FIXTURES: SYNC_FIXTURES, SYNC_REASONS: SYNC_REASONS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.SYNC_FIXTURES = SYNC_FIXTURES;
    global.SYNC_REASONS = SYNC_REASONS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
