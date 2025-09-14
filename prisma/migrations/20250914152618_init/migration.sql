-- CreateEnum
CREATE TYPE "public"."GameStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "salt" TEXT DEFAULT gen_random_uuid(),
    "name" TEXT,
    "iconPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "initialPoints" INTEGER NOT NULL DEFAULT 25000,
    "returnPoints" INTEGER NOT NULL DEFAULT 30000,
    "chipPoints" INTEGER NOT NULL DEFAULT 1000,
    "yakitoriPoints" INTEGER NOT NULL DEFAULT 6000,
    "yakitoriMode" TEXT NOT NULL DEFAULT 'distribution',
    "uma1" INTEGER NOT NULL DEFAULT 10,
    "uma2" INTEGER NOT NULL DEFAULT 5,
    "uma3" INTEGER NOT NULL DEFAULT -5,
    "uma4" INTEGER NOT NULL DEFAULT -10,
    "chipEnabled" BOOLEAN NOT NULL DEFAULT true,
    "yakitoriEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."GameStatus" NOT NULL DEFAULT 'IN_PROGRESS',

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Score" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "east" INTEGER NOT NULL,
    "south" INTEGER NOT NULL,
    "west" INTEGER NOT NULL,
    "north" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roundId" TEXT,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Yakitori" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "east" BOOLEAN NOT NULL DEFAULT false,
    "south" BOOLEAN NOT NULL DEFAULT false,
    "west" BOOLEAN NOT NULL DEFAULT false,
    "north" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Yakitori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameHistory" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameHistoryPlayer" (
    "id" TEXT NOT NULL,
    "gameHistoryId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameHistoryPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FriendRequest" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Friend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Round" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gameId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "chipPoints" INTEGER,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Player_gameId_idx" ON "public"."Player"("gameId");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "public"."Player"("userId");

-- CreateIndex
CREATE INDEX "Score_gameId_idx" ON "public"."Score"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Yakitori_scoreId_key" ON "public"."Yakitori"("scoreId");

-- CreateIndex
CREATE UNIQUE INDEX "GameHistory_gameId_key" ON "public"."GameHistory"("gameId");

-- CreateIndex
CREATE INDEX "GameHistory_gameId_idx" ON "public"."GameHistory"("gameId");

-- CreateIndex
CREATE INDEX "GameHistoryPlayer_gameHistoryId_idx" ON "public"."GameHistoryPlayer"("gameHistoryId");

-- CreateIndex
CREATE INDEX "GameHistoryPlayer_playerId_idx" ON "public"."GameHistoryPlayer"("playerId");

-- CreateIndex
CREATE INDEX "FriendRequest_fromId_idx" ON "public"."FriendRequest"("fromId");

-- CreateIndex
CREATE INDEX "FriendRequest_toId_idx" ON "public"."FriendRequest"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_fromId_toId_key" ON "public"."FriendRequest"("fromId", "toId");

-- CreateIndex
CREATE INDEX "Friend_userId_idx" ON "public"."Friend"("userId");

-- CreateIndex
CREATE INDEX "Friend_friendId_idx" ON "public"."Friend"("friendId");

-- CreateIndex
CREATE UNIQUE INDEX "Friend_userId_friendId_key" ON "public"."Friend"("userId", "friendId");

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Score" ADD CONSTRAINT "Score_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Score" ADD CONSTRAINT "Score_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Yakitori" ADD CONSTRAINT "Yakitori_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "public"."Score"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameHistory" ADD CONSTRAINT "GameHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameHistoryPlayer" ADD CONSTRAINT "GameHistoryPlayer_gameHistoryId_fkey" FOREIGN KEY ("gameHistoryId") REFERENCES "public"."GameHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameHistoryPlayer" ADD CONSTRAINT "GameHistoryPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendRequest" ADD CONSTRAINT "FriendRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendRequest" ADD CONSTRAINT "FriendRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friend" ADD CONSTRAINT "Friend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friend" ADD CONSTRAINT "Friend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Round" ADD CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
