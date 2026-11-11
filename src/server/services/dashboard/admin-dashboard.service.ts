import { getBranchEntityFilter, getBranchFilter } from "@/server/auth/branch-scope";
import type { AuthenticatedSession } from "@/server/auth/session";
import { getDashboardMetrics } from "@/server/repositories/dashboard/admin-dashboard.repository";

type DashboardQuery = {
  branch_id?: string;
  from?: string;
  to?: string;
};

export async function getDashboard(
  query: DashboardQuery,
  session: AuthenticatedSession,
) {
  const branchFilter = getBranchFilter(session, query.branch_id);
  const branchEntityFilter = getBranchEntityFilter(session, query.branch_id);
  const dateFilter =
    query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {};
  const [
    registrationsByStatus,
    activeStudents,
    pendingPayments,
    newMessages,
    branches,
    pendingReviews,
  ] = await getDashboardMetrics(
    { ...branchFilter, ...dateFilter },
    branchFilter ?? {},
    branchFilter ?? {},
    branchFilter ?? {},
    branchEntityFilter ?? {},
    branchFilter ?? {},
  );
  return {
    registrations_by_status: Object.fromEntries(
      registrationsByStatus.map((row) => [row.status, row._count._all]),
    ),
    active_students: activeStudents,
    pending_payment_transactions: pendingPayments,
    pending_payment_proofs: pendingReviews,
    new_messages: newMessages,
    branches,
  };
}
