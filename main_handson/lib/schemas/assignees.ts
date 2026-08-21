export function isValidAssigneeUserId(userId: unknown): boolean {
  return typeof userId === "string" && userId.trim().length > 0;
}
