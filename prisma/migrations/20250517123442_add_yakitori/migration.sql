-- CreateTable
CREATE TABLE "Yakitori" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "east" BOOLEAN NOT NULL DEFAULT false,
    "south" BOOLEAN NOT NULL DEFAULT false,
    "west" BOOLEAN NOT NULL DEFAULT false,
    "north" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Yakitori_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Yakitori_scoreId_key" ON "Yakitori"("scoreId");

-- AddForeignKey
ALTER TABLE "Yakitori" ADD CONSTRAINT "Yakitori_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "Score"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
