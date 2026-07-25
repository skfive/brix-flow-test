/**
 * sync-status/status.js — 동기화 상태 센터 상태 전이 로직 + KPI 집계 + DOM 인터랙션 (BF-1164)
 *
 * planner 명세(BF-1162) §7 함수 Contract / §8 KPI / §3.3 전이 표를 그대로 구현한다.
 * - 순수 함수(startSync/resolveSync/nextOutcome/recordCheckCost/recordRetryOutcome)는
 *   타이머·DOM·난수 의존이 전혀 없다 → node --test 로 결정론적 단위 검증 가능.
 * - 실제 timestamp(performance.now())와 setTimeout UX 딜레이는 DOM 배선 코드에서만 다룬다.
 *
 * UMD 패턴: 브라우저 전역 `window.SyncStatus`, Node 테스트 환경 `module.exports`.
 */
(function (global) {
  'use strict';

  // ── 상수: 상태 6종 라벨/glyph, 전이 규칙 ────────────────────────────────

  /** planner §2 상태 6종 → 한글 라벨 (색 비의존 텍스트 병기) */
  var STATE_LABEL = {
    idle: '미확인',
    up_to_date: '최신',
    behind: '지연',
    syncing: '동기화중',
    conflict: '충돌',
    failed: '실패',
  };

  /** 상태 배지 선행 glyph (aria-hidden) — designer §5 톤 */
  var STATE_GLYPH = {
    idle: '○',
    up_to_date: '✓',
    behind: '↧',
    syncing: '◐',
    conflict: '⇆',
    failed: '⚠',
  };

  /** 정렬 우선순위: 급한 것 위로 (designer §5 기본 정렬) */
  var STATE_SEVERITY = {
    failed: 0,
    conflict: 1,
    syncing: 2,
    behind: 3,
    idle: 4,
    up_to_date: 5,
  };

  /** check 트리거 허용 상태 */
  var CHECK_STATES = { idle: true, up_to_date: true, behind: true };
  /** retry 트리거 허용 상태 */
  var RETRY_STATES = { conflict: true, failed: true };

  /** fixture outcome → 최종 상태 (planner §3.3 4분기 lookup) */
  var OUTCOME_TO_STATE = {
    clean: 'up_to_date',
    stale: 'behind',
    conflict: 'conflict',
    error: 'failed',
  };

  // ── 순수 함수 (planner §7 Contract) ─────────────────────────────────────

  /**
   * 허용된 (state, trigger) 조합이면 'syncing' 으로 전이. (순수 함수)
   * @param {'idle'|'up_to_date'|'behind'|'conflict'|'failed'} currentState
   * @param {'check'|'retry'} trigger
   * @returns {'syncing'}
   * @throws {TypeError} 허용되지 않는 조합
   */
  function startSync(currentState, trigger) {
    if (trigger === 'check' && CHECK_STATES[currentState]) return 'syncing';
    if (trigger === 'retry' && RETRY_STATES[currentState]) return 'syncing';
    throw new TypeError(
      '허용되지 않는 전이: (' + String(currentState) + ', ' + String(trigger) + ')'
    );
  }

  /**
   * fixture outcome 을 최종 상태로 확정. (순수 함수)
   * @param {'clean'|'stale'|'conflict'|'error'} outcome
   * @returns {'up_to_date'|'behind'|'conflict'|'failed'}
   * @throws {TypeError} 4종 리터럴이 아니면
   */
  function resolveSync(outcome) {
    var next = OUTCOME_TO_STATE[outcome];
    if (!next) throw new TypeError('알 수 없는 outcome: ' + String(outcome));
    return next;
  }

  /**
   * 저장소 fixture 큐에서 다음 outcome 을 결정론적으로 소비 (순환). (순수 함수)
   * @param {{outcomes: string[]}} repoFixture
   * @param {number} cursor - 지금까지 소비한 횟수 (0-based)
   * @returns {string}
   */
  function nextOutcome(repoFixture, cursor) {
    var outcomes = repoFixture.outcomes;
    if (!outcomes || outcomes.length === 0) {
      throw new TypeError('outcomes 큐가 비어 있습니다');
    }
    return outcomes[cursor % outcomes.length];
  }

  /**
   * 확인 1건 소요시간을 KPI 누적 객체에 기록 (불변 갱신 — 새 객체 반환). (순수 함수)
   * @param {{checkDurationsMs: number[]}} metrics
   * @param {number} startedAt
   * @param {number} resolvedAt
   * @returns {{checkDurationsMs: number[]}}
   */
  function recordCheckCost(metrics, startedAt, resolvedAt) {
    return {
      checkDurationsMs: metrics.checkDurationsMs.concat([resolvedAt - startedAt]),
    };
  }

  /**
   * retry 트리거 결과를 KPI 누적 객체에 기록. (순수 함수)
   * finalState 가 conflict/failed 가 아니면 성공으로 집계.
   * @param {{retryAttempts: number, retrySuccesses: number}} metrics
   * @param {'up_to_date'|'behind'|'conflict'|'failed'} finalState
   * @returns {{retryAttempts: number, retrySuccesses: number}}
   */
  function recordRetryOutcome(metrics, finalState) {
    var succeeded = finalState !== 'conflict' && finalState !== 'failed';
    return {
      retryAttempts: metrics.retryAttempts + 1,
      retrySuccesses: metrics.retrySuccesses + (succeeded ? 1 : 0),
    };
  }

  // ── 파생 순수 헬퍼 (요약/정렬/KPI 집계값) ───────────────────────────────

  /** 상태에 맞는 트리거 반환 ('check' | 'retry'). syncing/알수없음은 null. */
  function triggerFor(state) {
    if (CHECK_STATES[state]) return 'check';
    if (RETRY_STATES[state]) return 'retry';
    return null;
  }

  /** 저장소 배열의 상태별 개수 요약 (요약 카드 바). */
  function summarize(repos) {
    var counts = { idle: 0, up_to_date: 0, behind: 0, syncing: 0, conflict: 0, failed: 0 };
    for (var i = 0; i < repos.length; i++) {
      var s = repos[i].state;
      if (counts[s] !== undefined) counts[s] += 1;
    }
    return { total: repos.length, counts: counts };
  }

  /** 급한 것 위로 정렬한 새 배열 반환 (원본 불변). */
  function sortBySeverity(repos) {
    return repos.slice().sort(function (a, b) {
      var sa = STATE_SEVERITY[a.state];
      var sb = STATE_SEVERITY[b.state];
      if (sa !== sb) return sa - sb;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
  }

  /** 평균 확인 비용(ms). 표본 0건이면 null. */
  function averageCheckCost(metrics) {
    var arr = metrics.checkDurationsMs;
    if (!arr.length) return null;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }

  /** 재시도 성공률(0~1). 시도 0건이면 null (NaN 방지). */
  function retrySuccessRate(metrics) {
    if (metrics.retryAttempts === 0) return null;
    return metrics.retrySuccesses / metrics.retryAttempts;
  }

  var pure = {
    STATE_LABEL: STATE_LABEL,
    STATE_GLYPH: STATE_GLYPH,
    STATE_SEVERITY: STATE_SEVERITY,
    startSync: startSync,
    resolveSync: resolveSync,
    nextOutcome: nextOutcome,
    recordCheckCost: recordCheckCost,
    recordRetryOutcome: recordRetryOutcome,
    triggerFor: triggerFor,
    summarize: summarize,
    sortBySeverity: sortBySeverity,
    averageCheckCost: averageCheckCost,
    retrySuccessRate: retrySuccessRate,
  };

  // ── DOM 컨트롤러 (브라우저에서만 실행) ──────────────────────────────────
  // 순수 함수 검증(node --test)에는 영향을 주지 않도록 document 존재 시에만 배선.

  if (typeof document !== 'undefined') {
    initController(global);
  }

  function initController(win) {
    var SYNC_DELAY_MS = 600; // planner §13.3 고정 UX 딜레이 (난수 금지, KPI-1 에 포함됨)
    var STATUS_FILTERS = ['all', 'idle', 'up_to_date', 'behind', 'conflict', 'failed'];
    var FILTER_LABEL = {
      all: '전체',
      idle: '미확인',
      up_to_date: '최신',
      behind: '지연',
      conflict: '충돌',
      failed: '실패',
    };

    var now = win.performance && win.performance.now
      ? function () { return win.performance.now(); }
      : function () { return Date.now(); };

    /** 런타임 상태(in-memory 전용, 새로고침 시 초기화). */
    var model = {
      repos: [],
      statusFilter: 'all',
      isRefreshing: false,
      lastFullSyncAt: null,
      metrics: { checkDurationsMs: [], retryAttempts: 0, retrySuccesses: 0 },
    };

    var el = {}; // DOM 참조 캐시

    function boot() {
      cacheEls();
      loadRepos();
      renderFilters();
      bindGlobal();
      render();
    }

    function cacheEls() {
      el.summary = document.getElementById('summary-bar');
      el.filters = document.getElementById('filter-bar');
      el.list = document.getElementById('repo-list');
      el.empty = document.getElementById('empty-state');
      el.kpi = document.getElementById('kpi-summary');
      el.refresh = document.getElementById('refresh-all');
      el.livePolite = document.getElementById('live-polite');
      el.liveAssertive = document.getElementById('live-assertive');
      el.lastFull = document.getElementById('last-full-sync');
    }

    /** fixture → 런타임 저장소 상태. 로드 실패 시 안전하게 빈 목록(no-data). (EC-04) */
    function loadRepos() {
      try {
        var fx = win.SYNC_FIXTURES;
        if (!fx || !Array.isArray(fx.repos)) throw new Error('fixture 형식 오류');
        model.repos = fx.repos.map(function (r) {
          return {
            id: r.id,
            name: r.name,
            outcomes: r.outcomes,
            divergence: r.divergence || { ahead: 0, behind: 0 },
            state: 'idle', // AC-04: 최초 전부 미확인
            cursor: 0,
            lastCheckedAt: null,
            reason: null,
          };
        });
      } catch (err) {
        model.repos = [];
        if (el.livePolite) {
          el.livePolite.textContent = 'fixture 데이터를 불러오지 못해 표시할 저장소가 없습니다.';
        }
      }
    }

    function bindGlobal() {
      if (el.refresh) {
        el.refresh.addEventListener('click', function () { refreshAll(); });
      }
    }

    function renderFilters() {
      if (!el.filters) return;
      el.filters.innerHTML = '';
      STATUS_FILTERS.forEach(function (key) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'segmented__btn';
        btn.dataset.filter = key;
        btn.textContent = FILTER_LABEL[key];
        btn.setAttribute('aria-pressed', String(model.statusFilter === key));
        btn.addEventListener('click', function () {
          model.statusFilter = key;
          render();
        });
        el.filters.appendChild(btn);
      });
    }

    // ── 렌더 ──────────────────────────────────────────────────────────────

    function render() {
      renderSummary();
      renderFilterState();
      renderList();
      renderKpi();
      renderRefreshBtn();
    }

    function renderSummary() {
      if (!el.summary) return;
      var s = summarize(model.repos);
      var tiles = [
        { key: 'total', label: '전체', value: s.total, mod: '' },
        { key: 'up_to_date', label: '최신', value: s.counts.up_to_date, mod: 'summary-tile--synced' },
        { key: 'behind', label: '지연', value: s.counts.behind, mod: 'summary-tile--behind' },
        { key: 'conflict', label: '충돌', value: s.counts.conflict, mod: 'summary-tile--conflict' },
        { key: 'failed', label: '실패', value: s.counts.failed, mod: 'summary-tile--error' },
      ];
      el.summary.innerHTML = '';
      tiles.forEach(function (t) {
        var tile = document.createElement('div');
        tile.className = 'summary-tile ' + t.mod +
          // 값이 0이면 강조 해제 (0은 danger 아님 — designer §6.2)
          (t.value === 0 ? ' summary-tile--zero' : '');
        var dot = document.createElement('span');
        dot.className = 'summary-tile__dot';
        dot.setAttribute('aria-hidden', 'true');
        var value = document.createElement('span');
        value.className = 'summary-tile__value';
        value.textContent = String(t.value);
        var label = document.createElement('span');
        label.className = 'summary-tile__label';
        label.textContent = t.label;
        tile.appendChild(dot);
        tile.appendChild(value);
        tile.appendChild(label);
        el.summary.appendChild(tile);
      });
      if (el.lastFull) {
        el.lastFull.textContent = model.lastFullSyncAt || '—';
      }
    }

    function renderFilterState() {
      if (!el.filters) return;
      var btns = el.filters.querySelectorAll('.segmented__btn');
      for (var i = 0; i < btns.length; i++) {
        var active = btns[i].dataset.filter === model.statusFilter;
        btns[i].setAttribute('aria-pressed', String(active));
        btns[i].classList.toggle('segmented__btn--active', active);
      }
    }

    function renderList() {
      if (!el.list) return;
      el.list.innerHTML = '';

      if (model.repos.length === 0) {
        showEmpty('no-data');
        return;
      }
      var filtered = model.repos.filter(function (r) {
        return model.statusFilter === 'all' || r.state === model.statusFilter;
      });
      if (filtered.length === 0) {
        showEmpty('no-match');
        return;
      }
      hideEmpty();

      sortBySeverity(filtered).forEach(function (repo) {
        el.list.appendChild(renderRow(repo));
      });
    }

    function renderRow(repo) {
      var li = document.createElement('li');
      li.className = 'repo-row repo-row--' + repo.state;
      li.dataset.state = repo.state; // planner §6.2 data-state 고정
      li.dataset.repoId = repo.id;

      var head = document.createElement('div');
      head.className = 'repo-row__head';

      var name = document.createElement('span');
      name.className = 'repo-row__name';
      name.textContent = repo.name;

      head.appendChild(name);
      head.appendChild(renderBadge(repo.state));
      head.appendChild(renderMeta(repo));
      head.appendChild(renderActionBtn(repo));
      li.appendChild(head);

      if (repo.state === 'conflict' || repo.state === 'failed') {
        li.appendChild(renderErrorPanel(repo));
      }
      return li;
    }

    function renderBadge(state) {
      var badge = document.createElement('span');
      badge.className = 'status-badge status-badge--' + state;
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', '동기화 상태: ' + STATE_LABEL[state]);
      var glyph = document.createElement('span');
      glyph.className = 'status-badge__glyph' + (state === 'syncing' ? ' status-badge__glyph--spin' : '');
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = STATE_GLYPH[state];
      var text = document.createElement('span');
      text.textContent = STATE_LABEL[state];
      badge.appendChild(glyph);
      badge.appendChild(text);
      return badge;
    }

    function renderMeta(repo) {
      var meta = document.createElement('span');
      meta.className = 'repo-row__meta';

      var time = document.createElement('time');
      time.className = 'repo-row__time';
      if (repo.lastCheckedAt) {
        time.dateTime = repo.lastCheckedAt.iso;
        time.textContent = repo.lastCheckedAt.label;
      } else {
        time.textContent = '미확인';
      }
      meta.appendChild(time);

      var div = document.createElement('span');
      div.className = 'repo-row__divergence';
      div.textContent = divergenceLabel(repo);
      meta.appendChild(div);
      return meta;
    }

    /** ahead/behind 표시 라벨. idle/failed 는 값 미상(—). */
    function divergenceLabel(repo) {
      if (repo.state === 'idle' || repo.state === 'failed') return '↑— ↓—';
      if (repo.state === 'up_to_date') return '↑0 ↓0';
      var d = repo.divergence;
      return '↑' + d.ahead + ' ↓' + d.behind;
    }

    function renderActionBtn(repo) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'repo-row__sync';
      btn.dataset.repoId = repo.id;

      if (repo.state === 'syncing') {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.textContent = '확인 중…';
      } else {
        var trig = triggerFor(repo.state);
        btn.textContent = trig === 'retry' ? '재시도' : '지금 확인';
        btn.addEventListener('click', function () { runSync(repo.id); });
      }
      return btn;
    }

    function renderErrorPanel(repo) {
      var reasons = win.SYNC_REASONS || {};
      var r = reasons[repo.state] || { text: '동기화에 실패했습니다', hint: '' };
      var panel = document.createElement('div');
      panel.className = 'repo-row__error';
      panel.setAttribute('role', 'alert');

      var glyph = document.createElement('span');
      glyph.className = 'repo-row__error-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = '⚠';

      var body = document.createElement('div');
      body.className = 'repo-row__error-body';
      var cause = document.createElement('p');
      cause.className = 'repo-row__error-cause';
      cause.textContent = repo.reason ? repo.reason.text : r.text;
      var hint = document.createElement('p');
      hint.className = 'repo-row__error-hint';
      hint.textContent = repo.reason ? repo.reason.hint : r.hint;
      body.appendChild(cause);
      body.appendChild(hint);

      panel.appendChild(glyph);
      panel.appendChild(body);
      return panel;
    }

    function renderKpi() {
      if (!el.kpi) return;
      var avg = averageCheckCost(model.metrics);
      var rate = retrySuccessRate(model.metrics);
      var avgText = avg === null ? '데이터 없음' : Math.round(avg) + ' ms';
      var rateText = rate === null ? '데이터 없음' : Math.round(rate * 100) + '%';
      el.kpi.innerHTML =
        '<div class="kpi-item"><span class="kpi-item__label">평균 확인 비용</span>' +
        '<span class="kpi-item__value">' + avgText + '</span></div>' +
        '<div class="kpi-item"><span class="kpi-item__label">재시도 성공률</span>' +
        '<span class="kpi-item__value">' + rateText + '</span></div>' +
        '<p class="kpi-note">새로고침 시 측정값은 초기화됩니다(외부 전송 없음).</p>';
    }

    function renderRefreshBtn() {
      if (!el.refresh) return;
      el.refresh.disabled = model.isRefreshing;
      el.refresh.setAttribute('aria-busy', String(model.isRefreshing));
      el.refresh.textContent = model.isRefreshing ? '새로고침 중…' : '↻ 전체 새로고침';
    }

    // ── 상태 전이 배선 (실제 timestamp/딜레이는 여기서만) ────────────────

    function findRepo(id) {
      for (var i = 0; i < model.repos.length; i++) {
        if (model.repos[i].id === id) return model.repos[i];
      }
      return null;
    }

    /**
     * 저장소 1건 동기화 실행. syncing 중이면 무시(중복 차단 — AC-05).
     * @returns {boolean} 실제 시작 여부
     */
    function runSync(id) {
      var repo = findRepo(id);
      if (!repo || repo.state === 'syncing') return false;

      var trigger = triggerFor(repo.state);
      if (!trigger) return false;

      var startedAt = now();
      repo.state = startSync(repo.state, trigger); // → 'syncing'
      announce('polite', '`' + repo.name + '` 동기화를 시작했습니다.');
      render();

      win.setTimeout(function () {
        var outcome = nextOutcome({ outcomes: repo.outcomes }, repo.cursor);
        repo.cursor += 1;
        var finalState = resolveSync(outcome);
        var resolvedAt = now();

        repo.state = finalState;
        repo.lastCheckedAt = stampNow();
        repo.reason = (finalState === 'conflict' || finalState === 'failed')
          ? (win.SYNC_REASONS && win.SYNC_REASONS[finalState]) || null
          : null;

        // KPI 집계 (planner §8)
        model.metrics = recordCheckCost(model.metrics, startedAt, resolvedAt);
        if (trigger === 'retry') {
          model.metrics = recordRetryOutcome(model.metrics, finalState);
        }

        announceResolution(repo, finalState);
        render();
      }, SYNC_DELAY_MS);
      return true;
    }

    /** 전체 새로고침: 진행 가능한 모든 저장소를 각자 동기화. (전역 vs 지역 분리) */
    function refreshAll() {
      if (model.isRefreshing) return;
      var targets = model.repos.filter(function (r) { return r.state !== 'syncing'; });
      if (targets.length === 0) return;

      model.isRefreshing = true;
      renderRefreshBtn();
      announce('polite', '전체 새로고침을 시작했습니다.');

      targets.forEach(function (r) {
        runSync(r.id);
      });

      // 모든 저장소의 딜레이 완료 후 요약 안내 (고정 딜레이라 단일 타이머로 충분)
      win.setTimeout(function () {
        model.isRefreshing = false;
        model.lastFullSyncAt = stampNow().label;
        var s = summarize(model.repos);
        announce(
          'polite',
          '전체 새로고침 완료 — 최신 ' + s.counts.up_to_date +
          ', 지연 ' + s.counts.behind +
          ', 충돌 ' + s.counts.conflict +
          ', 실패 ' + s.counts.failed + '.'
        );
        render();
      }, SYNC_DELAY_MS + 40);
    }

    function announceResolution(repo, finalState) {
      if (finalState === 'failed' || finalState === 'conflict') {
        var reason = win.SYNC_REASONS && win.SYNC_REASONS[finalState];
        announce(
          'assertive',
          '`' + repo.name + '` 동기화에 실패했습니다. 원인: ' + (reason ? reason.text : STATE_LABEL[finalState])
        );
      } else {
        announce('polite', '`' + repo.name + '` 동기화가 완료되었습니다 (' + STATE_LABEL[finalState] + ').');
      }
    }

    function announce(politeness, message) {
      var target = politeness === 'assertive' ? el.liveAssertive : el.livePolite;
      if (target) target.textContent = message;
    }

    function showEmpty(variant) {
      if (!el.empty) return;
      el.empty.hidden = false;
      el.empty.className = 'empty-state empty-state--' + variant;
      var title = variant === 'no-data' ? '표시할 저장소가 없습니다' : '조건에 맞는 저장소가 없습니다';
      var body = variant === 'no-data'
        ? '저장소를 연결하면 동기화 상태가 여기에 표시됩니다.'
        : '필터를 변경하면 다른 결과를 볼 수 있어요.';
      el.empty.innerHTML =
        '<span class="empty-state__glyph" aria-hidden="true">◍</span>' +
        '<p class="empty-state__title">' + title + '</p>' +
        '<p class="empty-state__body">' + body + '</p>';
    }

    function hideEmpty() {
      if (el.empty) el.empty.hidden = true;
    }

    /** 현재 시각을 표시 라벨(HH:MM)+ISO 로 캡처 (표시 전용). */
    function stampNow() {
      var d = new Date();
      var hh = String(d.getHours()).padStart(2, '0');
      var mm = String(d.getMinutes()).padStart(2, '0');
      return { iso: d.toISOString(), label: hh + ':' + mm };
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  // ── export ──────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = pure;
  } else {
    global.SyncStatus = pure;
  }
})(typeof window !== 'undefined' ? window : globalThis);
