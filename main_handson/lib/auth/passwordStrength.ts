// spec/011_auth.md § バリデーション / § 境界条件 § password の強度
// design/011_auth.md § Red-Green-Refactor > パスワード強度判定 pure 関数
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

const LETTER_RE = /[A-Za-z]/;
const DIGIT_RE = /[0-9]/;
const SYMBOL_RE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

export type PasswordCheck = "too_short" | "too_long" | "weak" | null;

export function checkPassword(password: string): PasswordCheck {
  if (password.length < MIN_PASSWORD_LENGTH) return "too_short";
  if (password.length > MAX_PASSWORD_LENGTH) return "too_long";
  if (!LETTER_RE.test(password)) return "weak";
  if (!DIGIT_RE.test(password)) return "weak";
  if (!SYMBOL_RE.test(password)) return "weak";
  return null;
}

export function isPasswordStrong(password: string): boolean {
  return checkPassword(password) === null;
}
