// 리뷰 재작업 자동수렴 상태 패널 — 브라우저 엔트리 (ESM)
// BF-1195: 정적 카나리 데이터(JSON 3종)를 fetch 하여 상태 패널을 마운트한다.

import { renderStatusPanel } from './render.js';

export const DATA_BASE = '/src/demo/review-revision-canary/data';

/**
 * 정적 카나리 데이터 3종을 모두 로드한다.
 * @param {typeof fetch} [fetchImpl]
 * @param {string} [base]
 * @returns {Promise<{ stage: object, revision: object, review: object }>}
 */
export async function loadCanaryData(fetchImpl = fetch, base = DATA_BASE) {
  const files = ['stage.json', 'revision.json', 'review.json'];
  const [stage, revision, review] = await Promise.all(
    files.map(async (name) => {
      const res = await fetchImpl(`${base}/${name}`);
      if (!res.ok) {
        throw new Error(`정적 데이터 로딩 실패: ${name} (${res.status})`);
      }
      return res.json();
    }),
  );
  return { stage, revision, review };
}

/**
 * 상태 패널을 지정한 루트 엘리먼트에 마운트한다.
 * @param {HTMLElement} root
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<object>}
 */
export async function mount(root, fetchImpl = fetch) {
  const data = await loadCanaryData(fetchImpl);
  root.innerHTML = renderStatusPanel(data);
  return data;
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  if (root) {
    mount(root).catch((err) => {
      root.innerHTML = `<p class="error" role="alert">데이터 로딩 실패: ${String(err && err.message)}</p>`;
    });
  }
}
