import { AsyncLocalStorage } from "node:async_hooks";

type AuditContext = {
  actorId: string | null;
};

const storage = new AsyncLocalStorage<AuditContext>();

export function runWithAuditContext<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ actorId: null }, fn);
}

export function setAuditActorId(actorId: string): void {
  const context = storage.getStore();
  if (context) context.actorId = actorId;
}

export function getAuditActorId(): string | null {
  return storage.getStore()?.actorId ?? null;
}
