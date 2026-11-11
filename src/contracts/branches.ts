import { z } from "zod";
import { PaginationQuerySchema } from "./common";

const slugSchema = z.string().trim().min(2).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const BranchQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(191).optional(),
  active: z.enum(["true", "false"]).optional(),
});

export const BranchInputSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(191),
  area: z.string().trim().min(1).max(191),
  address: z.string().trim().max(5000).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  hours: z.record(z.string(), z.json()).optional(),
  facilities: z.string().trim().max(5000).nullable().optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  active: z.boolean().optional(),
});

export const BranchUpdateSchema = BranchInputSchema.partial().extend({
  verified: z.boolean().optional(),
});

export type BranchInput = z.infer<typeof BranchInputSchema>;
