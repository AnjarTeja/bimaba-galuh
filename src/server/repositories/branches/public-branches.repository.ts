import { prisma } from "@/server/db/prisma";

export function listPublicBranches(input: {
  q?: string;
  skip: number;
  take: number;
}) {
  const where = {
    active: true,
    verified: true,
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q } },
            { area: { contains: input.q } },
          ],
        }
      : {}),
  };
  return prisma.$transaction([
    prisma.branch.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        area: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        hours: true,
        facilities: true,
        description: true,
      },
      orderBy: [{ name: "asc" }],
      skip: input.skip,
      take: input.take,
    }),
    prisma.branch.count({ where }),
  ]);
}

export function findPublicBranch(slug: string) {
  return prisma.branch.findFirst({
    where: { slug, active: true, verified: true },
    select: {
      id: true,
      slug: true,
      name: true,
      area: true,
      address: true,
      latitude: true,
      longitude: true,
      phone: true,
      hours: true,
      facilities: true,
      description: true,
    },
  });
}
