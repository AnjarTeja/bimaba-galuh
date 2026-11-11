import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export function exportRegistrations(where: Prisma.RegistrationWhereInput) {
  return prisma.registration.findMany({
    where,
    select: {
      registrationCode: true,
      childName: true,
      status: true,
      submittedAt: true,
      guardian: { select: { name: true, phoneE164: true } },
      branch: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10_000,
  });
}

export function exportStudents(where: Prisma.StudentWhereInput) {
  return prisma.student.findMany({
    where,
    select: {
      fullName: true,
      status: true,
      enrolledAt: true,
      branch: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
    take: 10_000,
  });
}

export function getReportMetrics(
  branchFilter: Prisma.RegistrationWhereInput,
  studentFilter: Prisma.StudentWhereInput,
  paymentFilter: Prisma.PaymentTransactionWhereInput,
  messageFilter: Prisma.MessageWhereInput,
) {
  return Promise.all([
    prisma.registration.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...branchFilter },
      _count: { _all: true },
    }),
    prisma.student.count({ where: studentFilter }),
    prisma.paymentTransaction.aggregate({
      where: paymentFilter,
      _count: { _all: true },
      _sum: { amountIdr: true },
    }),
    prisma.message.count({ where: messageFilter }),
  ]);
}
