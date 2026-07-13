-- CreateIndex
CREATE UNIQUE INDEX "CallLog_telephonyProvider_providerCallId_key" ON "CallLog"("telephonyProvider", "providerCallId");
