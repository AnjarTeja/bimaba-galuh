import { AppError } from "@/server/http/errors";
import type { AuthenticatedSession } from "./session";

export function getBranchScope(session: AuthenticatedSession) {
  const assignments = session.user.branchRoles;
  const global = assignments.some(
    (assignment) =>
      assignment.branchId === null &&
      ["super_admin", "unit_head"].includes(assignment.role.code),
  );

  return {
    global,
    branchIds: [...new Set(
      assignments.flatMap((assignment) =>
        assignment.branchId === null ? [] : [assignment.branchId],
      ),
    )],
  };
}

export function assertBranchAccess(
  session: AuthenticatedSession,
  branchId: string,
) {
  const scope = getBranchScope(session);
  if (!scope.global && !scope.branchIds.includes(branchId)) {
    throw new AppError("FORBIDDEN", "Anda tidak memiliki akses ke cabang ini.", 403);
  }
}

export function assertCentralAccess(session: AuthenticatedSession) {
  const isCentral = session.user.branchRoles.some(
    ({ branchId, role }) =>
      branchId === null && ["super_admin", "unit_head"].includes(role.code),
  );
  if (!isCentral) {
    throw new AppError("FORBIDDEN", "Tindakan ini hanya tersedia untuk pengelola pusat.", 403);
  }
}

export function getBranchFilter(session: AuthenticatedSession, requestedBranchId?: string) {
  const scope = getBranchScope(session);

  if (requestedBranchId) {
    assertBranchAccess(session, requestedBranchId);
    return { branchId: requestedBranchId };
  }
  if (scope.global) {
    return undefined;
  }
  if (scope.branchIds.length === 0) {
    throw new AppError("FORBIDDEN", "Akun ini tidak memiliki cakupan cabang.", 403);
  }
  return { branchId: { in: scope.branchIds } };
}

export function getBranchEntityFilter(
  session: AuthenticatedSession,
  requestedBranchId?: string,
) {
  const scope = getBranchScope(session);
  if (requestedBranchId) {
    assertBranchAccess(session, requestedBranchId);
    return { id: requestedBranchId };
  }
  if (scope.global) {
    return undefined;
  }
  if (scope.branchIds.length === 0) {
    throw new AppError("FORBIDDEN", "Akun ini tidak memiliki cakupan cabang.", 403);
  }
  return { id: { in: scope.branchIds } };
}
