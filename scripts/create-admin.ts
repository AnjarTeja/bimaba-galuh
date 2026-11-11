import { z } from "zod";
import { prisma } from "../src/server/db/prisma";
import { hashPassword } from "../src/server/auth/password";

const BootstrapAdminSchema = z.object({
  BOOTSTRAP_ADMIN_EMAIL: z.email().max(191),
  BOOTSTRAP_ADMIN_NAME: z.string().trim().min(1).max(191),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).max(128),
});

async function main() {
  const config = BootstrapAdminSchema.parse(process.env);
  const email = config.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    throw new Error("Admin account already exists; bootstrap will not overwrite it.");
  }

  const role = await prisma.role.findUnique({
    where: { code: "super_admin" },
    select: { id: true },
  });
  if (!role) {
    throw new Error("Run `npx prisma db seed --config prisma.config.ts` before bootstrapping admin.");
  }

  const passwordHash = await hashPassword(config.BOOTSTRAP_ADMIN_PASSWORD);
  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        email,
        fullName: config.BOOTSTRAP_ADMIN_NAME,
        passwordHash,
      },
      select: { id: true, email: true },
    });
    await transaction.userBranchRole.create({
      data: {
        userId: createdUser.id,
        roleId: role.id,
        branchId: null,
      },
    });
    return createdUser;
  });
  console.info(`Created initial super-admin account: ${user.email}`);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to create initial admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
