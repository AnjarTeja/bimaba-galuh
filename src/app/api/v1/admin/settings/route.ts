import { AdminSettingsUpdateSchema } from "@/contracts/settings";
import { withAuth } from "@/server/auth/with-auth";
import {
  assertSettingsAccess,
  getAdminSettings,
  updateSettings,
} from "@/server/services/settings/admin-settings.service";
import { parseBody } from "@/server/http/parse";
import { ok } from "@/server/http/response";

const roles = ["super_admin", "unit_head"] as const;

export const GET = withAuth(roles, async (_request, _context, session) => {
  assertSettingsAccess(session);
  return ok(await getAdminSettings(session));
});

export const PATCH = withAuth(roles, async (request, _context, session) => {
  assertSettingsAccess(session);
  const input = await parseBody(request, AdminSettingsUpdateSchema);
  return ok(await updateSettings(input, session));
});
