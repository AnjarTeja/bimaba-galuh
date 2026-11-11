import { z } from "zod";

export const AdminSettingsUpdateSchema = z.object({
  registration_fee_idr: z.number().int().nonnegative().safe().optional(),
  payment_instructions: z.object({
    bank_name: z.string().trim().max(191).optional(),
    account_name: z.string().trim().max(191).optional(),
    account_number: z.string().trim().max(191).optional(),
    virtual_account: z.string().trim().max(191).optional(),
    instructions: z.string().trim().max(5000).optional(),
    registration_due_days: z.number().int().min(1).max(90).optional(),
  }).optional(),
  public_site: z.object({
    site_title: z.string().trim().max(191).optional(),
    site_description: z.string().trim().max(1000).optional(),
    vision: z.string().trim().max(5000).optional(),
    mission: z.string().trim().max(5000).optional(),
    contact: z.string().trim().max(2000).optional(),
    service_hours: z.string().trim().max(1000).optional(),
    registration_cta: z.string().trim().max(500).optional(),
  }).optional(),
});
