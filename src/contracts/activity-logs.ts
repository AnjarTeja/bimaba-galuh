import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const ActivityLogQuerySchema = PaginationQuerySchema.extend({
  branch_id: z.uuid().optional(),
  actor_user_id: z.uuid().optional(),
  entity_type: z.string().trim().max(100).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
