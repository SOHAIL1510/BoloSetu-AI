-- AlterTable
ALTER TABLE "CallLog" ADD COLUMN     "analysisStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "providerCallId" TEXT,
ADD COLUMN     "telephonyProvider" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "doNotCall" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrganizationSetting" ADD COLUMN     "geminiModel" TEXT DEFAULT 'gemini-3.1-flash-lite',
ADD COLUMN     "plivoAuthId" TEXT,
ADD COLUMN     "plivoAuthToken" TEXT,
ADD COLUMN     "plivoPhoneNumber" TEXT;

-- CreateTable
CREATE TABLE "ConversationTurn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callLogId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationTurn_organizationId_callLogId_idx" ON "ConversationTurn"("organizationId", "callLogId");

-- AddForeignKey
ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTurn" ADD CONSTRAINT "ConversationTurn_callLogId_fkey" FOREIGN KEY ("callLogId") REFERENCES "CallLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
