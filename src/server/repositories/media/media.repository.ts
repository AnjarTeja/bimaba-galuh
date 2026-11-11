import { randomUUID } from "node:crypto";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "@/server/db/prisma";

type MediaClient = Pick<Prisma.TransactionClient, "mediaAsset">;

export function createMediaAsset(
  client: MediaClient,
  input: {
    bytes: Uint8Array;
    mimeType: string;
    sizeBytes: bigint;
    checksum: string;
    uploadedById?: string;
  },
) {
  return client.mediaAsset.create({
    data: {
      storageKey: `database:${randomUUID()}`,
      content: new Uint8Array(input.bytes),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
      uploadedById: input.uploadedById,
    },
    select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
  });
}

export function findAdminMediaAsset(id: string) {
  return prisma.mediaAsset.findUnique({
    where: { id },
    select: {
      content: true,
      mimeType: true,
      sizeBytes: true,
      paymentProof: {
        select: {
          paymentTransaction: {
            select: { registration: { select: { branchId: true } } },
          },
        },
      },
      staffPhoto: { select: { branchId: true } },
      eventMedia: { select: { event: { select: { branchId: true } } } },
    },
  });
}

const publicMimeTypes = ["image/jpeg", "image/png", "image/webp"];

export function findPublishedMediaAsset(id: string) {
  return prisma.mediaAsset.findFirst({
    where: {
      id,
      mimeType: { in: publicMimeTypes },
      OR: [
        {
          staffPhoto: {
            is: {
              active: true,
              publicationStatus: "published",
              branch: { active: true, verified: true },
            },
          },
        },
        {
          eventMedia: {
            some: {
              event: {
                publicationStatus: "published",
                branch: { active: true, verified: true },
              },
              mediaAsset: {
                consents: {
                  some: {
                    consentType: "media_publication",
                    granted: true,
                    revokedAt: null,
                  },
                },
              },
            },
          },
        },
      ],
    },
    select: { content: true, mimeType: true },
  });
}
