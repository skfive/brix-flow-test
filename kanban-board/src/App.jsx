import { useEffect, useState } from 'react';
import {
  COLUMN_ORDER,
  cancelDelete,
  cancelForm,
  cardsForColumn,
  confirmDelete,
  createInitialBoard,
  dueDateStatus,
  moveCard,
  normalizeLoadedBoard,
  requestDelete,
  searchState,
  setFilter,
  setSearch,
  startCreate,
  startEdit,
  submitCard,
} from './lib/board.js';
import { loadBoard, saveBoard } from './lib/storage.js';

const COLUMN_LABELS = { todo: '할 일', doing: '진행 중', done: '완료' };
const PRIORITY_LABELS = { high: '높음', med: '중간', low: '낮음' };
const STATUS_LABELS = {
  idle: '대기',
  creating: '카드 생성 중',
  editing: '카드 수정 중',
  'confirming-delete': '삭제 확인 중',
  'validation-error': '입력 오류',
};

const EMPTY_DRAFT = { title: '', description: '', priority: 'med', dueDate: '' };

function createId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [board, setBoard] = useState(() => normalizeLoadedBoard(loadBoard()));
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  useEffect(() => {
    saveBoard(board);
  }, [board]);

  useEffect(() => {
    if (board.status !== 'confirming-delete') return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setBoard((b) => cancelDelete(b));
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [board.status]);

  const isFormOpen =
    board.status === 'creating' || board.status === 'editing' || board.status === 'validation-error';
  const isDeleteConfirmOpen = board.status === 'confirming-delete';
  const currentSearchState = searchState(board);

  function handleAddClick() {
    setDraft(EMPTY_DRAFT);
    setBoard((b) => startCreate(b));
  }

  function handleCardClick(card) {
    setDraft({
      title: card.title,
      description: card.description ?? '',
      priority: card.priority,
      dueDate: card.dueDate ?? '',
    });
    setBoard((b) => startEdit(b, card.id));
  }

  function handleCancelForm() {
    setDraft(EMPTY_DRAFT);
    setBoard((b) => cancelForm(b));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const cardInput = {
      id: board.editingCardId ?? createId(),
      title: draft.title,
      description: draft.description || null,
      priority: draft.priority,
      dueDate: draft.dueDate || null,
      columnId: board.editingCardId
        ? (board.cards.find((c) => c.id === board.editingCardId)?.columnId ?? 'todo')
        : 'todo',
    };
    const next = submitCard(board, cardInput);
    setBoard(next);
    if (next.status === 'idle') {
      setDraft(EMPTY_DRAFT);
    }
  }

  function handleSearchChange(event) {
    setBoard((b) => setSearch(b, event.target.value));
  }

  function handleMove(cardId, direction) {
    setBoard((b) => moveCard(b, cardId, direction));
  }

  function handleDeleteRequest(cardId) {
    setBoard((b) => requestDelete(b, cardId));
  }

  function handleDeleteConfirm() {
    setBoard((b) => confirmDelete(b));
  }

  function handleDeleteCancel() {
    setBoard((b) => cancelDelete(b));
  }

  function handleFilterChange(event) {
    setBoard((b) => setFilter(b, event.target.value));
  }

  return (
    <div>
      <div className="kanban-toolbar">
        <button type="button" onClick={handleAddClick}>
          카드 추가
        </button>
        <input
          id="kanban-search-input"
          type="text"
          className="kanban-search-input"
          aria-label="카드 검색"
          placeholder="카드 검색"
          value={board.search}
          onChange={handleSearchChange}
        />
        <label htmlFor="kanban-priority-filter">우선순위 필터</label>
        <select
          id="kanban-priority-filter"
          aria-label="우선순위 필터"
          value={board.filter}
          onChange={handleFilterChange}
        >
          <option value="all">전체</option>
          <option value="high">높음</option>
          <option value="med">중간</option>
          <option value="low">낮음</option>
        </select>
        <span role="status">상태: {STATUS_LABELS[board.status]}</span>
        {currentSearchState === 'no-results' ? <span role="status">검색 결과 없음</span> : null}
      </div>

      <div className="kanban-board">
        {COLUMN_ORDER.map((columnId) => (
          <section
            key={columnId}
            id={`kanban-column-${columnId}`}
            className="kanban-column"
            aria-label={COLUMN_LABELS[columnId]}
          >
            <h2>
              {COLUMN_LABELS[columnId]}{' '}
              <span className="kanban-column__count">({cardsForColumn(board, columnId).length})</span>
            </h2>
            {cardsForColumn(board, columnId).map((card) => {
              const duedateStatus = dueDateStatus(card.dueDate, () => new Date());
              return (
              <article
                key={card.id}
                className={`kanban-card kanban-card--${card.priority}`}
                onClick={() => handleCardClick(card)}
              >
                <h3>{card.title}</h3>
                {card.description ? <p>{card.description}</p> : null}
                <p>우선순위: {PRIORITY_LABELS[card.priority]}</p>
                {duedateStatus ? (
                  <span
                    className={`kanban-card-duedate-badge${
                      duedateStatus.kind === 'overdue' ? ' kanban-card-duedate-badge--overdue' : ''
                    }`}
                    aria-label={duedateStatus.label}
                  >
                    {duedateStatus.label}
                  </span>
                ) : null}
                <div>
                  <button
                    type="button"
                    className="kanban-move-btn"
                    aria-label="이전 컬럼으로 이동"
                    disabled={COLUMN_ORDER.indexOf(columnId) === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMove(card.id, 'prev');
                    }}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="kanban-move-btn"
                    aria-label="다음 컬럼으로 이동"
                    disabled={COLUMN_ORDER.indexOf(columnId) === COLUMN_ORDER.length - 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleMove(card.id, 'next');
                    }}
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteRequest(card.id);
                    }}
                  >
                    삭제
                  </button>
                </div>
              </article>
              );
            })}
          </section>
        ))}
      </div>

      {isFormOpen ? (
        <form id="kanban-card-form" onSubmit={handleSubmit}>
          <h2>{board.status === 'editing' ? '카드 수정' : '카드 추가'}</h2>
          <label htmlFor="kanban-card-title">제목</label>
          <input
            id="kanban-card-title"
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
          />
          <label htmlFor="kanban-card-description">설명</label>
          <textarea
            id="kanban-card-description"
            value={draft.description}
            onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
          />
          <label htmlFor="kanban-card-priority">우선순위</label>
          <select
            id="kanban-card-priority"
            value={draft.priority}
            onChange={(event) => setDraft((d) => ({ ...d, priority: event.target.value }))}
          >
            <option value="high">높음</option>
            <option value="med">중간</option>
            <option value="low">낮음</option>
          </select>
          <label htmlFor="kanban-card-form-duedate">마감일</label>
          <input
            id="kanban-card-form-duedate"
            type="date"
            value={draft.dueDate}
            onChange={(event) => setDraft((d) => ({ ...d, dueDate: event.target.value }))}
          />
          {board.status === 'validation-error' ? <p role="alert">{board.errorMessage}</p> : null}
          <button type="submit">저장</button>
          <button type="button" onClick={handleCancelForm}>
            취소
          </button>
        </form>
      ) : null}

      {isDeleteConfirmOpen ? (
        <div id="kanban-delete-confirm-dialog" role="alertdialog" aria-label="카드 삭제 확인">
          <p>이 카드를 삭제하시겠습니까?</p>
          <button type="button" onClick={handleDeleteConfirm}>
            삭제 확인
          </button>
          <button type="button" onClick={handleDeleteCancel}>
            취소
          </button>
        </div>
      ) : null}
    </div>
  );
}
