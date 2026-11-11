import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const CreateMessageSchema = z.object({
  name: z.string().trim().min(1).max(191),
  contact: z.string().trim().min(1).max(191),
  category: z.string().trim().min(1).max(100),
  branch_id: z.uuid().optional(),
  body: z.string().trim().min(1).max(10000),
  consent_contact: z.literal(true),
});

export const MessageQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["new", "in_progress", "resolved", "archived"]).optional(),
  branch_id: z.uuid().optional(),
});
