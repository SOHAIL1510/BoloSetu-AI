import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { analyzeCall } from "@/services/ai/call-analysis.service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callLogId = searchParams.get("callLogId");

    if (!callLogId) {
      return NextResponse.json({ error: "Missing callLogId" }, { status: 400 });
    }

    const formData = await req.formData();
    const durationStr = formData.get("Duration") || formData.get("BillDuration") || "0";
    const duration = parseInt(durationStr.toString(), 10) || 0;
    const plivoStatus = formData.get("Status")?.toString() || "completed";

    // 1. Fetch current call log
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    });

    if (!callLog) {
      return NextResponse.json({ error: "Call log session not found" }, { status: 404 });
    }

    // 2. Map Plivo call status to internal statuses
    let finalStatus = "COMPLETED";
    if (plivoStatus === "failed") finalStatus = "FAILED";
    else if (plivoStatus === "busy") finalStatus = "BUSY";
    else if (plivoStatus === "no-answer") finalStatus = "NO_ANSWER";

    // 3. Update call status & duration
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        duration,
        telephonyProvider: "plivo",
      },
    });

    // 4. Update customer status
    await prisma.customer.update({
      where: { id: callLog.customerId },
      data: { status: "COMPLETED" },
    });

    // 5. Run post-call analysis asynchronously in the background
    // Enforces single-active analysis job check internally
    analyzeCall(callLog.organizationId, callLogId).catch((err) => {
      logger.error({ err: err.message, callLogId }, "Plivo background call analysis failed");
    });

    logger.info({ callLogId, duration, plivoStatus }, "Plivo status callback processed successfully");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error.message }, "Plivo Status webhook crash");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
