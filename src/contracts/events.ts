import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const EventQuerySchema = PaginationQuerySchema.extend({
  branch: z.uuid().optional(),
  category: z.string().trim().max(100).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const EventInputSchema = z.object({
  branch_id: z.uuid(),
  title: z.string().trim().min(1).max(191),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(10000).optional(),
  event_date: z.iso.datetime({ offset: true }).optional(),
  media_asset_ids: z.array(z.uuid()).max(20).default([]),
});

export const PublicationReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(2000).optional(),
}).refine(
  (value) => value.decision !== "reject" || Boolean(value.reason?.trim()),
  { path: ["reason"], message: "Alasan penolakan wajib diisi." },
);
