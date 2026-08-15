const STORAGE_KEY = 'kanban-board-state';

function hasLocalStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadBoard() {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveBoard(board) {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    // localStorage 접근 불가(quota, 비활성화 등) 시 조용히 무시
  }
}
