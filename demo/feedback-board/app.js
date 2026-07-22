/*
 * 고객 피드백 보드 — 앱 로직 (BF-1075)
 * 기획: docs/planning/feedback-board-BF-1072.md
 * 디자인: docs/design/feedback-board-BF-1072.md
 *
 * vanilla-static 규약:
 *  - ESM import/export 없음, <script type="module"> 없음, fetch 없음, 외부 CDN 없음.
 *  - localStorage 만 사용. 순수 로직은 아래 조건부 CommonJS 로 node --test 에 노출.
 *  - 브라우저에서는 IIFE 로 즉시 실행, 전역 window.FeedbackBoard 로도 접근 가능.
 */
(function (root) {
  'use strict';

  // ── 상수 ──
  var STORAGE_KEY = 'feedback-board:v1';
  var SCHEMA_VERSION = 1;
  var CATEGORIES = ['bug', 'feature', 'improvement', 'other'];
  var STATUSES = ['open', 'planned', 'done'];
  var TITLE_MAX = 100;
  var CONTENT_MAX = 2000;

  var CATEGORY_LABEL = { bug: '버그', feature: '기능', improvement: '개선', other: '기타' };
  var STATUS_LABEL = { open: '접수', planned: '계획됨', done: '완료' };

  // 허용 전이 (기획 §4.2) — 역행 미노출 (§4.3)
  var TRANSITIONS = {
    open: ['planned', 'done'],
    planned: ['done'],
    done: [],
  };

  // ─────────────────────────────────────────────
  // 순수 로직 (테스트 대상)
  // ─────────────────────────────────────────────

  function uuidv4() {
    if (root && root.crypto && typeof root.crypto.randomUUID === 'function') {
      return root.crypto.randomUUID();
    }
    // 폴백 (crypto 미지원 환경)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  // 입력 검증 (AC-2) — 반환 {valid, errors}
  function validateInput(input) {
    input = input || {};
    var errors = {};
    var title = typeof input.title === 'string' ? input.title.trim() : '';
    var content = typeof input.content === 'string' ? input.content.trim() : '';
    var category = input.category;

    if (title.length === 0) {
      errors.title = '제목을 입력하세요.';
    } else if (title.length > TITLE_MAX) {
      errors.title = '제목은 ' + TITLE_MAX + '자 이하로 입력하세요.';
    }

    if (content.length === 0) {
      errors.content = '내용을 입력하세요.';
    } else if (content.length > CONTENT_MAX) {
      errors.content = '내용은 ' + CONTENT_MAX + '자 이하로 입력하세요.';
    }

    if (CATEGORIES.indexOf(category) === -1) {
      errors.category = '카테고리를 선택하세요.';
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  // 신규 레코드 생성 (AC-1) — status 는 항상 open 강제
  function createFeedback(input, nowIso) {
    var result = validateInput(input);
    if (!result.valid) {
      var err = new Error('유효하지 않은 입력입니다.');
      err.errors = result.errors;
      throw err;
    }
    var at = nowIso || new Date().toISOString();
    return {
      id: uuidv4(),
      title: input.title.trim(),
      content: input.content.trim(),
      category: input.category,
      status: 'open',
      createdAt: at,
      updatedAt: at,
      statusHistory: [{ status: 'open', at: at }],
    };
  }

  function transitionsFor(status) {
    return TRANSITIONS[status] ? TRANSITIONS[status].slice() : [];
  }

  // 상태 전이 (AC-3 / AC-4 / §4.4) — 불변(새 객체 반환)
  function applyTransition(record, target, nowIso) {
    if (STATUSES.indexOf(target) === -1) {
      throw new Error('알 수 없는 상태입니다: ' + target);
    }
    // 동일 상태 → no-op (원본 그대로 반환, 이력 미추가)
    if (record.status === target) {
      return record;
    }
    if (transitionsFor(record.status).indexOf(target) === -1) {
      throw new Error('허용되지 않은 전이입니다: ' + record.status + ' → ' + target);
    }
    var at = nowIso || new Date().toISOString();
    return Object.assign({}, record, {
      status: target,
      updatedAt: at,
      statusHistory: record.statusHistory.concat([{ status: target, at: at }]),
    });
  }

  // 필터 (AC-5) — 상태·카테고리 AND, createdAt 내림차순
  function filterItems(items, statusFilter, categoryFilter) {
    var filtered = (items || []).filter(function (it) {
      var okStatus = statusFilter === 'all' || it.status === statusFilter;
      var okCategory = categoryFilter === 'all' || it.category === categoryFilter;
      return okStatus && okCategory;
    });
    return filtered.slice().sort(function (a, b) {
      // 내림차순 (최신순)
      if (a.createdAt < b.createdAt) return 1;
      if (a.createdAt > b.createdAt) return -1;
      return 0;
    });
  }

  // 처리 시간 포맷 (ms → "N일 M시간")
  function formatDuration(ms) {
    if (ms === null || ms === undefined || isNaN(ms)) return '데이터 없음';
    var totalMin = Math.floor(ms / 60000);
    var days = Math.floor(totalMin / (60 * 24));
    var hours = Math.floor((totalMin % (60 * 24)) / 60);
    if (days > 0 && hours > 0) return days + '일 ' + hours + '시간';
    if (days > 0) return days + '일';
    if (hours > 0) return hours + '시간';
    if (totalMin > 0) return totalMin + '분';
    return '1분 미만';
  }

  // 최초 특정 상태 진입 시각
  function firstStatusAt(record, status) {
    var history = record.statusHistory || [];
    for (var i = 0; i < history.length; i++) {
      if (history[i] && history[i].status === status) return history[i].at;
    }
    return null;
  }

  // KPI 계산 (AC-9) — 필터 미적용 전체 기준
  function computeKpis(items) {
    items = items || [];
    var total = items.length;
    var countByStatus = { open: 0, planned: 0, done: 0 };
    var countByCategory = { bug: 0, feature: 0, improvement: 0, other: 0 };
    var leadTimes = [];

    items.forEach(function (it) {
      if (countByStatus[it.status] !== undefined) countByStatus[it.status] += 1;
      if (countByCategory[it.category] !== undefined) countByCategory[it.category] += 1;

      if (it.status === 'done') {
        var openAt = firstStatusAt(it, 'open');
        var doneAt = firstStatusAt(it, 'done');
        if (openAt && doneAt) {
          var diff = new Date(doneAt).getTime() - new Date(openAt).getTime();
          if (!isNaN(diff) && diff >= 0) leadTimes.push(diff);
        }
      }
    });

    var doneCount = countByStatus.done;
    // 완료율 (0-division 방지) — 소수점 1자리
    var completionRateLabel;
    if (total === 0) {
      completionRateLabel = '0%';
    } else {
      completionRateLabel = ((doneCount / total) * 100).toFixed(1) + '%';
    }

    var avgLeadTimeMs = null;
    if (leadTimes.length > 0) {
      var sum = leadTimes.reduce(function (a, b) {
        return a + b;
      }, 0);
      avgLeadTimeMs = Math.round(sum / leadTimes.length);
    }

    return {
      total: total,
      countByStatus: countByStatus,
      countByCategory: countByCategory,
      doneCount: doneCount,
      openBacklog: countByStatus.open,
      completionRateLabel: completionRateLabel,
      avgLeadTimeMs: avgLeadTimeMs,
      avgLeadTimeLabel: avgLeadTimeMs === null ? '데이터 없음' : formatDuration(avgLeadTimeMs),
    };
  }

  // ── 내보내기 (AC-8) ──
  function buildExport(items, nowIso) {
    return {
      exportedAt: nowIso || new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      items: (items || []).slice(),
    };
  }

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function exportFilename(nowIso) {
    var d = new Date(nowIso || new Date().toISOString());
    var stamp =
      d.getUTCFullYear() +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) +
      '-' +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) +
      pad2(d.getUTCSeconds());
    return 'feedback-board-export-' + stamp + '.json';
  }

  // ── persist / 손상 복구 (AC-6 / AC-7 / §6.2) ──

  // 개별 레코드 유효성 (§3.1 필수 필드·enum)
  function isValidRecord(rec) {
    if (!rec || typeof rec !== 'object') return false;
    if (!isNonEmptyString(rec.id)) return false;
    if (!isNonEmptyString(rec.title) || rec.title.trim().length > TITLE_MAX) return false;
    if (!isNonEmptyString(rec.content) || rec.content.trim().length > CONTENT_MAX) return false;
    if (CATEGORIES.indexOf(rec.category) === -1) return false;
    if (STATUSES.indexOf(rec.status) === -1) return false;
    if (!isNonEmptyString(rec.createdAt)) return false;
    if (!isNonEmptyString(rec.updatedAt)) return false;
    if (!Array.isArray(rec.statusHistory)) return false;
    return true;
  }

  // 저장 문자열 → {container, corrupted, droppedCount}
  function parseContainer(raw) {
    var emptyContainer = { schemaVersion: SCHEMA_VERSION, items: [] };

    // 최초 방문(값 없음) — 손상 아님
    if (raw === null || raw === undefined || raw === '') {
      return { container: emptyContainer, corrupted: false, droppedCount: 0 };
    }

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return { container: { schemaVersion: SCHEMA_VERSION, items: [] }, corrupted: true, droppedCount: 0 };
    }

    // 구조 검증 (§6.2-2)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.schemaVersion !== 'number' ||
      !Array.isArray(parsed.items)
    ) {
      return { container: { schemaVersion: SCHEMA_VERSION, items: [] }, corrupted: true, droppedCount: 0 };
    }

    // 레코드 단위 검증 (§6.2-3) — 손상 레코드만 제외
    var valid = [];
    var dropped = 0;
    parsed.items.forEach(function (rec) {
      if (isValidRecord(rec)) valid.push(rec);
      else dropped += 1;
    });

    return {
      container: { schemaVersion: SCHEMA_VERSION, items: valid },
      corrupted: false,
      droppedCount: dropped,
    };
  }

  // storage 로부터 상태 로드 (부수효과: 손상 시 백업·재초기화)
  function loadState(storage, nowIso) {
    var raw = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    var result = parseContainer(raw);

    if (result.corrupted) {
      // 원본 백업 후 재초기화 (§6.2, AC-7)
      var stamp = nowIso || new Date().toISOString();
      try {
        storage.setItem(STORAGE_KEY + ':corrupted:' + stamp, raw);
      } catch (e) {
        /* 백업 실패해도 재초기화는 진행 */
      }
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, items: [] }));
      } catch (e) {
        /* noop */
      }
      return { items: [], recovery: true, droppedCount: 0 };
    }

    if (result.droppedCount > 0 && root && root.console && typeof root.console.warn === 'function') {
      root.console.warn(
        '[feedback-board] 스키마 불일치로 ' + result.droppedCount + '건의 레코드를 제외했습니다.'
      );
    }

    return { items: result.container.items, recovery: false, droppedCount: result.droppedCount };
  }

  // storage 에 저장 (§6.3 quota 초과 시 throw 전파 → 호출측 롤백)
  function saveState(storage, items) {
    var payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, items: items || [] });
    storage.setItem(STORAGE_KEY, payload);
  }

  // ─────────────────────────────────────────────
  // 공개 API
  // ─────────────────────────────────────────────
  var API = {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    CATEGORIES: CATEGORIES,
    STATUSES: STATUSES,
    CATEGORY_LABEL: CATEGORY_LABEL,
    STATUS_LABEL: STATUS_LABEL,
    uuidv4: uuidv4,
    validateInput: validateInput,
    createFeedback: createFeedback,
    transitionsFor: transitionsFor,
    applyTransition: applyTransition,
    filterItems: filterItems,
    formatDuration: formatDuration,
    computeKpis: computeKpis,
    buildExport: buildExport,
    exportFilename: exportFilename,
    isValidRecord: isValidRecord,
    parseContainer: parseContainer,
    loadState: loadState,
    saveState: saveState,
  };

  // node --test 노출 (ESM export 아님 — vanilla-static 규약 준수)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  // 브라우저 전역 노출
  root.FeedbackBoard = API;

  // ─────────────────────────────────────────────
  // DOM 부트스트랩 (브라우저 전용 — node 에서는 실행 안 함)
  // ─────────────────────────────────────────────
  if (typeof document === 'undefined') return;

  var state = {
    items: [],
    statusFilter: 'all',
    categoryFilter: 'all',
    recovery: false,
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return (
      d.getFullYear() +
      '-' +
      pad2(d.getMonth() + 1) +
      '-' +
      pad2(d.getDate()) +
      ' ' +
      pad2(d.getHours()) +
      ':' +
      pad2(d.getMinutes())
    );
  }

  function persist(prevItems) {
    try {
      saveState(root.localStorage, state.items);
      return true;
    } catch (e) {
      // §6.3 quota 초과 등 — 메모리 상태 롤백
      if (prevItems) state.items = prevItems;
      showToast('저장에 실패했습니다. 데이터 양을 줄여주세요.');
      return false;
    }
  }

  function showToast(message) {
    var box = el('fb-toast');
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
    if (root.setTimeout) {
      root.setTimeout(function () {
        box.hidden = true;
      }, 4000);
    }
  }

  // ── 렌더 ──
  function renderKpis() {
    var k = computeKpis(state.items);
    el('kpi-total').textContent = k.total;
    el('kpi-open').textContent = k.countByStatus.open;
    el('kpi-planned').textContent = k.countByStatus.planned;
    el('kpi-done').textContent = k.countByStatus.done;
    el('kpi-rate').textContent = k.completionRateLabel;
    el('kpi-avg').textContent = k.avgLeadTimeLabel;
  }

  function renderList() {
    var listEl = el('fb-list');
    var emptyEl = el('fb-empty');
    var visible = filterItems(state.items, state.statusFilter, state.categoryFilter);

    listEl.innerHTML = '';

    if (visible.length === 0) {
      var noData = state.items.length === 0;
      emptyEl.hidden = false;
      emptyEl.className = 'empty-state ' + (noData ? 'empty-state--no-data' : 'empty-state--no-match');
      emptyEl.innerHTML =
        '<div class="empty-state__icon" aria-hidden="true">' +
        (noData ? '📝' : '🔍') +
        '</div>' +
        '<p class="empty-state__title">' +
        (noData ? '아직 등록된 피드백이 없습니다' : '조건에 맞는 피드백이 없습니다') +
        '</p>' +
        '<p class="empty-state__desc">' +
        (noData ? '위 폼에서 첫 피드백을 등록해 보세요.' : '필터를 변경하면 다른 결과를 볼 수 있어요.') +
        '</p>';
      return;
    }

    emptyEl.hidden = true;
    visible.forEach(function (rec) {
      listEl.appendChild(renderCard(rec));
    });
  }

  function renderCard(rec) {
    var card = document.createElement('article');
    card.className = 'fb-card';
    card.setAttribute('data-id', rec.id);

    var actionsHtml = transitionsFor(rec.status)
      .map(function (target) {
        var label = target === 'planned' ? '계획됨으로' : '완료로';
        return (
          '<button class="btn btn--ghost btn--sm" type="button" data-action="transition" data-target="' +
          target +
          '">' +
          label +
          '</button>'
        );
      })
      .join('');

    card.innerHTML =
      '<div class="fb-card__head">' +
      '<h3 class="fb-card__title">' +
      escapeHtml(rec.title) +
      '</h3>' +
      '<span class="badge badge--' +
      rec.status +
      '"><span class="badge__dot" aria-hidden="true"></span>' +
      STATUS_LABEL[rec.status] +
      '</span>' +
      '</div>' +
      '<p class="fb-card__body">' +
      escapeHtml(rec.content) +
      '</p>' +
      '<div class="fb-card__meta">' +
      '<span class="tag">' +
      (CATEGORY_LABEL[rec.category] || rec.category) +
      '</span>' +
      (actionsHtml ? '<div class="fb-card__actions">' + actionsHtml + '</div>' : '') +
      '<span class="fb-card__date">' +
      formatDate(rec.createdAt) +
      '</span>' +
      '</div>';

    return card;
  }

  function renderRecovery() {
    var banner = el('fb-recovery');
    if (!banner) return;
    banner.hidden = !state.recovery;
  }

  function renderAll() {
    renderKpis();
    renderList();
    renderRecovery();
  }

  // ── 이벤트 ──
  function clearFormErrors(form) {
    ['title', 'content', 'category'].forEach(function (name) {
      var field = form.querySelector('[data-field="' + name + '"]');
      if (field) field.classList.remove('feedback-form__field--error');
      var errEl = form.querySelector('[data-error="' + name + '"]');
      if (errEl) errEl.textContent = '';
    });
  }

  function showFormErrors(form, errors) {
    Object.keys(errors).forEach(function (name) {
      var field = form.querySelector('[data-field="' + name + '"]');
      if (field) field.classList.add('feedback-form__field--error');
      var errEl = form.querySelector('[data-error="' + name + '"]');
      if (errEl) errEl.textContent = errors[name];
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    clearFormErrors(form);
    var input = {
      title: el('fb-title').value,
      content: el('fb-content').value,
      category: el('fb-category').value,
    };
    var validation = validateInput(input);
    if (!validation.valid) {
      showFormErrors(form, validation.errors);
      return;
    }
    var prev = state.items.slice();
    var rec = createFeedback(input, nowIso());
    state.items = state.items.concat([rec]);
    if (persist(prev)) {
      form.reset();
      renderAll();
    }
  }

  function onListClick(e) {
    var btn = e.target.closest ? e.target.closest('[data-action="transition"]') : null;
    if (!btn) return;
    var card = btn.closest('.fb-card');
    if (!card) return;
    var id = card.getAttribute('data-id');
    var target = btn.getAttribute('data-target');
    var prev = state.items.slice();
    state.items = state.items.map(function (rec) {
      if (rec.id !== id) return rec;
      try {
        return applyTransition(rec, target, nowIso());
      } catch (err) {
        return rec;
      }
    });
    if (persist(prev)) renderAll();
  }

  function onStatusFilterClick(e) {
    var btn = e.target.closest ? e.target.closest('.segmented__btn') : null;
    if (!btn) return;
    var value = btn.getAttribute('data-value');
    state.statusFilter = value;
    var group = btn.parentNode;
    Array.prototype.forEach.call(group.querySelectorAll('.segmented__btn'), function (b) {
      var active = b === btn;
      b.classList.toggle('segmented__btn--active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    renderList();
  }

  function onCategoryFilterChange(e) {
    state.categoryFilter = e.target.value;
    renderList();
  }

  function onExport() {
    var payload = buildExport(state.items, nowIso());
    var json = JSON.stringify(payload, null, 2);
    var blob = new root.Blob([json], { type: 'application/json' });
    var url = root.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = exportFilename(payload.exportedAt);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (root.URL.revokeObjectURL) root.URL.revokeObjectURL(url);
  }

  function onRecoveryClose() {
    state.recovery = false;
    renderRecovery();
  }

  function init() {
    var loaded = loadState(root.localStorage, nowIso());
    state.items = loaded.items;
    state.recovery = loaded.recovery;

    el('fb-form').addEventListener('submit', onSubmit);
    el('fb-list').addEventListener('click', onListClick);
    el('fb-status-filter').addEventListener('click', onStatusFilterClick);
    el('fb-category-filter').addEventListener('change', onCategoryFilterChange);
    el('fb-export').addEventListener('click', onExport);
    var closeBtn = el('fb-recovery-close');
    if (closeBtn) closeBtn.addEventListener('click', onRecoveryClose);

    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
