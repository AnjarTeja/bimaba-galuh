import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const StaffQuerySchema = PaginationQuerySchema.extend({
  branch: z.uuid().optional(),
  role: z.string().trim().max(191).optional(),
});

export const StaffInputSchema = z.object({
  branch_id: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(191),
  role_title: z.string().trim().min(1).max(191),
  active: z.boolean().optional(),
  publication_status: z.enum(["draft", "pending_review", "published", "rejected", "archived"]).optional(),
  photo_asset_id: z.uuid().nullable().optional(),
});
