import { RegistrationQuerySchema } from "@/contracts/registrations";
import { withAuth } from "@/server/auth/with-auth";
import { buildCsv } from "@/server/csv/csv-builder";
import { getRegistrationExport } from "@/server/services/exports/admin-exports.service";
import { parseQuery } from "@/server/http/parse";
import { NextResponse } from "next/server";

export const GET = withAuth(
  ["super_admin", "unit_head", "branch_admin"],
  async (request, _context, session) => {
    const query = parseQuery(request, RegistrationQuerySchema);
    const registrations = await getRegistrationExport(query, session);
    const csv = buildCsv(
      registrations.map((registration) => [
        registration.registrationCode,
        registration.childName,
        registration.status,
        registration.submittedAt.toISOString(),
        registration.guardian.name,
        registration.guardian.phoneE164,
        registration.branch.name,
      ]),
      ["registration_code", "child_name", "status", "submitted_at", "guardian_name", "guardian_phone", "branch"],
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="registrations.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  },
);
