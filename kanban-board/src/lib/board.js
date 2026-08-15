export const COLUMN_ORDER = ['todo', 'doing', 'done'];
export const PRIORITIES = ['high', 'med', 'low'];

export function createInitialBoard() {
  return {
    cards: [],
    status: 'idle',
    filter: 'all',
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

export function cardsForColumn(board, columnId) {
  return board.cards.filter(
    (c) => c.columnId === columnId && (board.filter === 'all' || c.priority === board.filter)
  );
}
