import { describe, expect, it } from 'vitest';
import {
  cancelDelete,
  cancelForm,
  cardsForColumn,
  confirmDelete,
  createInitialBoard,
  dueDateStatus,
  moveCard,
  normalizeLoadedBoard,
  removeCard,
  requestDelete,
  searchState,
  setFilter,
  setSearch,
  startCreate,
  startEdit,
  submitCard,
  upsertCard,
} from './board.js';

function cardFixture(overrides = {}) {
  return {
    id: 'card-1',
    title: '첫 카드',
    description: null,
    priority: 'med',
    columnId: 'todo',
    ...overrides,
  };
}

describe('upsertCard', () => {
  it('adds a new card without mutating the original board', () => {
    const board = createInitialBoard();
    const next = upsertCard(board, cardFixture());

    expect(board.cards).toHaveLength(0);
    expect(next.cards).toHaveLength(1);
    expect(next).not.toBe(board);
  });

  it('updates an existing card without mutating the original board', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = upsertCard(board, cardFixture({ title: '수정된 제목' }));

    expect(board.cards[0].title).toBe('첫 카드');
    expect(next.cards[0].title).toBe('수정된 제목');
    expect(next.cards).toHaveLength(1);
  });
});

describe('removeCard', () => {
  it('removes a card without mutating the original board', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = removeCard(board, 'card-1');

    expect(board.cards).toHaveLength(1);
    expect(next.cards).toHaveLength(0);
  });

  it('is a no-op when the card id does not exist', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = removeCard(board, 'unknown-id');

    expect(next.cards).toHaveLength(1);
    expect(next).not.toBe(board);
  });
});

describe('moveCard', () => {
  it('moves a card to the next column without mutating the original board', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'todo' }));
    const next = moveCard(board, 'card-1', 'next');

    expect(board.cards[0].columnId).toBe('todo');
    expect(next.cards[0].columnId).toBe('doing');
  });

  it('moves a card to the previous column', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'doing' }));
    const next = moveCard(board, 'card-1', 'prev');

    expect(next.cards[0].columnId).toBe('todo');
  });

  it('is a no-op when moving next from the last column', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'done' }));
    const next = moveCard(board, 'card-1', 'next');

    expect(next.cards[0].columnId).toBe('done');
  });

  it('is a no-op when moving prev from the first column', () => {
    const board = upsertCard(createInitialBoard(), cardFixture({ columnId: 'todo' }));
    const next = moveCard(board, 'card-1', 'prev');

    expect(next.cards[0].columnId).toBe('todo');
  });

  it('returns the same board when the card id does not exist', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = moveCard(board, 'unknown-id', 'next');

    expect(next).toBe(board);
  });
});

describe('빈 제목 (5.1)', () => {
  it('rejects an empty title and enters validation-error without creating a card', () => {
    const board = createInitialBoard();
    const next = submitCard(board, cardFixture({ title: '' }));

    expect(next.status).toBe('validation-error');
    expect(next.cards).toHaveLength(0);
    expect(next.errorMessage).toBeTruthy();
  });

  it('rejects a whitespace-only title', () => {
    const board = createInitialBoard();
    const next = submitCard(board, cardFixture({ title: '   ' }));

    expect(next.status).toBe('validation-error');
    expect(next.cards).toHaveLength(0);
  });

  it('accepts a valid title and returns to idle', () => {
    const board = startCreate(createInitialBoard());
    const next = submitCard(board, cardFixture());

    expect(next.status).toBe('idle');
    expect(next.cards).toHaveLength(1);
  });

  it('clears editingCardId and errorMessage on cancelForm', () => {
    const board = startEdit(createInitialBoard(), 'card-1');
    const next = cancelForm(board);

    expect(next.status).toBe('idle');
    expect(next.editingCardId).toBeNull();
    expect(next.errorMessage).toBeNull();
  });
});

describe('삭제 확인 (5.2)', () => {
  it('requestDelete transitions to confirming-delete without removing the card', () => {
    const board = upsertCard(createInitialBoard(), cardFixture());
    const next = requestDelete(board, 'card-1');

    expect(next.status).toBe('confirming-delete');
    expect(next.cards).toHaveLength(1);
  });

  it('confirmDelete removes the card and returns to idle', () => {
    const board = requestDelete(upsertCard(createInitialBoard(), cardFixture()), 'card-1');
    const next = confirmDelete(board);

    expect(next.status).toBe('idle');
    expect(next.cards).toHaveLength(0);
  });

  it('cancelDelete preserves the card and returns to idle', () => {
    const board = requestDelete(upsertCard(createInitialBoard(), cardFixture()), 'card-1');
    const next = cancelDelete(board);

    expect(next.status).toBe('idle');
    expect(next.cards).toHaveLength(1);
  });
});

describe('필터 초기화 (5.3)', () => {
  it('cardsForColumn only returns cards matching the active priority filter', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ id: 'a', priority: 'high' }));
    board = upsertCard(board, cardFixture({ id: 'b', priority: 'low' }));
    board = setFilter(board, 'high');

    expect(cardsForColumn(board, 'todo')).toHaveLength(1);
    expect(cardsForColumn(board, 'todo')[0].id).toBe('a');
  });

  it('resets to show all cards when filter is set back to all', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ id: 'a', priority: 'high' }));
    board = upsertCard(board, cardFixture({ id: 'b', priority: 'low' }));
    board = setFilter(board, 'high');
    board = setFilter(board, 'all');

    expect(cardsForColumn(board, 'todo')).toHaveLength(2);
  });
});

