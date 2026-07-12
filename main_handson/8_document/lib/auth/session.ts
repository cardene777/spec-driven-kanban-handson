// design/011_auth.md § session ユーティリティ
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 日
export const SESSION_COOKIE_NAME = "sid";

export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  return prisma.session.create({ data: { id, userId, expiresAt } });
}

export function buildSessionCookie(
  sessionId: string,
  nodeEnv = process.env.NODE_ENV,
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (nodeEnv === "production") parts.push("Secure");
  return parts.join("; ");
}

export function buildLogoutCookie(nodeEnv = process.env.NODE_ENV): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (nodeEnv === "production") parts.push("Secure");
  return parts.join("; ");
}

export function sessionIdPrefix(id: string): string {
  return id.slice(0, 8);
}
