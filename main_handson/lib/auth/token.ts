// design/011_auth.md § 共通部品
// セッション・招待で共用するトークン生成。CSPRNG で 32 バイト、URL-safe エンコード。
import { randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}
