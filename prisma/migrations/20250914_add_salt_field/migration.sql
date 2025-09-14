-- AlterTable
ALTER TABLE "User" ADD COLUMN "salt" TEXT NOT NULL DEFAULT gen_random_uuid();
