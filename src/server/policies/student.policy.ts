import { assertBranchAccess } from "@/server/auth/branch-scope";
import type { AuthenticatedSession } from "@/server/auth/session";

export function assertCanAccessStudent(
  session: AuthenticatedSession,
  student: { branchId: string },
) {
  assertBranchAccess(session, student.branchId);
}
