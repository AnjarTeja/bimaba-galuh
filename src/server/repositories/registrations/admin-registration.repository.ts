import type {
  Prisma,
  RegistrationStatus,
} from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type RegistrationClient = Pick<Prisma.TransactionClient, "registration">;

export function findRegistrationDetail(
  id: string,
  branchFilter: Prisma.RegistrationWhereInput,
) {
  return prisma.registration.findFirst({
    where: {
      id,
      deletedAt: null,
      ...branchFilter,
    },
    select: {
      id: true,
      registrationCode: true,
      childName: true,
      birthDate: true,
      religion: true,
      gender: true,
      address: true,
      consultationAt: true,
      notes: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      updatedAt: true,
      guardian: { select: { id: true, name: true, phoneE164: true, email: true } },
      branch: { select: { id: true, name: true } },
      consents: {
        select: {
          consentType: true,
          policyVersion: true,
          granted: true,
          grantedAt: true,
          revokedAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      statusHistory: {
        select: {
          fromStatus: true,
          toStatus: true,
          reason: true,
          changedAt: true,
          changedBy: { select: { fullName: true } },
        },
        orderBy: { changedAt: "asc" },
      },
      transactions: {
        select: {
          id: true,
          amountIdr: true,
          currency: true,
          status: true,
          provider: true,
          dueAt: true,
          paidAt: true,
          proofs: {
            select: {
              id: true,
              reviewStatus: true,
              uploadedAt: true,
              reviewedAt: true,
              rejectionReason: true,
              mediaAsset: { select: { id: true, mimeType: true, sizeBytes: true } },
            },
            orderBy: { uploadedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export function findRegistrationForMutation(
  id: string,
  branchFilter: Prisma.RegistrationWhereInput,
) {
  return prisma.registration.findFirst({
    where: {
      id,
      deletedAt: null,
      ...branchFilter,
    },
    select: { status: true, branchId: true, updatedAt: true },
  });
}

export function listRegistrations(
  where: Prisma.RegistrationWhereInput,
  skip: number,
  take: number,
) {
  return prisma.$transaction([
    prisma.registration.findMany({
      where,
      select: {
        id: true,
        registrationCode: true,
        childName: true,
        birthDate: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        guardian: { select: { name: true, phoneE164: true } },
        branch: { select: { id: true, name: true } },
        transactions: {
          select: { amountIdr: true, status: true, dueAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.registration.count({ where }),
  ]);
}

export type RegistrationUpdateFields = {
  child_name?: string;
  birth_date?: Date;
  religion?: string | null;
  gender?: string | null;
  address?: string;
  consultation_at?: string | null;
  notes?: string | null;
};

export function updateRegistration(
  client: RegistrationClient,
  id: string,
  fields: RegistrationUpdateFields,
) {
  return client.registration.update({
    where: { id },
    data: {
      ...(fields.child_name !== undefined ? { childName: fields.child_name } : {}),
      ...(fields.birth_date !== undefined ? { birthDate: fields.birth_date } : {}),
      ...(fields.religion !== undefined ? { religion: fields.religion } : {}),
      ...(fields.gender !== undefined ? { gender: fields.gender } : {}),
      ...(fields.address !== undefined ? { address: fields.address } : {}),
      ...(fields.consultation_at !== undefined
        ? {
            consultationAt: fields.consultation_at
              ? new Date(fields.consultation_at)
              : null,
          }
        : {}),
      ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
    },
    select: { id: true, updatedAt: true },
  });
}

export function archiveRegistration(
  client: RegistrationClient,
  input: {
    id: string;
    fromStatus: RegistrationStatus;
    reason: string;
    actorUserId: string;
  },
) {
  return client.registration.update({
    where: { id: input.id },
    data: {
      status: "withdrawn",
      deletedAt: new Date(),
      deletionReason: input.reason,
      statusHistory: {
        create: {
          fromStatus: input.fromStatus,
          toStatus: "withdrawn",
          reason: input.reason,
          changedById: input.actorUserId,
        },
      },
    },
  });
}

export async function transitionRegistration(
  client: Pick<
    Prisma.TransactionClient,
    "registration" | "registrationStatusHistory"
  >,
  input: {
    id: string;
    expectedUpdatedAt: Date;
    fromStatus: RegistrationStatus;
    toStatus: RegistrationStatus;
    reason?: string;
    actorUserId: string;
  },
) {
  const changed = await client.registration.updateMany({
    where: {
      id: input.id,
      updatedAt: input.expectedUpdatedAt,
      status: input.fromStatus,
    },
    data: {
      status: input.toStatus,
      reviewedAt: ["confirmed", "rejected"].includes(input.toStatus)
        ? new Date()
        : undefined,
    },
  });
  if (changed.count !== 1) {
    return null;
  }
  const result = await client.registration.findUniqueOrThrow({
    where: { id: input.id },
    select: { updatedAt: true },
  });
  await client.registrationStatusHistory.create({
    data: {
      registrationId: input.id,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      reason: input.reason,
      changedById: input.actorUserId,
    },
  });
  return result;
}
