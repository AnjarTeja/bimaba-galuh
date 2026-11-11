import { z } from "zod";

export const PaymentReviewSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve") }),
  z.object({
    decision: z.literal("reject"),
    reason: z.string().trim().min(1).max(2000),
  }),
]);

export const PaymentInstructionsQuerySchema = z.object({
  verification_token: z.string().min(16).max(512),
});
