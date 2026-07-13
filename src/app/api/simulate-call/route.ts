import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { processConversationTurn } from "@/services/ai/conversation.service";
import { analyzeCall } from "@/services/ai/call-analysis.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, campaignId, messages, isFirstTurn, isHangUp, callLogId: reqCallLogId } = body;

    if (!customerId || !campaignId) {
      return NextResponse.json({ error: "Missing customerId or campaignId" }, { status: 400 });
    }

    // 1. Fetch Campaign and Customer
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!campaign || !customer) {
      return NextResponse.json({ error: "Campaign or Customer not found" }, { status: 404 });
    }

    const orgId = campaign.organizationId;

    // 2. Multi-tenant Authorization Scoping Check
    const session: any = await getServerSession(authOptions);
    if (session?.user && orgId !== session.user.organizationId) {
      logger.warn(
        { userId: session.user.id, campaignOrgId: orgId, userOrgId: session.user.organizationId },
        "Cross-tenant access attempted on simulate-call"
      );
      return NextResponse.json({ error: "Forbidden: Tenant mismatch" }, { status: 403 });
    }

    // Generate stable call log identifier if none provided
    const callLogId = reqCallLogId || `sim-fallback-${Date.now()}-${customerId}`;

    // 3. Upsert CallLog record on initial turn
    if (isFirstTurn || isHangUp) {
      await prisma.callLog.upsert({
        where: { id: callLogId },
        create: {
          id: callLogId,
          organizationId: orgId,
          customerId,
          campaignId,
          duration: 0,
          transcriptJSON: JSON.stringify([]),
          leadStatus: "PENDING",
          sentimentScore: 50.0,
          telephonyProvider: "simulator",
          providerCallId: callLogId,
        },
        update: {},
      });
    }

    // 4. Handle call hang-up audits
    if (isHangUp) {
      const auditResult = await analyzeCall(orgId, callLogId);
      
      // Fetch updated log to return results
      const updatedLog = await prisma.callLog.findUnique({
        where: { id: callLogId },
      });

      return NextResponse.json({
        summary: updatedLog?.summary || "Call hung up.",
        leadStatus: updatedLog?.leadStatus || "NOT_INTERESTED",
        sentimentScore: updatedLog?.sentimentScore || 50.0,
        appointmentBooked: leadStatusToAppointmentBooked(updatedLog?.leadStatus),
        appointmentDateTime: null,
      });
    }

    // 5. Generate conversational dialogue response
    const lastMessageText = messages && messages.length > 0 ? messages[messages.length - 1].text : "";
    const response = await processConversationTurn(
      orgId,
      callLogId,
      lastMessageText,
      campaign.language,
      isFirstTurn
    );

    return NextResponse.json({ response });
  } catch (error: any) {
    logger.error({ err: error.message }, "Simulate call server crash");
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}

function leadStatusToAppointmentBooked(status: string | undefined | null): boolean {
  return status === "APPOINTMENT_BOOKED" || status === "COUNSELLING_REQUESTED" || status === "DEMO_REQUESTED";
}
