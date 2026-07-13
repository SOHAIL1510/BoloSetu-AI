import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { inngest } from "@/lib/inngest";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customers: {
          orderBy: { createdAt: "desc" },
        },
        callLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            customer: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    logger.error({ err: error.message }, "GET campaign by id error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, systemPrompt, voiceId, language, status, callTiming, retryAttempts } = body;

    // Verify campaign ownership
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        description,
        systemPrompt,
        voiceId,
        language,
        status,
        callTiming,
        retryAttempts: retryAttempts !== undefined ? Number(retryAttempts) : undefined,
      },
    });

    // Trigger Inngest background campaign caller if transitioned to RUNNING
    if (status === "RUNNING" && existing.status !== "RUNNING") {
      logger.info({ campaignId: id, organizationId: orgId }, "Triggering background dialing worker via Inngest");
      await inngest.send({
        name: "campaign/start",
        data: { campaignId: id, organizationId: orgId },
      });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    logger.error({ err: error.message }, "PUT campaign error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify campaign ownership before deleting
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    await prisma.campaign.delete({
      where: { id },
    });

    logger.info({ campaignId: id, organizationId: orgId }, "Deleted campaign");
    return NextResponse.json({ message: "Campaign deleted successfully" });
  } catch (error: any) {
    logger.error({ err: error.message }, "DELETE campaign error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
