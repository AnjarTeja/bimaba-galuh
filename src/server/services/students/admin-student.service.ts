import {
  CreateSppInvoiceSchema,
  CreateStudentSchema,
  GraduationSchema,
  RecordSppPaymentSchema,
  StudentQuerySchema,
  StudentUpdateSchema,
  UniformDeliverySchema,
} from "@/contracts/students";
import { assertBranchAccess, getBranchFilter } from "@/server/auth/branch-scope";
import type { AuthenticatedSession } from "@/server/auth/session";
import { executeIdempotent, fingerprintRequest } from "@/server/http/idempotency";
import { AppError } from "@/server/http/errors";
import {
  createStudent,
  createStudentInvoice,
  createUniformDelivery,
  findActiveBranch,
  findStudentBranch,
  findStudentDetail,
  findStudentForMutation,
  listStudentInvoices,
  listStudents,
  recordSppPayment,
  graduateStudent as graduateStudentRecord,
  updateStudent as updateStudentRecord,
} from "@/server/repositories/students/admin-student.repository";
import type { z } from "zod";

type StudentQuery = z.infer<typeof StudentQuerySchema>;
type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
type StudentUpdateInput = z.infer<typeof StudentUpdateSchema>;
type GraduationInput = z.infer<typeof GraduationSchema>;
type CreateSppInvoiceInput = z.infer<typeof CreateSppInvoiceSchema>;
type RecordSppPaymentInput = z.infer<typeof RecordSppPaymentSchema>;
type UniformDeliveryInput = z.infer<typeof UniformDeliverySchema>;

export async function listAdminStudents(
  query: StudentQuery,
  page: { skip: number; take: number },
  session: AuthenticatedSession,
) {
  const where = {
    ...(getBranchFilter(session, query.branch_id) ?? {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q } },
            { guardians: { some: { guardian: { phoneE164: { contains: query.q } } } } },
          ],
        }
      : {}),
  };
  const [records, total] = await listStudents(where, page.skip, page.take);
  return {
    data: records.map(({ fullName, birthDate, enrolledAt, graduatedAt, guardians, ...student }) => ({
      ...student,
      full_name: fullName,
      birth_date: birthDate?.toISOString().slice(0, 10) ?? null,
      enrolled_at: enrolledAt.toISOString(),
      graduated_at: graduatedAt?.toISOString() ?? null,
      primary_guardian: guardians[0]
        ? {
            name: guardians[0].guardian.name,
            phone_e164: guardians[0].guardian.phoneE164,
            relationship: guardians[0].relationship,
          }
        : null,
    })),
    total,
  };
}

export async function createAdminStudent(
  input: CreateStudentInput,
  session: AuthenticatedSession,
) {
  const branch = await findActiveBranch(input.branch_id);
  if (!branch?.active) {
    throw new AppError("VALIDATION_ERROR", "Cabang tidak tersedia.", 400);
  }
  const branchFilter = getBranchFilter(session, input.branch_id);
  if (!branchFilter || !("branchId" in branchFilter)) {
    throw new AppError("FORBIDDEN", "Cabang tidak dapat ditentukan.", 403);
  }
  const student = await createStudent(
    {
      branchId: input.branch_id,
      fullName: input.full_name,
      birthDate: input.birth_date
        ? new Date(`${input.birth_date}T00:00:00.000Z`)
        : null,
      religion: input.religion,
      gender: input.gender,
      address: input.address,
      guardian: {
        name: input.guardian.name,
        phoneE164: input.guardian.phone_e164,
        email: input.guardian.email,
        relationship: input.guardian.relationship,
      },
    },
    {
      actorUserId: session.userId,
      action: "student.created_manually",
      entityType: "student",
      metadata: { reason: input.reason },
    },
  );
  return {
    id: student.id,
    full_name: student.fullName,
    status: student.status,
    created_at: student.createdAt.toISOString(),
  };
}

