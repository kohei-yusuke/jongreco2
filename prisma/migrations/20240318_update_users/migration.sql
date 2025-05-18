-- AlterTable
ALTER TABLE "User" ADD COLUMN "iconPath" TEXT;

-- Update existing users
UPDATE "User" SET "iconPath" = NULL; 