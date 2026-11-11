import { z } from "zod";
import { withAuth } from "@/server/auth/with-auth";
import { buildCsv } from "@/server/csv/csv-builder";
import { getReportExport } from "@/server/services/exports/admin-exports.service";
import { parseQuery } from "@/server/http/parse";
import { NextResponse } from "next/server";

const ReportQuerySchema = z.object({
  branch_id: z.uuid().optional(),
  from: z.iso.date(),
  to: z.iso.date(),
});

export const GET = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    const query = parseQuery(request, ReportQuerySchema);
    const rows = await getReportExport(query, session);
    return new NextResponse(buildCsv(rows, ["metric", "status", "value"]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reports.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  },
);