export async function getAdminStudent(
  id: string,
  session: AuthenticatedSession,
) {
  const student = await findStudentDetail(id, getBranchFilter(session) ?? {});
  if (!student) {
    throw new AppError("NOT_FOUND", "Murid tidak ditemukan.", 404);
  }
  assertBranchAccess(session, student.branch.id);
  return {
    id: student.id,
    full_name: student.fullName,
    birth_date: student.birthDate?.toISOString().slice(0, 10) ?? null,
    religion: student.religion,
    gender: student.gender,
    address: student.address,
    status: student.status,
    enrolled_at: student.enrolledAt.toISOString(),
    graduated_at: student.graduatedAt?.toISOString() ?? null,
    branch: student.branch,
    registration_code: student.registration?.registrationCode ?? null,
    guardians: student.guardians.map(({ guardian, ...relation }) => ({
      ...relation,
      id: guardian.id,
      name: guardian.name,
      phone_e164: guardian.phoneE164,
      email: guardian.email,
    })),
    spp_invoices: student.sppInvoices.map(({ amountIdr, dueAt, ...invoice }) => ({
      ...invoice,
      amount_idr: amountIdr.toString(),
      due_at: dueAt?.toISOString() ?? null,
    })),
    uniform_deliveries: student.uniformDeliveries.map(({ deliveredAt, ...delivery }) => ({
      ...delivery,
      delivered_at: deliveredAt.toISOString(),
    })),
  };
}

export async function updateAdminStudent(
  id: string,
  input: StudentUpdateInput,
  session: AuthenticatedSession,
) {
  const { reason, ...fields } = input;
  if (Object.keys(fields).length === 0) {
    throw new AppError("VALIDATION_ERROR", "Tidak ada field murid untuk diperbarui.", 400);
  }
  const current = await findStudentForMutation(id, getBranchFilter(session) ?? {});
  if (!current) {
    throw new AppError("NOT_FOUND", "Murid tidak ditemukan.", 404);
  }
  assertBranchAccess(session, current.branchId);

  const updated = await updateStudentRecord(
    id,
    current.branchId,
    {
      ...(fields.full_name !== undefined ? { fullName: fields.full_name } : {}),
      ...(fields.birth_date !== undefined
        ? {
            birthDate: fields.birth_date
              ? new Date(`${fields.birth_date}T00:00:00.000Z`)
              : null,
          }
        : {}),
      ...(fields.religion !== undefined ? { religion: fields.religion } : {}),
      ...(fields.gender !== undefined ? { gender: fields.gender } : {}),
      ...(fields.address !== undefined ? { address: fields.address } : {}),
    },
    {
      actorUserId: session.userId,
      action: "student.updated",
      entityType: "student",
      metadata: { reason, changed_fields: Object.keys(fields) },
    },
  );
  return { id: updated.id, updated_at: updated.updatedAt.toISOString() };
}

export async function graduateAdminStudent(
  id: string,
  input: GraduationInput,
  session: AuthenticatedSession,
) {
  const student = await findStudentForMutation(id, getBranchFilter(session) ?? {});
  if (!student) {
    throw new AppError("NOT_FOUND", "Murid tidak ditemukan.", 404);
  }
  assertBranchAccess(session, student.branchId);
  if (student.status !== "active") {
    throw new AppError("CONFLICT", "Hanya murid aktif yang dapat diluluskan.", 409);
  }
  const updated = await graduateStudentRecord(
    id,
    student.branchId,
    new Date(input.graduated_at),
    {
      actorUserId: session.userId,
      action: "student.graduated",
      entityType: "student",
      metadata: { graduated_at: input.graduated_at, reason: input.reason },
    },
  );
  return {
    id: updated.id,
    status: updated.status,
    graduated_at: updated.graduatedAt?.toISOString() ?? null,
  };
}

