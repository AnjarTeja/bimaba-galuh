import { prisma } from "@/server/db/prisma";

export function listPublicStaff(input: {
  branch?: string;
  role?: string;
  skip: number;
  take: number;
}) {
  const where = {
    active: true,
    publicationStatus: "published" as const,
    branch: { active: true, verified: true },
    ...(input.branch ? { branchId: input.branch } : {}),
    ...(input.role ? { roleTitle: { contains: input.role } } : {}),
  };
  return prisma.$transaction([
    prisma.staffMember.findMany({
      where,
      select: {
        id: true,
        name: true,
        roleTitle: true,
        branch: { select: { id: true, name: true, slug: true } },
        photoAsset: { select: { id: true } },
      },
      orderBy: [{ name: "asc" }],
      skip: input.skip,
      take: input.take,
    }),
    prisma.staffMember.count({ where }),
  ]);
}
