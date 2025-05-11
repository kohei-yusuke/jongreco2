/*
  Warnings:

  - You are about to drop the column `date` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `Score` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Score` table. All the data in the column will be lost.
  - Added the required column `east` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `north` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `round` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `south` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `west` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_userId_fkey";

-- DropForeignKey
ALTER TABLE "Score" DROP CONSTRAINT "Score_userId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "date",
ALTER COLUMN "initialPoints" DROP DEFAULT,
ALTER COLUMN "returnPoints" DROP DEFAULT,
ALTER COLUMN "uma1" DROP DEFAULT,
ALTER COLUMN "uma2" DROP DEFAULT,
ALTER COLUMN "uma3" DROP DEFAULT,
ALTER COLUMN "uma4" DROP DEFAULT,
ALTER COLUMN "chipPoints" DROP DEFAULT,
ALTER COLUMN "chipEnabled" DROP DEFAULT,
ALTER COLUMN "yakitoriPoints" DROP DEFAULT,
ALTER COLUMN "yakitoriEnabled" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "Score" DROP COLUMN "score",
DROP COLUMN "userId",
ADD COLUMN     "east" INTEGER NOT NULL,
ADD COLUMN     "north" INTEGER NOT NULL,
ADD COLUMN     "round" INTEGER NOT NULL,
ADD COLUMN     "south" INTEGER NOT NULL,
ADD COLUMN     "west" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Score_gameId_idx" ON "Score"("gameId");
