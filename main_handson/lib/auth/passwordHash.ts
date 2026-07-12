// design/011_auth.md § 実装方針 (パスワードハッシュ)
// 依存追加を避けるため Node 組み込みの crypto.scryptSync を使う (bcrypt / bcryptjs 相当の適応型ハッシュ)。
// フォーマット = "s2$<N>$<r>$<p>$<salt-hex>$<hash-hex>"
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const N = 16384;
const r = 8;
const p = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(password, salt, KEY_LEN, { N, r, p });
  return `s2$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "s2") return false;
  const N2 = Number(parts[1]);
  const r2 = Number(parts[2]);
  const p2 = Number(parts[3]);
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (!Number.isFinite(N2) || !Number.isFinite(r2) || !Number.isFinite(p2)) {
    return false;
  }
  const actual = scryptSync(password, salt, expected.length, {
    N: N2,
    r: r2,
    p: p2,
  });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
