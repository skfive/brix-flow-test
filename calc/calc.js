// BF-412 · 계산기 안전 수식 parser / evaluator
// - 명세: docs/design/calculator-BF-410.md
// - AC4: eval / Function 호출 없이 자체 parser 로 사칙연산·소수점·연산자 우선순위 처리
//
// 알고리즘:
//   1) tokenize — 화이트리스트 (0-9, '.', '+', '-', '*', '/', 공백) 만 허용.
//      그 외 문자(영문자·괄호·세미콜론·따옴표 등)는 모두 ParseError.
//   2) Shunting-yard — 우선순위 (`*` `/` > `+` `-`) + 좌결합 으로 RPN(postfix) 생성.
//   3) RPN evaluator — 스택 기반 순수 계산. 0 나눗셈·NaN·Infinity 는 EvalError.
//
// 보안 메모:
//   - 본 모듈은 globalThis.eval / Function 을 절대 호출하지 않는다.
//   - DOM·localStorage·네트워크 의존성 없음 → 순수 함수, 단위 테스트 친화.

export class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseError";
  }
}

export class EvalError extends Error {
  constructor(message) {
    super(message);
    this.name = "EvalError";
  }
}

const OP_PRECEDENCE = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

export function tokenize(input) {
  if (typeof input !== "string") {
    throw new ParseError("입력은 문자열이어야 합니다.");
  }
  const tokens = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    if (ch === " " || ch === "\t") {
      i += 1;
      continue;
    }

    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i;
      let dotCount = 0;
      while (j < n) {
        const c = input[j];
        if (c >= "0" && c <= "9") {
          j += 1;
        } else if (c === ".") {
          dotCount += 1;
          if (dotCount > 1) {
            throw new ParseError(`소수점이 중복되었습니다 (위치 ${j}).`);
          }
          j += 1;
        } else {
          break;
        }
      }
      const slice = input.slice(i, j);
      if (slice === ".") {
        throw new ParseError(`잘못된 숫자 토큰: "${slice}"`);
      }
      const value = Number(slice);
      if (!Number.isFinite(value)) {
        throw new ParseError(`잘못된 숫자 토큰: "${slice}"`);
      }
      tokens.push({ type: "num", value });
      i = j;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

    throw new ParseError(
      `허용되지 않은 문자: "${ch}" (위치 ${i}). 사칙연산·숫자·소수점만 허용됩니다.`,
    );
  }

  return tokens;
}

function toRpn(tokens) {
  if (tokens.length === 0) {
    throw new ParseError("빈 수식입니다.");
  }
  const output = [];
  const opStack = [];
  let expect = "num"; // "num" | "op"

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "num") {
      if (expect !== "num") {
        throw new ParseError(
          `숫자 위치에 연산자가 아닌 두 번째 숫자가 왔습니다 (토큰 ${i}).`,
        );
      }
      output.push(t);
      expect = "op";
    } else {
      if (expect !== "op") {
        throw new ParseError(
          `연산자 위치에 숫자가 아닌 연산자가 왔습니다 (토큰 ${i}: "${t.value}").`,
        );
      }
      const prec = OP_PRECEDENCE[t.value];
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        const topPrec = OP_PRECEDENCE[top.value];
        if (topPrec >= prec) {
          output.push(opStack.pop());
        } else {
          break;
        }
      }
      opStack.push(t);
      expect = "num";
    }
  }

  if (expect === "num") {
    throw new ParseError("수식이 연산자로 끝났습니다.");
  }

  while (opStack.length > 0) {
    output.push(opStack.pop());
  }
  return output;
}

function evalRpn(rpn) {
  const stack = [];
  for (const t of rpn) {
    if (t.type === "num") {
      stack.push(t.value);
      continue;
    }
    const b = stack.pop();
    const a = stack.pop();
    if (a === undefined || b === undefined) {
      throw new ParseError("피연산자가 부족합니다.");
    }
    let r;
    switch (t.value) {
      case "+":
        r = a + b;
        break;
      case "-":
        r = a - b;
        break;
      case "*":
        r = a * b;
        break;
      case "/":
        if (b === 0) {
          throw new EvalError("0 으로 나눌 수 없습니다.");
        }
        r = a / b;
        break;
      default:
        throw new ParseError(`알 수 없는 연산자: "${t.value}"`);
    }
    if (!Number.isFinite(r)) {
      throw new EvalError("계산 결과가 표현 가능 범위를 초과했습니다.");
    }
    stack.push(r);
  }
  if (stack.length !== 1) {
    throw new ParseError("수식이 잘못 형성되었습니다.");
  }
  return stack[0];
}

/**
 * 입력 수식 문자열을 평가해 숫자 결과를 반환.
 *  - eval / Function 호출 절대 없음 (자체 tokenize → Shunting-yard → RPN evaluator)
 *  - 사칙연산 (`+`, `-`, `*`, `/`), 소수점, 일반 수학 우선순위 (`*` `/` > `+` `-`) 지원
 *  - 0 나눗셈·overflow 는 EvalError, 문법 오류는 ParseError
 *
 * @param {string} input
 * @returns {number}
 */
export function evaluate(input) {
  const tokens = tokenize(input);
  if (tokens.length === 0) {
    throw new ParseError("빈 수식입니다.");
  }
  const rpn = toRpn(tokens);
  return evalRpn(rpn);
}
