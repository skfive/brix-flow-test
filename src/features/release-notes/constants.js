// BF-1087 릴리스 노트 요약 보드 — 도메인 상수 (기획 §3, 디자인 §5·§8.3)
// 신규 패키지·외부 의존성 0건: 모든 값은 이 모듈에서 직접 정의한다.

/** 중요도 enum (기획 §3.1) — 표시/필터 순서 유지. */
export const IMPORTANCE_VALUES = Object.freeze(['low', 'medium', 'high', 'critical']);

/** 사용자 영향도 enum (기획 §3.1). */
export const USER_IMPACT_VALUES = Object.freeze(['none', 'minor', 'major', 'breaking']);

/** 중요도 표시 라벨 (디자인 §5.1). */
export const IMPORTANCE_LABELS = Object.freeze({
  low: '낮음',
  medium: '보통',
  high: '높음',
  critical: '긴급',
});

/** 사용자 영향도 표시 라벨 (디자인 §5.2). */
export const USER_IMPACT_LABELS = Object.freeze({
  none: '영향 없음',
  minor: '경미',
  major: '상당',
  breaking: '호환성 깨짐',
});

/** 중요도 → semantic 매핑 (디자인 §5.1·§8.3). */
export const IMPORTANCE_SEVERITY = Object.freeze({
  low: 'neutral',
  medium: 'brand',
  high: 'warning',
  critical: 'danger',
});

/** 사용자 영향도 → semantic 매핑 (디자인 §5.2·§8.3). */
export const USER_IMPACT_SEVERITY = Object.freeze({
  none: 'neutral',
  minor: 'info',
  major: 'warning',
  breaking: 'danger',
});

/** 중요도 단계 기호 (색약 대응, 디자인 §5.1·§7.4). */
export const IMPORTANCE_SYMBOL = Object.freeze({
  low: '▁',
  medium: '▃',
  high: '▅',
  critical: '▇',
});

/** 사용자 영향도 선행 glyph (색약 대응, 디자인 §5.2·§7.4). */
export const USER_IMPACT_GLYPH = Object.freeze({
  none: '○',
  minor: '◔',
  major: '◑',
  breaking: '⚠',
});

/** 검증 한계값 (기획 §3.1·§4). */
export const TITLE_MAX_LENGTH = 200;
export const CHANGE_MAX_LENGTH = 300;
export const CHANGES_MIN_COUNT = 1;
export const CHANGES_MAX_COUNT = 50;

/** 최근 등록 추이 KPI 윈도 (기획 §6, 기본 24시간·조정 가능). */
export const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
