import { prisma } from "../src/server/db/prisma";

async function main() {
  const roles = [
    { code: "super_admin", name: "Super Admin" },
    { code: "unit_head", name: "Kepala Unit" },
    { code: "branch_admin", name: "Admin Cabang" },
    { code: "teacher", name: "Pendidik" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: role,
    });
  }

  await prisma.branch.upsert({
    where: { slug: "demo-cabang" },
    update: {},
    create: {
      slug: "demo-cabang",
      name: "DEMO - Cabang Contoh",
      area: "DEMO",
      description: "Data contoh untuk pengembangan; bukan informasi cabang nyata.",
      active: false,
      verified: false,
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error("Gagal menjalankan seed data DEMO:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
