// 탭 전환 데모 런타임 (vanilla ESM, 외부 의존성 0).
// DOM 무의존 순수 로직을 분리해 node --test 에서 shim 없이 검증 가능하게 하고,
// 브라우저 배선은 typeof document 가드로 감싼다.

// frozen 초기 상태
export const INITIAL_STATE = 'first-selected';

// 상태 ↔ 탭/패널 매핑 (frozen)
const TAB_TO_STATE = {
  'tab-first': 'first-selected',
  'tab-second': 'second-selected',
};

const STATE_TO_DOM = {
  'first-selected': { tab: 'tab-first', panel: 'panel-first' },
  'second-selected': { tab: 'tab-second', panel: 'panel-second' },
};

// 상태 전환 순수 함수.
// 알 수 없는/미지정 tabId 는 후조건에 따라 초기값(first-selected)으로 복원한다.
export function selectTab(state, tabId) {
  return TAB_TO_STATE[tabId] ?? INITIAL_STATE;
}

// §3.3 마크업 골격 문자열 반환 (계약 selector·초기 활성 class·aria 속성 포함).
export function tabsMarkup() {
  return `<div class="tabs">
  <div class="tabs__tablist" role="tablist" aria-label="탭 데모">
    <button id="tab-first" class="tabs__tab tabs__tab--active" type="button"
            role="tab" aria-selected="true" aria-controls="panel-first">첫 번째 탭</button>
    <button id="tab-second" class="tabs__tab" type="button"
            role="tab" aria-selected="false" aria-controls="panel-second">두 번째 탭</button>
  </div>
  <section id="panel-first" class="tabs__panel tabs__panel--active"
           role="tabpanel" aria-labelledby="tab-first">첫 번째 탭 내용</section>
  <section id="panel-second" class="tabs__panel"
           role="tabpanel" aria-labelledby="tab-second" hidden>두 번째 탭 내용</section>
</div>`;
}

// 주어진 상태에 맞춰 DOM 을 갱신한다. 어떤 탭도 disabled 처리하지 않는다.
function render(doc, state) {
  const active = STATE_TO_DOM[state] ?? STATE_TO_DOM[INITIAL_STATE];

  for (const [tabId, mapping] of Object.entries(STATE_TO_DOM)) {
    const tab = doc.getElementById(mapping.tab);
    const panel = doc.getElementById(mapping.panel);
    if (!tab || !panel) continue;

    const isActive = mapping.tab === active.tab;
    tab.classList.toggle('tabs__tab--active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    panel.classList.toggle('tabs__panel--active', isActive);
    panel.hidden = !isActive;
  }
}

// 두 탭 버튼에 배선하고 초기 상태를 복원한다.
// <button> 은 클릭·Enter·Space 를 기본 지원하므로 click 리스너만으로 키보드 활성화가 동작한다.
export function init(doc) {
  if (!doc) return;

  const firstTab = doc.getElementById('tab-first');
  const secondTab = doc.getElementById('tab-second');
  if (!firstTab || !secondTab) return;

  for (const tab of [firstTab, secondTab]) {
    tab.addEventListener('click', () => {
      render(doc, selectTab(INITIAL_STATE, tab.id));
    });
  }

  // 초기 로드 시 첫 번째 탭 활성 상태 복원
  render(doc, INITIAL_STATE);
}

if (typeof document !== 'undefined') {
  init(document);
}
