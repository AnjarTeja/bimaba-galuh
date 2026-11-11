import { prisma } from "@/server/db/prisma";

export function listPublicEvents(input: {
  branch?: string;
  category?: string;
  from?: string;
  to?: string;
  skip: number;
  take: number;
}) {
  const where = {
    publicationStatus: "published" as const,
    branch: { active: true, verified: true },
    ...(input.branch ? { branchId: input.branch } : {}),
    ...(input.category ? { category: { contains: input.category } } : {}),
    ...(input.from || input.to
      ? {
          eventDate: {
            ...(input.from
              ? { gte: new Date(`${input.from}T00:00:00.000Z`) }
              : {}),
            ...(input.to
              ? { lte: new Date(`${input.to}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {}),
  };
  return prisma.$transaction([
    prisma.event.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        eventDate: true,
        branch: { select: { id: true, name: true, slug: true } },
        media: {
          select: {
            mediaAssetId: true,
            sortOrder: true,
            mediaAsset: {
              select: {
                id: true,
                consents: {
                  where: {
                    consentType: "media_publication",
                    granted: true,
                    revokedAt: null,
                  },
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      skip: input.skip,
      take: input.take,
    }),
    prisma.event.count({ where }),
  ]);
}
