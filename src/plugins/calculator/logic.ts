/**
 * Tiny safe arithmetic evaluator (no `eval`). Supports + - * / , parentheses,
 * decimals and unary minus, with correct operator precedence via shunting-yard.
 */
type Token = string;

const PREC: Record<string, number> = { "u-": 3, "*": 2, "/": 2, "+": 1, "-": 1 };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let num = "";
  for (const ch of input.replace(/\s+/g, "")) {
    if (/[0-9.]/.test(ch)) {
      num += ch;
    } else {
      if (num) {
        tokens.push(num);
        num = "";
      }
      if ("+-*/()".includes(ch)) tokens.push(ch);
      else throw new Error("bad char");
    }
  }
  if (num) tokens.push(num);
  return tokens;
}

function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const ops: Token[] = [];
  let expectOperand = true;

  for (const tok of tokens) {
    if (/^[0-9.]+$/.test(tok)) {
      out.push(tok);
      expectOperand = false;
    } else if (tok === "(") {
      ops.push(tok);
      expectOperand = true;
    } else if (tok === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop() as Token);
      if (ops.pop() !== "(") throw new Error("mismatched paren");
      expectOperand = false;
    } else {
      // operator
      const op = tok === "-" && expectOperand ? "u-" : tok;
      const rightAssoc = op === "u-";
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        (PREC[ops[ops.length - 1]] > PREC[op] ||
          (!rightAssoc && PREC[ops[ops.length - 1]] === PREC[op]))
      ) {
        out.push(ops.pop() as Token);
      }
      ops.push(op);
      expectOperand = true;
    }
  }
  while (ops.length) {
    const op = ops.pop() as Token;
    if (op === "(") throw new Error("mismatched paren");
    out.push(op);
  }
  return out;
}

function evalRPN(rpn: Token[]): number {
  const stack: number[] = [];
  for (const tok of rpn) {
    if (/^[0-9.]+$/.test(tok)) {
      stack.push(parseFloat(tok));
    } else if (tok === "u-") {
      const a = stack.pop();
      if (a === undefined) throw new Error("bad expr");
      stack.push(-a);
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("bad expr");
      stack.push(tok === "+" ? a + b : tok === "-" ? a - b : tok === "*" ? a * b : a / b);
    }
  }
  if (stack.length !== 1) throw new Error("bad expr");
  return stack[0];
}

export function evaluate(expr: string): number {
  const result = evalRPN(toRPN(tokenize(expr)));
  if (!Number.isFinite(result)) throw new Error("not finite");
  return result;
}

/** Format a result without long floating-point tails. */
export function formatResult(n: number): string {
  return parseFloat(n.toPrecision(12)).toString();
}