describe('검색 결합 (BF-2134)', () => {
  it('matches when the search query is contained in the title', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ id: 'a', title: '기획 문서 작성' }));
    board = setSearch(board, '기획');

    expect(cardsForColumn(board, 'todo')).toHaveLength(1);
    expect(cardsForColumn(board, 'todo')[0].id).toBe('a');
  });

  it('matches when the search query is contained in the description only', () => {
    let board = upsertCard(
      createInitialBoard(),
      cardFixture({ id: 'a', title: '무관한 제목', description: '배포 준비' })
    );
    board = setSearch(board, '배포');

    expect(cardsForColumn(board, 'todo')).toHaveLength(1);
  });

  it('matches case-insensitively', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ id: 'a', title: 'plan 문서' }));
    board = setSearch(board, 'PLAN');

    expect(cardsForColumn(board, 'todo')).toHaveLength(1);
  });

  it('combines the search query with the priority filter using AND', () => {
    let board = upsertCard(
      createInitialBoard(),
      cardFixture({ id: 'a', title: '기획 문서', priority: 'low' })
    );
    board = setFilter(board, 'high');
    board = setSearch(board, '기획');

    expect(cardsForColumn(board, 'todo')).toHaveLength(0);
  });

  it('treats a whitespace-only search as no search (returns all cards)', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ id: 'a' }));
    board = upsertCard(board, cardFixture({ id: 'b', title: '다른 카드' }));
    board = setSearch(board, '   ');

    expect(cardsForColumn(board, 'todo')).toHaveLength(2);
  });

  it('a card with null description only matches on the title', () => {
    let board = upsertCard(
      createInitialBoard(),
      cardFixture({ id: 'a', title: '제목만 있음', description: null })
    );
    board = setSearch(board, '제목');

    expect(cardsForColumn(board, 'todo')).toHaveLength(1);
  });
});

describe('searchState (BF-2134)', () => {
  it('is idle when the search query is empty', () => {
    const board = createInitialBoard();

    expect(searchState(board)).toBe('idle');
  });

  it('is search-active when at least one card matches', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ title: '기획 문서' }));
    board = setSearch(board, '기획');

    expect(searchState(board)).toBe('search-active');
  });

  it('is no-results when no card matches across any column', () => {
    let board = upsertCard(createInitialBoard(), cardFixture({ title: '기획 문서' }));
    board = setSearch(board, '존재하지않는검색어');

    expect(searchState(board)).toBe('no-results');
  });
});

describe('dueDateStatus (BF-2134)', () => {
  const clockAt = (isoDate) => () => new Date(`${isoDate}T09:00:00`);

  it('returns an on-time status with a D-0 label when the due date is today', () => {
    const status = dueDateStatus('2026-08-16', clockAt('2026-08-16'));

    expect(status).toEqual({ kind: 'on-time', label: 'D-0' });
  });

  it('returns an on-time status with a D-3 label when the due date is 3 days away', () => {
    const status = dueDateStatus('2026-08-19', clockAt('2026-08-16'));

    expect(status).toEqual({ kind: 'on-time', label: 'D-3' });
  });

  it('returns an overdue status when the due date was yesterday', () => {
    const status = dueDateStatus('2026-08-15', clockAt('2026-08-16'));

    expect(status).toEqual({ kind: 'overdue', label: '기한 초과' });
  });

  it('returns an overdue status when the due date was several days ago', () => {
    const status = dueDateStatus('2026-08-01', clockAt('2026-08-16'));

    expect(status).toEqual({ kind: 'overdue', label: '기한 초과' });
  });

  it('returns null when dueDate is null (no badge)', () => {
    expect(dueDateStatus(null, clockAt('2026-08-16'))).toBeNull();
  });

  it('returns null when dueDate is undefined (no badge)', () => {
    expect(dueDateStatus(undefined, clockAt('2026-08-16'))).toBeNull();
  });

  it('returns null for a malformed date string instead of throwing', () => {
    expect(dueDateStatus('2026-13-40', clockAt('2026-08-16'))).toBeNull();
    expect(dueDateStatus('', clockAt('2026-08-16'))).toBeNull();
    expect(dueDateStatus(20260816, clockAt('2026-08-16'))).toBeNull();
  });
});

describe('normalizeLoadedBoard 하위호환 (BF-2134)', () => {
  it('defaults a missing dueDate field on legacy cards to null', () => {
    const legacyBoard = {
      cards: [{ id: 'a', title: '레거시 카드', description: null, priority: 'med', columnId: 'todo' }],
      status: 'idle',
      filter: 'all',
      editingCardId: null,
      deletingCardId: null,
      errorMessage: null,
    };

    const next = normalizeLoadedBoard(legacyBoard);

    expect(next.cards[0].dueDate).toBeNull();
  });

  it('defaults a missing search field to an empty string', () => {
    const legacyBoard = { cards: [], status: 'idle', filter: 'all' };

    const next = normalizeLoadedBoard(legacyBoard);

    expect(next.search).toBe('');
  });

  it('returns a fresh initial board when there is nothing stored', () => {
    expect(normalizeLoadedBoard(null)).toEqual(createInitialBoard());
  });
});
