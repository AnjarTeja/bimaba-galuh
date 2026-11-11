import { prisma } from "@/server/db/prisma";

export function findRegistrationPaymentSettings() {
  return prisma.$transaction([
    prisma.appSetting.findUnique({ where: { key: "registration_fee_idr" } }),
    prisma.appSetting.findUnique({ where: { key: "payment_instructions" } }),
  ]);
}

export function listPublicSettings() {
  return prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "public.site_title",
          "public.site_description",
          "public.vision",
          "public.mission",
          "public.contact",
          "public.service_hours",
          "public.registration_cta",
        ],
      },
    },
    select: { key: true, value: true },
  });
}
