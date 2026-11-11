import type { z } from "zod";
import { RegistrationQuerySchema } from "@/contracts/registrations";
import { StudentQuerySchema } from "@/contracts/students";
import { getBranchFilter } from "@/server/auth/branch-scope";
import type { AuthenticatedSession } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import {
  exportRegistrations as exportRegistrationRecords,
  exportStudents as exportStudentRecords,
  getReportMetrics,
} from "@/server/repositories/exports/admin-exports.repository";

type RegistrationQuery = z.infer<typeof RegistrationQuerySchema>;
type StudentQuery = z.infer<typeof StudentQuerySchema>;
type ReportQuery = {
  branch_id?: string;
  from: string;
  to: string;
};

export async function getRegistrationExport(
  query: RegistrationQuery,
  session: AuthenticatedSession,
) {
  const where = {
    deletedAt: null,
    ...getBranchFilter(session, query.branch_id),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(query.q
      ? {
          OR: [
            { registrationCode: { contains: query.q } },
            { childName: { contains: query.q } },
            { guardian: { name: { contains: query.q } } },
          ],
        }
      : {}),
  };
  return exportRegistrationRecords(where);
}

export async function getStudentExport(
  query: StudentQuery,
  session: AuthenticatedSession,
) {
  return exportStudentRecords({
    ...getBranchFilter(session, query.branch_id),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { fullName: { contains: query.q } } : {}),
  });
}

export async function getReportExport(
  query: ReportQuery,
  session: AuthenticatedSession,
) {
  if (query.from > query.to) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Tanggal awal harus sebelum atau sama dengan tanggal akhir.",
      400,
    );
  }
  const branchFilter = getBranchFilter(session, query.branch_id);
  const dateRange = {
    gte: new Date(`${query.from}T00:00:00.000Z`),
    lte: new Date(`${query.to}T23:59:59.999Z`),
  };
  const [registrations, students, payments, messages] = await getReportMetrics(
    { ...branchFilter, createdAt: dateRange },
    {
      ...branchFilter,
      enrolledAt: dateRange,
    },
    {
      status: "verified",
      ...branchFilter,
      paidAt: dateRange,
    },
    {
      ...branchFilter,
      createdAt: dateRange,
    },
  );
  return [
    ...registrations.map((row) => ["registrations", row.status, String(row._count._all)]),
    ["students", "enrolled", String(students)],
    ["payments", "verified_count", String(payments._count._all)],
    ["payments", "verified_amount_idr", payments._sum.amountIdr?.toString() ?? "0"],
    ["messages", "received", String(messages)],
  ];
}