export async function listAdminStudentInvoices(
  studentId: string,
  status: "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled" | undefined,
  session: AuthenticatedSession,
) {
  const student = await findStudentBranch(
    studentId,
    getBranchFilter(session) ?? {},
  );
  if (!student) {
    throw new AppError("NOT_FOUND", "Murid tidak ditemukan.", 404);
  }
  assertBranchAccess(session, student.branchId);
  const invoices = await listStudentInvoices(studentId, status);
  return invoices.map(({ amountIdr, dueAt, payments, ...invoice }) => ({
    ...invoice,
    amount_idr: amountIdr.toString(),
    due_at: dueAt?.toISOString() ?? null,
    payments: payments.map(({ amountIdr: paidAmount, paidAt, ...payment }) => ({
      ...payment,
      amount_idr: paidAmount.toString(),
      paid_at: paidAt.toISOString(),
    })),
  }));
}

export async function createAdminStudentInvoice(
  studentId: string,
  input: CreateSppInvoiceInput,
  session: AuthenticatedSession,
) {
  const student = await findStudentBranch(
    studentId,
    getBranchFilter(session) ?? {},
  );
  if (!student) {
    throw new AppError("NOT_FOUND", "Murid tidak ditemukan.", 404);
  }
  assertBranchAccess(session, student.branchId);
  if (student.status !== "active") {
    throw new AppError("CONFLICT", "Tagihan hanya dapat dibuat untuk murid aktif.", 409);
  }
  const invoice = await createStudentInvoice(
    {
      studentId,
      period: input.period,
      amountIdr: BigInt(input.amount_idr),
      dueAt: input.due_at ? new Date(input.due_at) : null,
      notes: input.notes,
    },
    {
      actorUserId: session.userId,
      branchId: student.branchId,
      action: "spp_invoice.created",
      entityType: "spp_invoice",
      metadata: { student_id: studentId, period: input.period },
    },
  );
  return {
    id: invoice.id,
    period: invoice.period,
    amount_idr: invoice.amountIdr.toString(),
    status: invoice.status,
  };
}

export async function createAdminUniformDelivery(
  studentId: string,
  input: UniformDeliveryInput,
  session: AuthenticatedSession,
) {
  const student = await findStudentBranch(
    studentId,
    getBranchFilter(session) ?? {},
  );
  if (!student) {
    throw new AppError("NOT_FOUND", "Murid tidak ditemukan.", 404);
  }
  assertBranchAccess(session, student.branchId);
  const delivery = await createUniformDelivery(
    {
      studentId,
      item: input.item,
      quantity: input.quantity,
      deliveredAt: input.delivered_at ? new Date(input.delivered_at) : new Date(),
      recordedById: session.userId,
      notes: input.notes,
    },
    student.branchId,
    {
      actorUserId: session.userId,
      action: "uniform_delivery.recorded",
      entityType: "student",
    },
  );
  return { id: delivery.id, delivered_at: delivery.deliveredAt.toISOString() };
}

export async function recordAdminSppPayment(
  invoiceId: string,
  input: RecordSppPaymentInput,
  key: string,
  session: AuthenticatedSession,
) {
  return executeIdempotent({
    scope: `spp-payment:${session.userId}:${invoiceId}`,
    key,
    fingerprint: fingerprintRequest(input),
    status: 201,
    execute: () =>
      recordSppPayment(
        {
          invoiceId,
          branchFilter: getBranchFilter(session) ?? {},
          amountIdr: BigInt(input.amount_idr),
          paidAt: new Date(input.paid_at),
          method: input.method,
          reference: input.reference,
          recordedById: session.userId,
          activity: {
            actorUserId: session.userId,
            action: "spp_payment.recorded",
            entityType: "spp_invoice",
          },
        },
        (invoice) => {
          assertBranchAccess(session, invoice.student.branchId);
          if (invoice.status === "cancelled") {
            throw new AppError("CONFLICT", "Tagihan telah dibatalkan.", 409);
          }
          const paid = invoice.payments.reduce(
            (sum, payment) => sum + payment.amountIdr,
            BigInt(0),
          );
          const amount = BigInt(input.amount_idr);
          if (paid + amount > invoice.amountIdr) {
            throw new AppError("VALIDATION_ERROR", "Pembayaran melebihi sisa tagihan.", 400);
          }
          return amount;
        },
      ),
  });
}
