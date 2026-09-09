export const MAX_ASSIGNEES = 10;

export function canAddAssignee(currentCount: number): boolean {
  if (!Number.isInteger(currentCount) || currentCount < 0) {
    return false;
  }

  return currentCount < MAX_ASSIGNEES;
}
