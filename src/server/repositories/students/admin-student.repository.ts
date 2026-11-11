import type { Prisma } from "../../../../generated/prisma/client";
import { recordActivity } from "@/server/audit/activity-log";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/http/errors";

type ActivityInput = Parameters<typeof recordActivity>[0];

const lockedInvoiceSelect = {
  id: true,
  amountIdr: true,
  status: true,
  student: { select: { id: true, branchId: true } },
  payments: { select: { amountIdr: true } },
} as const satisfies Prisma.SppInvoiceSelect;

export type LockedSppInvoice = Prisma.SppInvoiceGetPayload<{
  select: typeof lockedInvoiceSelect;
}>;

export function findActiveBranch(id: string) {
  return prisma.branch.findUnique({
    where: { id },
    select: { id: true, active: true },
  });
}

export function listStudents(
  where: Prisma.StudentWhereInput,
  skip: number,
  take: number,
) {
  return prisma.$transaction([
    prisma.student.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        status: true,
        enrolledAt: true,
        graduatedAt: true,
        branch: { select: { id: true, name: true } },
        guardians: {
          where: { isPrimary: true },
          select: { relationship: true, guardian: { select: { name: true, phoneE164: true } } },
          take: 1,
        },
      },
      orderBy: [{ fullName: "asc" }],
      skip,
      take,
    }),
    prisma.student.count({ where }),
  ]);
}

export function createStudent(
  input: {
    branchId: string;
    fullName: string;
    birthDate: Date | null;
    religion?: string;
    gender?: string;
    address?: string;
    guardian: {
      name: string;
      phoneE164: string;
      email?: string;
      relationship: string;
    };
  },
  activity: ActivityInput,
) {
  return prisma.$transaction(async (transaction) => {
    const guardian = await transaction.guardian.upsert({
      where: { phoneE164: input.guardian.phoneE164 },
      create: {
        name: input.guardian.name,
        phoneE164: input.guardian.phoneE164,
        email: input.guardian.email,
      },
      update: {
        name: input.guardian.name,
        ...(input.guardian.email ? { email: input.guardian.email } : {}),
      },
      select: { id: true },
    });
    const createdStudent = await transaction.student.create({
      data: {
        branchId: input.branchId,
        fullName: input.fullName,
        birthDate: input.birthDate,
        religion: input.religion,
        gender: input.gender,
        address: input.address,
        guardians: {
          create: {
            guardianId: guardian.id,
            relationship: input.guardian.relationship,
            isPrimary: true,
          },
        },
      },
      select: { id: true, branchId: true, fullName: true, status: true, createdAt: true },
    });
    await recordActivity(
      { ...activity, branchId: createdStudent.branchId, entityId: createdStudent.id },
      transaction,
    );
    return createdStudent;
  });
}

export function findStudentDetail(
  id: string,
  branchFilter: Prisma.StudentWhereInput,
) {
  return prisma.student.findFirst({
    where: { id, ...branchFilter },
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      religion: true,
      gender: true,
      address: true,
      status: true,
      enrolledAt: true,
      graduatedAt: true,
      branch: { select: { id: true, name: true } },
      registration: { select: { registrationCode: true } },
      guardians: {
        select: {
          relationship: true,
          isPrimary: true,
          guardian: { select: { id: true, name: true, phoneE164: true, email: true } },
        },
      },
      sppInvoices: {
        select: { id: true, period: true, amountIdr: true, status: true, dueAt: true },
        orderBy: { period: "desc" },
        take: 12,
      },
      uniformDeliveries: {
        select: { id: true, item: true, quantity: true, deliveredAt: true, notes: true },
        orderBy: { deliveredAt: "desc" },
        take: 20,
      },
    },
  });
}

export function findStudentForMutation(
  id: string,
  branchFilter: Prisma.StudentWhereInput,
) {
  return prisma.student.findFirst({
    where: { id, ...branchFilter },
    select: { id: true, branchId: true, status: true },
  });
}

export function updateStudent(
  id: string,
  branchId: string,
  data: {
    fullName?: string;
    birthDate?: Date | null;
    religion?: string | null;
    gender?: string | null;
    address?: string | null;
  },
  activity: ActivityInput,
) {
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.student.update({
      where: { id },
      data,
      select: { id: true, updatedAt: true },
    });
    await recordActivity({ ...activity, branchId, entityId: id }, transaction);
    return updated;
  });
}

