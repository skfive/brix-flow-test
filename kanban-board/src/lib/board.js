export const COLUMN_ORDER = ['todo', 'doing', 'done'];
export const PRIORITIES = ['high', 'med', 'low'];

export function createInitialBoard() {
  return {
    cards: [],
    status: 'idle',
    filter: 'all',
    search: '',
    editingCardId: null,
    deletingCardId: null,
    errorMessage: null,
  };
}

function isBlankTitle(title) {
  return typeof title !== 'string' || title.trim().length === 0;
}

export function upsertCard(board, card) {
  const exists = board.cards.some((c) => c.id === card.id);
  const cards = exists
    ? board.cards.map((c) => (c.id === card.id ? { ...c, ...card } : c))
    : [...board.cards, card];
  return { ...board, cards };
}

export function removeCard(board, cardId) {
  return { ...board, cards: board.cards.filter((c) => c.id !== cardId) };
}

export function moveCard(board, cardId, direction) {
  const card = board.cards.find((c) => c.id === cardId);
  if (!card) return board;
  const currentIndex = COLUMN_ORDER.indexOf(card.columnId);
  const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= COLUMN_ORDER.length) return board;
  return upsertCard(board, { ...card, columnId: COLUMN_ORDER[nextIndex] });
}

export function startCreate(board) {
  return { ...board, status: 'creating', editingCardId: null, errorMessage: null };
}

export function startEdit(board, cardId) {
  return { ...board, status: 'editing', editingCardId: cardId, errorMessage: null };
}

export function cancelForm(board) {
  return { ...board, status: 'idle', editingCardId: null, errorMessage: null };
}

export function submitCard(board, cardInput) {
  if (isBlankTitle(cardInput.title)) {
    return { ...board, status: 'validation-error', errorMessage: '제목을 입력해 주세요.' };
  }
  const next = upsertCard(board, { ...cardInput, title: cardInput.title.trim() });
  return { ...next, status: 'idle', editingCardId: null, errorMessage: null };
}

export function requestDelete(board, cardId) {
  return { ...board, status: 'confirming-delete', deletingCardId: cardId };
}

export function confirmDelete(board) {
  if (!board.deletingCardId) return { ...board, status: 'idle' };
  const next = removeCard(board, board.deletingCardId);
  return { ...next, status: 'idle', deletingCardId: null };
}

export function cancelDelete(board) {
  return { ...board, status: 'idle', deletingCardId: null };
}

export function setFilter(board, filter) {
  return { ...board, filter };
}

export function setSearch(board, search) {
  return { ...board, search };
}

function normalizeQuery(search) {
  return (search ?? '').trim().toLowerCase();
}

function matchesSearch(card, normalizedQuery) {
  if (normalizedQuery === '') return true;
  const title = (card.title ?? '').trim().toLowerCase();
  const description = (card.description ?? '').trim().toLowerCase();
  return title.includes(normalizedQuery) || description.includes(normalizedQuery);
}

function matchesFilterAndSearch(board, card, normalizedQuery) {
  return (board.filter === 'all' || card.priority === board.filter) && matchesSearch(card, normalizedQuery);
}

export function cardsForColumn(board, columnId) {
  const normalizedQuery = normalizeQuery(board.search);
  return board.cards.filter(
    (c) => c.columnId === columnId && matchesFilterAndSearch(board, c, normalizedQuery)
  );
}

export function searchState(board) {
  const normalizedQuery = normalizeQuery(board.search);
  if (normalizedQuery === '') return 'idle';
  const hasMatch = board.cards.some((c) => matchesFilterAndSearch(board, c, normalizedQuery));
  return hasMatch ? 'search-active' : 'no-results';
}

function parseDateOnly(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isValid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isValid ? date : null;
}

export function dueDateStatus(dueDate, clock) {
  const parsedDue = parseDateOnly(dueDate);
  if (!parsedDue) return null;
  const now = clock();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((parsedDue.getTime() - today.getTime()) / 86400000);
  if (diffDays >= 0) {
    return { kind: 'on-time', label: `D-${diffDays}` };
  }
  return { kind: 'overdue', label: '기한 초과' };
}

export function normalizeLoadedBoard(rawBoard) {
  if (!rawBoard || typeof rawBoard !== 'object') return createInitialBoard();
  const cards = Array.isArray(rawBoard.cards)
    ? rawBoard.cards.map((c) => ({ ...c, dueDate: c.dueDate ?? null }))
    : [];
  return { ...createInitialBoard(), ...rawBoard, search: rawBoard.search ?? '', cards };
}
