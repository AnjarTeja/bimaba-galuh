/*
  Warnings:

  - A unique constraint covering the columns `[phone_e164]` on the table `guardians` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `registrations` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deletion_reason` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `guardians_phone_e164_key` ON `guardians`(`phone_e164`);

-- CreateIndex
CREATE INDEX `registrations_deleted_at_idx` ON `registrations`(`deleted_at`);
