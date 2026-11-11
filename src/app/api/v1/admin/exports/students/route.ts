import { StudentQuerySchema } from "@/contracts/students";
import { withAuth } from "@/server/auth/with-auth";
import { buildCsv } from "@/server/csv/csv-builder";
import { getStudentExport } from "@/server/services/exports/admin-exports.service";
import { parseQuery } from "@/server/http/parse";
import { NextResponse } from "next/server";

export const GET = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    const query = parseQuery(request, StudentQuerySchema);
    const students = await getStudentExport(query, session);
    const csv = buildCsv(
      students.map((student) => [
        student.fullName,
        student.status,
        student.enrolledAt.toISOString(),
        student.branch.name,
      ]),
      ["student_name", "status", "enrolled_at", "branch"],
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="students.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  },
);
