// BF-1995 · 비밀번호 강도 검사기
// scorePassword/checkRules는 순수함수 — node --test 단위 테스트에서 DOM 없이 import 가능.

const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  '123456789',
  'qwerty',
  '111111',
  'abc123',
  'letmein',
  'admin',
  'welcome',
  'iloveyou',
  'monkey',
  'dragon',
  '000000',
  '1234567890',
]);

const SCORE_STATE = ['very-weak', 'weak', 'medium', 'strong', 'very-strong'];

const RULE_LABELS = {
  length: '8자 이상',
  uppercase: '대문자 포함',
  lowercase: '소문자 포함',
  number: '숫자 포함',
  special: '특수문자 포함',
};

const STATE_LABELS = {
  empty: '비밀번호를 입력하세요',
  'very-weak': '매우 약함',
  weak: '약함',
  medium: '보통',
  strong: '강함',
  'very-strong': '매우 강함',
};

function isCommonPassword(pw) {
  return COMMON_PASSWORDS.has(pw.toLowerCase());
}

function checkRules(pw) {
  return {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function scorePassword(pw) {
  const rules = checkRules(pw);
  const metCount = Object.values(rules).filter(Boolean).length;
  let score = metCount <= 1 ? 0 : Math.min(metCount - 1, 4);

  if (isCommonPassword(pw)) score = 0;

  return score;
}

function scoreToState(pw, score) {
  if (pw.length === 0) return 'empty';
  return SCORE_STATE[score];
}

function initUI() {
  const passwordInput = document.getElementById('password-input');
  const toggleBtn = document.getElementById('toggle-visibility');
  const meter = document.getElementById('strength-meter');
  const label = document.getElementById('strength-label');
  const rulesList = document.getElementById('rules-list');

  if (!passwordInput || !toggleBtn || !meter || !label || !rulesList) return;

  const fill = meter.querySelector('.strength-bar__fill');
  const ruleItems = Array.from(rulesList.querySelectorAll('[data-rule]'));

  function render() {
    const pw = passwordInput.value;
    const rules = checkRules(pw);
    const score = scorePassword(pw);
    const state = scoreToState(pw, score);

    meter.setAttribute('aria-valuenow', pw.length === 0 ? '0' : String(score));

    label.textContent = STATE_LABELS[state];

    if (fill) {
      if (state === 'empty') {
        fill.style.width = '0%';
        fill.style.backgroundColor = '';
      } else {
        fill.style.width = `${(score + 1) * 20}%`;
        fill.style.backgroundColor = `var(--color-strength-${state})`;
      }
    }

    ruleItems.forEach((item) => {
      const key = item.dataset.rule;
      const met = Boolean(rules[key]);
      item.classList.toggle('rule--met', met);
      item.classList.toggle('rule--unmet', !met);
      item.textContent = `${RULE_LABELS[key]} (${met ? '충족' : '미충족'})`;
    });
  }

  toggleBtn.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    toggleBtn.setAttribute('aria-pressed', String(!showing));
    toggleBtn.setAttribute('aria-label', showing ? '비밀번호 표시' : '비밀번호 숨김');
  });

  passwordInput.addEventListener('input', render);

  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
}

export {
  checkRules,
  scorePassword,
  scoreToState,
  isCommonPassword,
  SCORE_STATE,
  RULE_LABELS,
  STATE_LABELS,
};
