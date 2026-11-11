import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export function getDashboardMetrics(
  registrationFilter: Prisma.RegistrationWhereInput,
  studentFilter: Prisma.StudentWhereInput,
  paymentRegistrationFilter: Prisma.RegistrationWhereInput,
  messageFilter: Prisma.MessageWhereInput,
  branchEntityFilter: Prisma.BranchWhereInput,
  paymentProofRegistrationFilter: Prisma.RegistrationWhereInput,
) {
  return Promise.all([
    prisma.registration.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...registrationFilter },
      _count: { _all: true },
    }),
    prisma.student.count({
      where: { status: "active", ...studentFilter },
    }),
    prisma.paymentTransaction.count({
      where: {
        status: { in: ["pending", "proof_submitted"] },
        registration: { deletedAt: null, ...paymentRegistrationFilter },
      },
    }),
    prisma.message.count({
      where: { status: "new", ...messageFilter },
    }),
    prisma.branch.count({ where: branchEntityFilter }),
    prisma.paymentProof.count({
      where: {
        reviewStatus: "pending",
        paymentTransaction: {
          registration: { deletedAt: null, ...paymentProofRegistrationFilter },
        },
      },
    }),
  ]);
}
