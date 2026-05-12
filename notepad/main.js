// BF-402 · 메모장 SPA 엔트리
// - 의존: notepad/storage.js (CRUD), notepad/ulid.js (id)
// - 명세: docs/design/notepad-BF-400.md (BF-401)
// - 범위: task description 기준 — 명시적 [저장] 버튼, ULID 키, Enter/Esc.
//   (검색·다크 토글·자동 debounce 저장 등은 본 task 범위 외 — 후속 작업.)

import { createNoteStore } from "./storage.js";
import { ulid } from "./ulid.js";

const store = createNoteStore();

// ─────────── DOM 캐싱 ───────────
const $ = (id) => document.getElementById(id);
const layoutEl = $("layout");
const listEl = $("note-list");
const listEmptyEl = $("list-empty");
const editorPaneEl = $("editor-pane");
const editorEmptyEl = $("editor-empty");
const titleEl = $("editor-title");
const bodyEl = $("editor-body");
const countEl = $("editor-count");
const savedEl = $("editor-saved");
const btnNew = $("btn-new");
const btnEmptyNew = $("btn-empty-new");
const btnSave = $("btn-save");
const btnDelete = $("btn-delete");
const btnBack = $("btn-back");
const modalEl = $("delete-modal");
const modalOverlay = $("modal-overlay");
const modalTargetEl = $("delete-modal-target");
const btnCancelDelete = $("btn-cancel-delete");
const btnConfirmDelete = $("btn-confirm-delete");

// ─────────── 상태 ───────────
let selectedId = null; // 현재 편집 중 메모 id (null = 빈 상태)
let pendingDeleteId = null; // 삭제 확인 대상 id
let lastFocusedBeforeModal = null; // modal 닫힌 후 복귀할 focus

// ─────────── 유틸 ───────────
const MOBILE_BREAKPOINT = 640;
const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

function formatTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${mi}`;
}

function previewOf(body) {
  const text = (body || "").replace(/\s+/g, " ").trim();
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
}

// ─────────── 렌더 ───────────
function renderList() {
  const notes = store.list();
  listEl.innerHTML = "";

  if (notes.length === 0) {
    listEmptyEl.hidden = false;
    return;
  }
  listEmptyEl.hidden = true;

  for (const note of notes) {
    const li = document.createElement("li");
    li.className = "list__item";
    li.dataset.id = note.id;
    li.setAttribute("role", "option");
    li.setAttribute("tabindex", "0");
    li.setAttribute("aria-selected", String(note.id === selectedId));
    if (note.id === selectedId) li.classList.add("is-selected");

    const title = document.createElement("p");
    title.className = "list__title";
    title.textContent = note.title || "(제목 없음)";

    const preview = document.createElement("p");
    preview.className = "list__preview";
    preview.textContent = previewOf(note.body) || "(빈 메모)";

    const time = document.createElement("p");
    time.className = "list__time";
    time.textContent = formatTime(note.updatedAt);

    li.append(title, preview, time);
    listEl.append(li);
  }
}

function renderEditor() {
  const notes = store.list();
  if (selectedId == null) {
    editorPaneEl.hidden = true;
    editorEmptyEl.hidden = false;
    // 메모는 있는데 선택이 없는 경우 안내 변경
    const hasNotes = notes.length > 0;
    editorEmptyEl.querySelector(".editor__empty-title").textContent = hasNotes
      ? "왼쪽에서 메모를 선택하세요"
      : "아직 메모가 없어요";
    editorEmptyEl.querySelector(".editor__empty-sub").innerHTML = hasNotes
      ? "또는 상단의 <strong>+ 새 메모</strong> 버튼을 눌러 새로 작성하세요"
      : "상단의 <strong>+ 새 메모</strong> 버튼으로 시작하세요";
    return;
  }
  const note = store.get(selectedId);
  if (!note) {
    selectedId = null;
    renderEditor();
    return;
  }
  editorEmptyEl.hidden = true;
  editorPaneEl.hidden = false;
  titleEl.value = note.title || "";
  bodyEl.value = note.body || "";
  updateCounter();
  savedEl.textContent = note.updatedAt
    ? `마지막 저장 ${formatTime(note.updatedAt)}`
    : "";
}

function updateCounter() {
  countEl.textContent = `${bodyEl.value.length}자`;
}

function renderMobileChrome() {
  if (isMobile()) {
    const editorOpen = selectedId != null;
    layoutEl.classList.toggle("is-editor-open", editorOpen);
    btnBack.hidden = !editorOpen;
  } else {
    layoutEl.classList.remove("is-editor-open");
    btnBack.hidden = true;
  }
}

function render() {
  renderList();
  renderEditor();
  renderMobileChrome();
}

// ─────────── CRUD 액션 ───────────
function createNewNote() {
  const now = Date.now();
  const note = {
    id: ulid(now),
    title: "",
    body: "",
    createdAt: now,
    updatedAt: now,
  };
  store.save(note);
  selectedId = note.id;
  render();
  // 작성 흐름으로 즉시 진입
  titleEl.focus();
}

function saveCurrent() {
  if (selectedId == null) return;
  const existing = store.get(selectedId);
  if (!existing) return;
  const now = Date.now();
  const updated = {
    ...existing,
    title: titleEl.value,
    body: bodyEl.value,
    updatedAt: now,
  };
  store.save(updated);
  savedEl.textContent = `저장됨 · ${formatTime(now)}`;
  renderList(); // 목록의 title/preview/time 갱신
}

function selectNote(id) {
  selectedId = id;
  render();
  if (isMobile()) bodyEl.focus({ preventScroll: true });
}

// ─────────── 삭제 모달 ───────────
function openDeleteModal(id) {
  const note = store.get(id);
  if (!note) return;
  pendingDeleteId = id;
  lastFocusedBeforeModal = document.activeElement;
  modalTargetEl.textContent = `"${note.title || "(제목 없음)"}"`;
  modalEl.hidden = false;
  // 5.5: 취소 버튼에 autofocus (실수 방지)
  setTimeout(() => btnCancelDelete.focus(), 0);
}

function closeDeleteModal() {
  modalEl.hidden = true;
  pendingDeleteId = null;
  if (lastFocusedBeforeModal && lastFocusedBeforeModal.focus) {
    lastFocusedBeforeModal.focus();
  }
  lastFocusedBeforeModal = null;
}

function confirmDelete() {
  if (pendingDeleteId == null) return;
  const removingId = pendingDeleteId;

  // 다음 selection 결정 (§6.4: 직전 항목의 위/아래 형제로 자동 이동)
  const notes = store.list();
  const idx = notes.findIndex((n) => n.id === removingId);
  let nextId = null;
  if (idx >= 0) {
    if (notes[idx + 1]) nextId = notes[idx + 1].id;
    else if (notes[idx - 1]) nextId = notes[idx - 1].id;
  }

  store.remove(removingId);
  selectedId = nextId;
  closeDeleteModal();
  render();
}

// ─────────── 모달 focus trap ───────────
function trapFocus(e) {
  if (modalEl.hidden) return;
  if (e.key !== "Tab") return;
  const focusables = [btnCancelDelete, btnConfirmDelete];
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// ─────────── 이벤트 바인딩 ───────────
btnNew.addEventListener("click", createNewNote);
btnEmptyNew.addEventListener("click", createNewNote);
btnSave.addEventListener("click", saveCurrent);
btnDelete.addEventListener("click", () => {
  if (selectedId != null) openDeleteModal(selectedId);
});
btnBack.addEventListener("click", () => {
  selectedId = null;
  render();
});

btnCancelDelete.addEventListener("click", closeDeleteModal);
btnConfirmDelete.addEventListener("click", confirmDelete);
modalOverlay.addEventListener("click", closeDeleteModal);

// 목록 클릭 (event delegation)
listEl.addEventListener("click", (e) => {
  const item = e.target.closest(".list__item");
  if (!item) return;
  selectNote(item.dataset.id);
});

// 목록 키보드 (Enter 로 선택, ↑/↓ 로 이동)
listEl.addEventListener("keydown", (e) => {
  const item = e.target.closest(".list__item");
  if (!item) return;
  if (e.key === "Enter") {
    e.preventDefault();
    selectNote(item.dataset.id);
    bodyEl.focus({ preventScroll: true });
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const sibling =
      e.key === "ArrowDown" ? item.nextElementSibling : item.previousElementSibling;
    if (sibling) {
      sibling.focus();
      selectNote(sibling.dataset.id);
    }
  }
});

// 본문 글자수 실시간 갱신
bodyEl.addEventListener("input", updateCounter);

// 전역 키보드 — Esc (모달 닫기 / mobile 목록으로)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!modalEl.hidden) {
      e.preventDefault();
      closeDeleteModal();
      return;
    }
    if (isMobile() && selectedId != null) {
      e.preventDefault();
      selectedId = null;
      render();
    }
  }
  trapFocus(e);
});

// 반응형 chrome 갱신
window.addEventListener("resize", renderMobileChrome);

// ─────────── 부팅 ───────────
render();
