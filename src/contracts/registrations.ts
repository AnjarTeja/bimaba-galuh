import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const RegistrationStatusSchema = z.enum([
  "submitted",
  "awaiting_payment",
  "awaiting_verification",
  "under_review",
  "follow_up_required",
  "confirmed",
  "rejected",
  "withdrawn",
  "expired",
]);

const ConsentInputSchema = z.object({
  consent_type: z.enum(["registration_processing", "contact", "other"]),
  policy_version: z.string().trim().min(1).max(64),
  granted: z.literal(true),
});

export const CreateRegistrationSchema = z.object({
  child_name: z.string().trim().min(1).max(191),
  birth_date: z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`)),
  religion: z.string().trim().max(100).optional(),
  gender: z.string().trim().max(50).optional(),
  address: z.string().trim().min(1).max(5000),
  guardian: z.object({
    name: z.string().trim().min(1).max(191),
    phone_e164: z.string().regex(/^\+[1-9]\d{7,14}$/),
    email: z.email().max(191).optional(),
  }),
  branch_id: z.uuid(),
  consultation_at: z.iso.datetime({ offset: true }).optional(),
  notes: z.string().trim().max(5000).optional(),
  consents: z.array(ConsentInputSchema).min(1).max(5),
});

export const RegistrationQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(191).optional(),
  status: RegistrationStatusSchema.optional(),
  branch_id: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export const RegistrationTransitionSchema = z.object({
  to_status: RegistrationStatusSchema,
  reason: z.string().trim().max(2000).optional(),
  expected_updated_at: z.iso.datetime({ offset: true }),
});

export const RegistrationUpdateSchema = z.object({
  child_name: z.string().trim().min(1).max(191).optional(),
  birth_date: z.iso.date().transform((value) => new Date(`${value}T00:00:00.000Z`)).optional(),
  religion: z.string().trim().max(100).nullable().optional(),
  gender: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().min(1).max(5000).optional(),
  consultation_at: z.iso.datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  reason: z.string().trim().min(1).max(2000),
});

export const RegistrationStatusLookupSchema = z.object({
  registration_code: z.string().trim().min(1).max(64),
  verification_token: z.string().min(16).max(512),
});
