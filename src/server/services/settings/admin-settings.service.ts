import type { z } from "zod";
import { AdminSettingsUpdateSchema } from "@/contracts/settings";
import type { Prisma } from "../../../../generated/prisma/client";
import type { AuthenticatedSession } from "@/server/auth/session";
import { assertCentralAccess } from "@/server/auth/branch-scope";
import { listAdminSettings, updateAdminSettings } from "@/server/repositories/settings/admin-settings.repository";

type SettingsInput = z.infer<typeof AdminSettingsUpdateSchema>;

const settingKeys = [
  "registration_fee_idr",
  "payment_instructions",
  "public.site_title",
  "public.site_description",
  "public.vision",
  "public.mission",
  "public.contact",
  "public.service_hours",
  "public.registration_cta",
];

export function assertSettingsAccess(session: AuthenticatedSession) {
  assertCentralAccess(session);
}

export async function getAdminSettings(session: AuthenticatedSession) {
  assertSettingsAccess(session);
  const settings = await listAdminSettings(settingKeys);
  return Object.fromEntries(
    settings.map(({ key, value, updatedAt }) => [
      key,
      { value, updated_at: updatedAt.toISOString() },
    ]),
  );
}

export async function updateSettings(input: SettingsInput, session: AuthenticatedSession) {
  assertSettingsAccess(session);
  const entries: Array<[string, Prisma.InputJsonValue]> = [];
  if (input.registration_fee_idr !== undefined) {
    entries.push(["registration_fee_idr", input.registration_fee_idr]);
  }
  if (input.payment_instructions !== undefined) {
    entries.push(["payment_instructions", input.payment_instructions]);
  }
  for (const [key, value] of Object.entries(input.public_site ?? {})) {
    if (value !== undefined) {
      entries.push([`public.${key}`, value]);
    }
  }
  if (entries.length === 0) {
    return { updated: false as const };
  }
  await updateAdminSettings(entries, session.userId);
  return { updated: true as const, keys: entries.map(([key]) => key) };
}
