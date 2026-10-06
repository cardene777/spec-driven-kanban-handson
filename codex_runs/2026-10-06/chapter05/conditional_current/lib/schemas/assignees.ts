// spec009 FR-004; design009 pure contract.
export function isValidAssigneeUserId(userId: unknown): boolean {
 return typeof userId === 'string' && userId.trim().length > 0;
}
