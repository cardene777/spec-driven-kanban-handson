// design/012_member_invite.md § 補助関数 > lib/invites/token.ts
import { createHash, randomBytes } from "crypto";

export const INVITE_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 日

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_EXPIRES_MS);
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
