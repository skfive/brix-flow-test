export const QUESTIONS = [
  { question: '대한민국의 수도는?', answer: 'Seoul' },
  { question: '일본의 수도는?', answer: 'Tokyo' },
  { question: '프랑스의 수도는?', answer: 'Paris' },
  { question: '물의 화학식은?', answer: 'H2O' },
  { question: '1 + 1 은?', answer: '2' },
  { question: '지구에서 가장 가까운 항성은?', answer: 'Sun' },
  { question: '태양계에서 가장 큰 행성은?', answer: 'Jupiter' },
  { question: '한 해는 몇 개월인가?', answer: '12' },
  { question: '무지개의 색깔 수는?', answer: '7' },
  { question: '미국의 수도는?', answer: 'Washington' },
];

export function normalizeAnswer(input) {
  return input.trim().toLowerCase();
}

export function grade(answers) {
  const totalCount = answers.length;
  const correctCount = answers.filter(
    ({ userInput, correctAnswer }) => normalizeAnswer(userInput) === normalizeAnswer(correctAnswer)
  ).length;
  const accuracy = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  return { correctCount, totalCount, accuracy };
}

const NEXT_CARD_DELAY_MS = 2000;

function createQuizController(doc) {
  const questionEl = doc.getElementById('quiz-card');
  const inputEl = doc.getElementById('answer-input');
  const submitBtn = doc.getElementById('submit-btn');
  const feedbackEl = doc.getElementById('feedback-message');
  const progressEl = doc.getElementById('progress-indicator');
  const resultScreenEl = doc.getElementById('result-screen');
  const restartBtn = doc.getElementById('restart-btn');

  let currentIndex = 0;
  let answers = [];
  let state = 'idle';

  function renderQuestion() {
    const question = QUESTIONS[currentIndex];
    questionEl.querySelector('.quiz-card__question').textContent = question.question;
    inputEl.value = '';
    inputEl.disabled = false;
    submitBtn.disabled = false;
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('quiz-card__feedback--correct', 'quiz-card__feedback--incorrect');
    progressEl.textContent = `${currentIndex + 1} / ${QUESTIONS.length}`;
    resultScreenEl.hidden = true;
    questionEl.hidden = false;
    state = 'idle';
  }

  function showEmptyInputError() {
    state = 'empty-input-error';
    feedbackEl.textContent = '답을 입력해 주세요.';
    feedbackEl.classList.remove('quiz-card__feedback--correct', 'quiz-card__feedback--incorrect');
  }

  function handleSubmit() {
    const userInput = inputEl.value;
    if (normalizeAnswer(userInput) === '') {
      showEmptyInputError();
      return;
    }

    state = 'submitting';
    const question = QUESTIONS[currentIndex];
    const isCorrect = normalizeAnswer(userInput) === normalizeAnswer(question.answer);
    answers.push({ userInput, correctAnswer: question.answer });

    inputEl.disabled = true;
    submitBtn.disabled = true;
    progressEl.textContent = `${currentIndex + 1} / ${QUESTIONS.length}`;

    if (isCorrect) {
      state = 'correct-feedback';
      feedbackEl.textContent = '정답입니다';
      feedbackEl.classList.add('quiz-card__feedback--correct');
      feedbackEl.classList.remove('quiz-card__feedback--incorrect');
    } else {
      state = 'incorrect-feedback';
      feedbackEl.textContent = `오답입니다 (정답: ${question.answer})`;
      feedbackEl.classList.add('quiz-card__feedback--incorrect');
      feedbackEl.classList.remove('quiz-card__feedback--correct');
    }

    setTimeout(() => {
      currentIndex += 1;
      if (currentIndex < QUESTIONS.length) {
        renderQuestion();
      } else {
        showResult();
      }
    }, NEXT_CARD_DELAY_MS);
  }

  function showResult() {
    state = 'finished';
    questionEl.hidden = true;
    resultScreenEl.hidden = false;
    const { correctCount, totalCount, accuracy } = grade(answers);
    resultScreenEl.querySelector('[data-result="score"]').textContent = `${correctCount} / ${totalCount}`;
    resultScreenEl.querySelector('[data-result="accuracy"]').textContent = `${accuracy}%`;
  }

  function restart() {
    currentIndex = 0;
    answers = [];
    renderQuestion();
  }

  submitBtn.addEventListener('click', handleSubmit);
  restartBtn.addEventListener('click', restart);

  renderQuestion();

  return { getState: () => state };
}

if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
  createQuizController(document);
}
