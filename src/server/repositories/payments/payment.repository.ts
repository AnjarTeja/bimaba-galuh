import { randomUUID } from "node:crypto";
import type {
  Prisma,
  RegistrationStatus,
} from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type PaymentTransactionClient = Prisma.TransactionClient;

export function findPublicPayment(
  id: string,
  registrationId: string,
  registrationCode: string,
) {
  return prisma.paymentTransaction.findFirst({
    where: { id, registrationId, registration: { registrationCode } },
    select: {
      id: true,
      status: true,
      registration: { select: { registrationCode: true, status: true } },
    },
  });
}

export async function savePaymentProof(input: {
  paymentId: string;
  registrationId: string;
  bytes: Uint8Array;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.paymentTransaction.findUnique({
      where: { id: input.paymentId },
      select: {
        status: true,
        registrationId: true,
        registration: { select: { status: true } },
      },
    });
    if (
      !current ||
      current.registrationId !== input.registrationId ||
      !["pending", "rejected"].includes(current.status) ||
      !["awaiting_payment", "follow_up_required"].includes(
        current.registration.status,
      )
    ) {
      return null;
    }

    const mediaAsset = await transaction.mediaAsset.create({
      data: {
        storageKey: `database:${input.checksum}:${randomUUID()}`,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        content: new Uint8Array(input.bytes),
        checksum: input.checksum,
      },
      select: { id: true },
    });
    const proof = await transaction.paymentProof.create({
      data: {
        paymentTransactionId: input.paymentId,
        mediaAssetId: mediaAsset.id,
        reviewStatus: "pending",
      },
      select: { id: true, uploadedAt: true },
    });
    await transaction.paymentTransaction.update({
      where: { id: input.paymentId },
      data: { status: "proof_submitted" },
    });
    if (current.registration.status === "awaiting_payment" ||
      current.registration.status === "follow_up_required") {
      await transaction.registration.update({
        where: { id: input.registrationId },
        data: {
          status: "awaiting_verification",
          statusHistory: {
            create: {
              fromStatus: current.registration.status,
              toStatus: "awaiting_verification",
              reason: "Bukti pembayaran diunggah.",
            },
          },
        },
      });
    }
    return proof;
  });
}

export function findPaymentForReview(
  client: PaymentTransactionClient,
  id: string,
  registrationWhere: Prisma.RegistrationWhereInput,
) {
  return client.paymentTransaction.findFirst({
    where: { id, registration: { deletedAt: null, ...registrationWhere } },
    select: {
      id: true,
      status: true,
      registrationId: true,
      registration: {
        select: {
          id: true,
          status: true,
          branchId: true,
          childName: true,
          birthDate: true,
          religion: true,
          gender: true,
          address: true,
          guardianId: true,
        },
      },
      proofs: {
        where: { reviewStatus: "pending" },
        select: { id: true },
        take: 1,
      },
    },
  });
}

export function updateReviewedPayment(
  client: PaymentTransactionClient,
  input: {
    id: string;
    reviewerId: string;
    approved: boolean;
  },
) {
  return client.paymentTransaction.updateMany({
    where: { id: input.id, status: "proof_submitted" },
    data: {
      status: input.approved ? "verified" : "rejected",
      verifiedById: input.reviewerId,
      verifiedAt: new Date(),
      ...(input.approved ? { paidAt: new Date() } : {}),
    },
  });
}

export function updateReviewedProof(
  client: PaymentTransactionClient,
  input: {
    proofId: string;
    reviewerId: string;
    approved: boolean;
    reason?: string;
  },
) {
  return client.paymentProof.updateMany({
    where: { id: input.proofId, reviewStatus: "pending" },
    data: {
      reviewStatus: input.approved ? "approved" : "rejected",
      reviewedById: input.reviewerId,
      reviewedAt: new Date(),
      rejectionReason: input.approved ? null : input.reason,
    },
  });
}

export function updateRegistrationAfterPaymentReview(
  client: PaymentTransactionClient,
  input: {
    id: string;
    fromStatus: RegistrationStatus;
    approved: boolean;
    reviewerId: string;
    reason?: string;
  },
) {
  const toStatus = input.approved ? "confirmed" : "follow_up_required";
  return client.registration.update({
    where: { id: input.id },
    data: {
      status: toStatus,
      reviewedAt: new Date(),
      statusHistory: {
        create: {
          fromStatus: input.fromStatus,
          toStatus,
          reason: input.approved ? "Bukti pembayaran disetujui." : input.reason,
          changedById: input.reviewerId,
        },
      },
    },
  });
}

export function activateStudentFromRegistration(
  client: PaymentTransactionClient,
  registration: {
    id: string;
    branchId: string;
    childName: string;
    birthDate: Date;
    religion: string | null;
    gender: string | null;
    address: string;
    guardianId: string;
  },
) {
  return client.student.upsert({
    where: { registrationId: registration.id },
    create: {
      registrationId: registration.id,
      branchId: registration.branchId,
      fullName: registration.childName,
      birthDate: registration.birthDate,
      religion: registration.religion,
      gender: registration.gender,
      address: registration.address,
      status: "active",
      guardians: {
        create: {
          guardianId: registration.guardianId,
          relationship: "wali",
          isPrimary: true,
        },
      },
    },
    update: { status: "active" },
    select: { id: true },
  });
}
