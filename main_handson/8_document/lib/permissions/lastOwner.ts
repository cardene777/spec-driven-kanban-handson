// design/013_permissions.md § 補助関数 > isLastOwnerProtected
import type { Role } from "@prisma/client";

export type LastOwnerInput = {
  currentOwnerCount: number;
  targetCurrentRole: Role;
  operation: "change_role" | "remove";
  newRole?: Role;
};

export function isLastOwnerProtected(input: LastOwnerInput): boolean {
  const { currentOwnerCount, targetCurrentRole, operation, newRole } = input;
  if (targetCurrentRole !== "owner") return false;
  if (currentOwnerCount > 1) return false;
  if (operation === "remove") return true;
  if (operation === "change_role" && newRole !== "owner") return true;
  return false;
}
