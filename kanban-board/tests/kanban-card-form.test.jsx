import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App.jsx';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('카드 생성 폼 스모크', () => {
  it('C1: 카드 추가 버튼을 누르면 #kanban-card-form 이 idle 이후 상태로 렌더되고 제목 input 이 비어있다', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));

    expect(document.querySelector('#kanban-card-form')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toContain('카드 생성 중');
    expect(document.querySelector('#kanban-card-title').value).toBe('');
  });

  it('C2: 빈 제목으로 제출하면 role=alert 에러 메시지가 표시된다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(screen.getByRole('alert').textContent).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('입력 오류');
  });

  it('C3: 유효한 제목을 입력하고 제출하면 카드가 생성되고 폼이 닫히며 idle 로 복귀한다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));

    fireEvent.change(document.querySelector('#kanban-card-title'), {
      target: { value: '새 카드' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(document.querySelector('#kanban-card-form')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('대기');
    expect(screen.getByText('새 카드')).not.toBeNull();
  });

  it('C4: 컬럼 이동 버튼은 방향을 식별할 수 있는 명시적 aria-label 을 가진다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));
    fireEvent.change(document.querySelector('#kanban-card-title'), {
      target: { value: '이동 테스트 카드' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(screen.getByRole('button', { name: '이전 컬럼으로 이동' })).toBeDefined();
    expect(screen.getByRole('button', { name: '다음 컬럼으로 이동' })).toBeDefined();
  });

  it('C5: validation-error 상태에서 취소하면 에러가 사라지고 idle 로 복귀하며 폼을 다시 열 수 있다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('alert')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.getByRole('status').textContent).toContain('대기');
    expect(document.querySelector('#kanban-card-form')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));
    expect(document.querySelector('#kanban-card-form')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('검색 · D-day 폼 초기화 (BF-2134)', () => {
  it('D1: 검색어를 입력하면 일치하지 않는 카드가 목록에서 사라진다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));
    fireEvent.change(document.querySelector('#kanban-card-title'), {
      target: { value: '기획 문서' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    fireEvent.change(document.querySelector('#kanban-search-input'), {
      target: { value: '존재하지않는검색어' },
    });

    expect(screen.queryByText('기획 문서')).toBeNull();
  });

  it('D2: 취소하면 마감일 입력을 포함한 폼이 초기 상태로 복원된다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));
    fireEvent.change(document.querySelector('#kanban-card-form-duedate'), {
      target: { value: '2026-08-20' },
    });

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));

    expect(document.querySelector('#kanban-card-form-duedate').value).toBe('');
  });

  it('D3: 저장이 실패(빈 제목)하면 마감일 입력이 초기화되고 저장 버튼이 다시 사용 가능하다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '카드 추가' }));
    fireEvent.change(document.querySelector('#kanban-card-form-duedate'), {
      target: { value: '2026-08-20' },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(document.querySelector('#kanban-card-form-duedate').value).toBe('');
    expect(screen.getByRole('button', { name: '저장' }).disabled).toBe(false);
  });
});

// frozen ui-contract@v1 대비 실제 구현 결함 — src/ 미수정, 발견만 기록 (BF-2113 범위 아님)
describe.todo('frozen ui-contract@v1 DOM/상태 계약 미충족 항목 (구현 결함 — 별도 티켓 필요)', () => {
  it.todo('제목 input id 가 kanban-card-title-input 이어야 하나 실제로는 kanban-card-title 이다');
  it.todo('에러 메시지 요소 id 가 kanban-card-title-error 여야 하나 실제로는 id 없는 role=alert 문단이다');
  it.todo('제목 input 에 aria-invalid 속성이 없어 검증 실패 상태를 접근성 트리에 노출하지 못한다');
  it.todo('에러 메시지 요소에 kanban-card-form__error 클래스가 없다');
  it.todo('컬럼 이동 버튼 클래스가 kanban-column__move-button 이 아니라 kanban-move-btn 이다');
  it.todo('board.status 에 submitting/success 상태가 없어 폼 제출 진행 상태를 구분해 노출하지 못한다');
});
