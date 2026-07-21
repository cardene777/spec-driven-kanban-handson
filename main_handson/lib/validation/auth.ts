// spec/011_auth.md § バリデーション（教材用の簡略仕様）
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
export const NAME_MIN = 1;
export const NAME_MAX = 50;

export function isValidEmail(email: unknown): boolean {
  return typeof email === "string" && EMAIL_PATTERN.test(email);
}

// 8〜72文字、英字を1文字以上、数字を1文字以上（記号は任意）
export function isValidPassword(password: unknown): boolean {
  if (typeof password !== "string") return false;
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return false;
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

export function normalizeName(name: unknown): string {
  return typeof name === "string" ? name.trim() : "";
}

export function isValidName(name: unknown): boolean {
  const value = normalizeName(name);
  return value.length >= NAME_MIN && value.length <= NAME_MAX;
}
