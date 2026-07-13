import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { initiateCall } from "@/services/telephony/telephony.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, campaignId } = body;

    if (!customerId || !campaignId) {
      return NextResponse.json({ error: "Missing customerId or campaignId" }, { status: 400 });
    }

    // 1. Fetch Customer and verify DNC status
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
    });
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
    });

    if (!customer || !campaign) {
      return NextResponse.json({ error: "Customer or Campaign not found or access denied" }, { status: 404 });
    }

    if (customer.doNotCall) {
      return NextResponse.json(
        { error: "dnc_suppressed", message: "Call aborted - number is in the DNC list." },
        { status: 400 }
      );
    }

    // Format phone number
    let toPhone = customer.phone;
    if (!toPhone.startsWith("+")) {
      toPhone = `+91${toPhone}`;
    }

    // Generate stable call attempt idempotency key
    const idempotencyKey = `attempt-${campaignId}-${customerId}`;

    // 2. Upsert CallLog record idempotently using the stable key as the primary ID
    const callLog = await prisma.callLog.upsert({
      where: { id: idempotencyKey },
      create: {
        id: idempotencyKey,
        organizationId: orgId,
        customerId,
        campaignId,
        duration: 0,
        transcriptJSON: JSON.stringify([]),
        leadStatus: "PENDING",
        sentimentScore: 50.0,
      },
      update: {},
    });

    // 3. Initiate Call via Unified Telephony Service
    const dialResult = await initiateCall({
      orgId,
      customerId,
      campaignId,
      to: toPhone,
      idempotencyKey: idempotencyKey,
    });

    if (!dialResult.success) {
      logger.error({ err: dialResult.error, customerId }, "Outbound call placement failed");
      return NextResponse.json(
        { error: "telephony_call_failed", message: `Outbound call failed: ${dialResult.error}` },
        { status: 400 }
      );
    }

    // 4. Update CallLog with provider mapping details
    await prisma.callLog.update({
      where: { id: idempotencyKey },
      data: {
        telephonyProvider: dialResult.providerCallId?.startsWith("sim-") ? "simulator" : undefined, // resolves dynamically on webhook
        providerCallId: dialResult.providerCallId,
        callSid: dialResult.providerCallId, // keep for Twilio backward compatibility
      },
    });

    // 5. Update Customer status to IN_PROGRESS
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        status: "IN_PROGRESS",
      },
    });

    logger.info({ callLogId: idempotencyKey, providerCallId: dialResult.providerCallId }, "Initiated live phone call successfully");

    return NextResponse.json({
      success: true,
      sid: dialResult.providerCallId,
      callLogId: idempotencyKey,
      message: "Outbound phone call initiated successfully.",
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Outbound call API error");
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}
