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

    // 1. Fetch CallLog details
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: { customer: true },
    });

    if (!callLog) {
      return NextResponse.json({ error: "CallLog session not found" }, { status: 404 });
    }

    const orgId = callLog.organizationId;

    // 2. Read Twilio CallDuration and status payload
    const formData = await req.formData();
    const callDurationStr = formData.get("CallDuration")?.toString() || "0";
    const duration = Number(callDurationStr);
    const twilioStatus = formData.get("CallStatus")?.toString() || "completed";

    // 3. Update CallLog with duration and telephony provider
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        duration,
        telephonyProvider: "twilio",
      },
    });

    // 4. Update Customer status to COMPLETED
    await prisma.customer.update({
      where: { id: callLog.customerId },
      data: {
        status: "COMPLETED",
      },
    });

    // 5. Trigger central post-call analysis asynchronously
    // Checks for duplicate jobs internally
    analyzeCall(orgId, callLogId).catch((err) => {
      logger.error({ err: err.message, callLogId }, "Twilio background call analysis failed");
    });

    // Create high-level log entry
    logger.info({ callLogId, duration, twilioStatus }, "Twilio status callback processed successfully");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error.message }, "Twilio status callback error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