export function graduateStudent(
  id: string,
  branchId: string,
  graduatedAt: Date,
  activity: ActivityInput,
) {
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.student.update({
      where: { id },
      data: { status: "graduated", graduatedAt },
      select: { id: true, status: true, graduatedAt: true },
    });
    await recordActivity({ ...activity, branchId, entityId: id }, transaction);
    return updated;
  });
}

export function findStudentBranch(
  id: string,
  branchFilter: Prisma.StudentWhereInput,
) {
  return prisma.student.findFirst({
    where: { id, ...branchFilter },
    select: { id: true, branchId: true, status: true },
  });
}

export function listStudentInvoices(
  studentId: string,
  status?: "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled",
) {
  return prisma.sppInvoice.findMany({
    where: { studentId, ...(status ? { status } : {}) },
    select: {
      id: true,
      period: true,
      amountIdr: true,
      dueAt: true,
      status: true,
      notes: true,
      payments: { select: { amountIdr: true, paidAt: true, method: true, reference: true } },
    },
    orderBy: { period: "desc" },
  });
}

export function createStudentInvoice(
  input: {
    studentId: string;
    period: string;
    amountIdr: bigint;
    dueAt: Date | null;
    notes?: string;
  },
  activity: ActivityInput,
) {
  return prisma.$transaction(async (transaction) => {
    const invoice = await transaction.sppInvoice.create({
      data: input,
      select: { id: true, period: true, amountIdr: true, status: true },
    });
    await recordActivity(
      { ...activity, entityId: invoice.id },
      transaction,
    );
    return invoice;
  });
}

export function createUniformDelivery(
  input: {
    studentId: string;
    item: string;
    quantity: number;
    deliveredAt: Date;
    recordedById: string;
    notes?: string;
  },
  branchId: string,
  activity: ActivityInput,
) {
  return prisma.$transaction(async (transaction) => {
    const delivery = await transaction.uniformDelivery.create({
      data: input,
      select: { id: true, deliveredAt: true },
    });
    await recordActivity(
      {
        ...activity,
        branchId,
        entityId: input.studentId,
        metadata: {
          delivery_id: delivery.id,
          item: input.item,
          quantity: input.quantity,
        },
      },
      transaction,
    );
    return delivery;
  });
}

export async function recordSppPayment(
  input: {
    invoiceId: string;
    branchFilter: Prisma.StudentWhereInput;
    amountIdr: bigint;
    paidAt: Date;
    method: string;
    reference?: string;
    recordedById: string;
    activity: ActivityInput;
  },
  validateAmount: (invoice: LockedSppInvoice) => bigint,
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM spp_invoices WHERE id = ${input.invoiceId} FOR UPDATE
    `;
    const invoice = await transaction.sppInvoice.findFirst({
      where: { id: input.invoiceId, student: input.branchFilter },
      select: lockedInvoiceSelect,
    });
    if (!invoice) {
      throw new AppError("NOT_FOUND", "Tagihan tidak ditemukan.", 404);
    }

    const amount = validateAmount(invoice);
    const payment = await transaction.sppPayment.create({
      data: {
        invoiceId: invoice.id,
        amountIdr: amount,
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference,
        recordedById: input.recordedById,
      },
      select: { id: true, amountIdr: true, paidAt: true },
    });
    const totalPaid = invoice.payments.reduce(
      (sum, item) => sum + item.amountIdr,
      amount,
    );
    await transaction.sppInvoice.update({
      where: { id: invoice.id },
      data: {
        status: totalPaid === invoice.amountIdr ? "paid" : "partially_paid",
      },
    });
    await recordActivity(
      {
        ...input.activity,
        branchId: invoice.student.branchId,
        entityId: invoice.id,
        metadata: {
          payment_id: payment.id,
          amount_idr: amount.toString(),
        },
      },
      transaction,
    );
    return {
      id: payment.id,
      amount_idr: payment.amountIdr.toString(),
      paid_at: payment.paidAt.toISOString(),
    };
  });
}
