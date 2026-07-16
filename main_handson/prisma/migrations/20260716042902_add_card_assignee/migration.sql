-- CreateTable
CREATE TABLE "CardAssignee" (
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("cardId", "userId"),
    CONSTRAINT "CardAssignee_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CardAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CardAssignee_cardId_idx" ON "CardAssignee"("cardId");

-- CreateIndex
CREATE INDEX "CardAssignee_userId_idx" ON "CardAssignee"("userId");
