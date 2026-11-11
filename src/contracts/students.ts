import { z } from "zod";
import { PaginationQuerySchema } from "./common";

export const StudentStatusSchema = z.enum([
  "active",
  "graduated",
  "withdrawn",
  "inactive",
]);

export const StudentQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().max(191).optional(),
  branch_id: z.uuid().optional(),
  status: StudentStatusSchema.optional(),
});

export const CreateStudentSchema = z.object({
  branch_id: z.uuid(),
  full_name: z.string().trim().min(1).max(191),
  birth_date: z.iso.date().optional(),
  religion: z.string().trim().max(100).optional(),
  gender: z.string().trim().max(50).optional(),
  address: z.string().trim().max(5000).optional(),
  guardian: z.object({
    name: z.string().trim().min(1).max(191),
    phone_e164: z.string().regex(/^\+[1-9]\d{7,14}$/),
    relationship: z.string().trim().min(1).max(100),
    email: z.email().max(191).optional(),
  }),
  reason: z.string().trim().min(1).max(2000),
});

export const StudentUpdateSchema = z.object({
  full_name: z.string().trim().min(1).max(191).optional(),
  birth_date: z.iso.date().nullable().optional(),
  religion: z.string().trim().max(100).nullable().optional(),
  gender: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().max(5000).nullable().optional(),
  reason: z.string().trim().min(1).max(2000),
});

export const CreateSppInvoiceSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  amount_idr: z.number().int().nonnegative().safe(),
  due_at: z.iso.datetime({ offset: true }).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const RecordSppPaymentSchema = z.object({
  amount_idr: z.number().int().positive().safe(),
  paid_at: z.iso.datetime({ offset: true }),
  method: z.string().trim().min(1).max(100),
  reference: z.string().trim().max(191).optional(),
});

export const UniformDeliverySchema = z.object({
  item: z.string().trim().min(1).max(191),
  quantity: z.number().int().min(1).max(100),
  delivered_at: z.iso.datetime({ offset: true }).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const GraduationSchema = z.object({
  graduated_at: z.iso.datetime({ offset: true }),
  reason: z.string().trim().min(1).max(2000),
});
