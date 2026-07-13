import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");
    const callLogId = searchParams.get("callLogId");

    if (callLogId) {
      const callLog = await prisma.callLog.findFirst({
        where: { id: callLogId, organizationId: orgId },
        include: {
          customer: true,
          campaign: {
            select: { name: true },
          },
        },
      });
      return NextResponse.json(callLog);
    }

    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId: orgId,
        AND: [
          campaignId ? { campaignId } : {},
          status ? { leadStatus: status } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        campaign: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(callLogs);
  } catch (error: any) {
    logger.error({ err: error.message }, "GET call logs error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      callSid,
      customerId,
      campaignId,
      duration,
      transcriptJSON,
      summary,
      leadStatus,
      sentimentScore,
      recordingUrl,
    } = body;

    if (!customerId || !campaignId) {
      return NextResponse.json(
        { error: "Customer ID and Campaign ID are required." },
        { status: 400 }
      );
    }

    // Verify campaign ownership before writing log
    const campaignExists = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId }
    });
    if (!campaignExists) {
      return NextResponse.json({ error: "Campaign access denied" }, { status: 403 });
    }

    let callLog;
    let operation = "CREATE";

    // 1. Try to find and update existing log by ID
    if (id) {
      const existing = await prisma.callLog.findFirst({
        where: { id, organizationId: orgId }
      });
      if (existing) {
        callLog = await prisma.callLog.update({
          where: { id },
          data: {
            duration: duration !== undefined ? Number(duration) : undefined,
            transcriptJSON: transcriptJSON ? (typeof transcriptJSON === "string" ? transcriptJSON : JSON.stringify(transcriptJSON)) : undefined,
            summary: summary || undefined,
            leadStatus: leadStatus || undefined,
            sentimentScore: sentimentScore !== undefined ? Number(sentimentScore) : undefined,
            recordingUrl: recordingUrl || undefined,
          },
          include: { customer: true }
        });
        operation = "UPDATE_BY_ID";
      }
    }

    // 2. Try to find and update existing log by Call SID
    if (!callLog && callSid) {
      const existing = await prisma.callLog.findFirst({
        where: { callSid, organizationId: orgId }
      });
      if (existing) {
        callLog = await prisma.callLog.update({
          where: { callSid },
          data: {
            duration: duration !== undefined ? Number(duration) : undefined,
            transcriptJSON: transcriptJSON ? (typeof transcriptJSON === "string" ? transcriptJSON : JSON.stringify(transcriptJSON)) : undefined,
            summary: summary || undefined,
            leadStatus: leadStatus || undefined,
            sentimentScore: sentimentScore !== undefined ? Number(sentimentScore) : undefined,
            recordingUrl: recordingUrl || undefined,
          },
          include: { customer: true }
        });
        operation = "UPDATE_BY_SID";
      }
    }

    // 3. Fallback to Create new CallLog
    if (!callLog) {
      const generatedSid = callSid || `sim-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      callLog = await prisma.callLog.create({
        data: {
          callSid: generatedSid,
          organizationId: orgId,
          customerId,
          campaignId,
          duration: duration !== undefined ? Number(duration) : 0,
          transcriptJSON: typeof transcriptJSON === "string" ? transcriptJSON : JSON.stringify(transcriptJSON || []),
          summary: summary || "",
          leadStatus: leadStatus || "PENDING",
          sentimentScore: sentimentScore !== undefined ? Number(sentimentScore) : 50.0,
          recordingUrl: recordingUrl || "",
        },
        include: {
          customer: true,
        },
      });
      operation = "CREATE";
    }

    // Update customer status to COMPLETED
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        status: "COMPLETED",
      },
    });

    // Create notifications for specific lead statuses scoped under tenant organization
    if (leadStatus === "VERY_INTERESTED" || leadStatus === "INTERESTED") {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          title: "High Value Lead Detected",
          message: `${callLog.customer.name} was qualified as "${leadStatus}" with a sentiment of ${sentimentScore}%`,
          type: "SUCCESS",
          callLogId: callLog.id,
        },
      });
    }

    // Safe debug logging for audit trail tracking
    logger.info(
      { 
        callLogId: callLog.id, 
        callSid: callLog.callSid, 
        operation, 
        eventType: leadStatus || "COMPLETED" 
      }, 
      `Call log database audit: [${operation}] for Call ID [${callLog.id}]`
    );

    return NextResponse.json(callLog, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error.message }, "POST call log error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
