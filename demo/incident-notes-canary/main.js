// 장애 메모 협업 SPA — 렌더 + composer 핸들러 (BF-1154)
// 브라우저 전용(document 사용). 순수 로직은 notes.js, 데이터는 fixtures.js.
// vanilla-static: fetch/XHR/타이머/외부 URL 없음. 정적 import + 브라우저 local state 만.

import {
  STATUS_META,
  STATUS_ORDER,
  OVERALL_META,
  deriveOverall,
  sortNotesAsc,
  validateNoteText,
  createNote,
  isValidStatus,
} from './notes.js';
import { incident, currentUser, initialNotes } from './fixtures.js';

const pad2 = (n) => String(n).padStart(2, '0');

/** ISO 문자열에서 HH:MM 추출 (TZ 비의존 — 표시 전용). */
function formatHM(iso) {
  const match = /T(\d{2}):(\d{2})/.exec(String(iso));
  return match ? `${match[1]}:${match[2]}` : '--:--';
}

/** 새 메모 생성 시각(로컬 ISO). 표시는 HH:MM 만 사용. */
function nowISO() {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

function setViewState(main, state) {
  main.dataset.viewState = state;
}

/** 헤더: 제목 + overall 배지 + 메타. */
function renderHeader(notes) {
  const titleEl = document.getElementById('in-title');
  titleEl.textContent = `장애 메모 · ${incident.title}`;

  const overallEl = document.getElementById('in-overall');
  const overall = deriveOverall(notes);
  if (overall && OVERALL_META[overall]) {
    const meta = OVERALL_META[overall];
    overallEl.hidden = false;
    overallEl.className = `in-overall in-ready-only in-overall--${meta.suffix}`;
    overallEl.setAttribute('aria-label', `장애 상태: ${meta.label}`);
    overallEl.textContent = `${meta.glyph} ${meta.label}`;
  } else {
    overallEl.hidden = true;
    overallEl.textContent = '';
  }

  const metaEl = document.getElementById('in-meta');
  metaEl.hidden = false;
  metaEl.textContent = `영향: ${incident.affectedService} · 시작 `;
  const timeEl = document.createElement('time');
  timeEl.setAttribute('datetime', incident.startedAt);
  timeEl.textContent = formatHM(incident.startedAt);
  metaEl.appendChild(timeEl);
}

/** 메모 카드 1장 생성. user text 는 textContent 로만 삽입(주입 방지). */
function buildNoteEl(note) {
  const meta = STATUS_META[note.status] || STATUS_META['open'];

  const li = document.createElement('li');
  li.className = `in-note in-note--${meta.suffix}`;
  li.id = `note-${note.id}`;

  // rail + dot
  const rail = document.createElement('div');
  rail.className = 'in-note__rail';
  const dot = document.createElement('span');
  dot.className = `in-dot in-dot--${meta.suffix}`;
  dot.setAttribute('aria-hidden', 'true');
  if (meta.filled) dot.textContent = meta.glyph;
  rail.appendChild(dot);

  // body
  const body = document.createElement('div');
  body.className = 'in-note__body';

  const head = document.createElement('div');
  head.className = 'in-note__head';

  const who = document.createElement('div');
  who.className = 'in-note__who';
  const author = document.createElement('h3');
  author.className = 'in-note__author';
  author.textContent = note.author.name;
  const handle = document.createElement('span');
  handle.className = 'in-note__handle';
  handle.textContent = ` @${note.author.handle}`;
  author.appendChild(handle);
  who.appendChild(author);

  const metaWrap = document.createElement('div');
  metaWrap.className = 'in-note__meta';
  const timeEl = document.createElement('time');
  timeEl.className = 'in-note__time';
  timeEl.setAttribute('datetime', note.at);
  timeEl.textContent = formatHM(note.at);
  const badge = document.createElement('span');
  badge.className = `in-status in-status--${meta.suffix}`;
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', `상태: ${meta.label}`);
  const glyph = document.createElement('span');
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = meta.glyph;
  badge.appendChild(glyph);
  badge.appendChild(document.createTextNode(` ${meta.label}`));
  metaWrap.appendChild(timeEl);
  metaWrap.appendChild(badge);

  head.appendChild(who);
  head.appendChild(metaWrap);

  const text = document.createElement('p');
  text.className = 'in-note__text';
  text.textContent = note.text;

  body.appendChild(head);
  body.appendChild(text);

  li.appendChild(rail);
  li.appendChild(body);
  return li;
}

/** 타임라인: 시간 오름차순 렌더. */
function renderTimeline(notes) {
  const list = document.getElementById('in-timeline');
  list.textContent = '';
  for (const note of sortNotesAsc(notes)) {
    list.appendChild(buildNoteEl(note));
  }
}

/** composer 정적 부분(작성자·상태 select) 초기화. */
function initComposer() {
  document.getElementById('in-current-user').textContent = currentUser.name;
  document.getElementById('in-current-handle').textContent = `@${currentUser.handle}`;

  const select = document.getElementById('in-status-select');
  select.textContent = '';
  for (const key of STATUS_ORDER) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = STATUS_META[key].label;
    if (key === 'in-progress') opt.selected = true; // 기본 대응중 (§5.3)
    select.appendChild(opt);
  }
}

/** notes 상태에 따라 view-state 전환 + 렌더. */
function render(main, notes) {
  renderHeader(notes);
  renderTimeline(notes);
  setViewState(main, notes.length === 0 ? 'empty' : 'ready');
}

function main() {
  const root = document.getElementById('incident-notes');

  let notes;
  try {
    if (!Array.isArray(initialNotes)) {
      throw new Error('fixture 형식 오류');
    }
    notes = initialNotes.map((n) => ({ ...n, author: { ...n.author } }));
  } catch (err) {
    setViewState(root, 'error');
    return;
  }

  initComposer();
  render(root, notes);

  const form = document.getElementById('in-composer');
  const textArea = document.getElementById('in-text');
  const errorEl = document.getElementById('in-text-error');
  const select = document.getElementById('in-status-select');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validationError = validateNoteText(textArea.value);
    if (validationError) {
      errorEl.textContent = validationError;
      textArea.setAttribute('aria-invalid', 'true');
      textArea.focus();
      return;
    }
    errorEl.textContent = '';
    textArea.removeAttribute('aria-invalid');

    const status = isValidStatus(select.value) ? select.value : 'in-progress';
    const note = createNote({
      id: `local-${nowISO()}-${notes.length + 1}`,
      author: currentUser,
      status,
      text: textArea.value,
      at: nowISO(),
    });
    notes.push(note);

    render(root, notes);
    textArea.value = '';
    select.value = 'in-progress';
    textArea.focus();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
