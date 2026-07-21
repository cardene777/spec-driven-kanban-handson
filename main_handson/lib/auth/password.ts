// design/011_auth.md § 共通部品 / spec/011_auth.md § 非機能要件
// パスワードは node:crypto の scrypt でソルト付きハッシュ化する（平文保存しない）。
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(plain, salt, KEY_LENGTH);
  return `${PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = scryptSync(plain, salt, KEY_LENGTH);
  // 長さが一致する場合のみ timingSafeEqual で比較する
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
