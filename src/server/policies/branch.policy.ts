import { assertBranchAccess } from "@/server/auth/branch-scope";
import type { AuthenticatedSession } from "@/server/auth/session";

export function assertCanAccessBranch(
  session: AuthenticatedSession,
  branchId: string,
) {
  assertBranchAccess(session, branchId);
}
