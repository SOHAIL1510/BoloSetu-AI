import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            customers: true,
            callLogs: true,
          },
        },
      },
    });

    // Decorate campaigns with aggregated lead statuses and counts
    const decoratedCampaigns = await Promise.all(
      campaigns.map(async (camp) => {
        const interestedCount = await prisma.callLog.count({
          where: {
            campaignId: camp.id,
            organizationId: orgId,
            leadStatus: { in: ["INTERESTED", "VERY_INTERESTED", "APPOINTMENT_BOOKED"] },
          },
        });

        const completedCount = await prisma.customer.count({
          where: {
            campaignId: camp.id,
            organizationId: orgId,
            status: "COMPLETED",
          },
        });

        const pendingCount = await prisma.customer.count({
          where: {
            campaignId: camp.id,
            organizationId: orgId,
            status: "PENDING",
          },
        });

        const failedCount = await prisma.customer.count({
          where: {
            campaignId: camp.id,
            organizationId: orgId,
            status: "FAILED",
          },
        });

        return {
          ...camp,
          stats: {
            totalCustomers: camp._count.customers,
            callsCompleted: completedCount,
            callsPending: pendingCount,
            callsFailed: failedCount,
            interestedLeads: interestedCount,
          },
        };
      })
    );

    return NextResponse.json(decoratedCampaigns);
  } catch (error: any) {
    logger.error({ err: error.message }, "GET campaigns error");
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
    const { name, description, systemPrompt, voiceId, language, callTiming, retryAttempts } = body;

    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: "Name and System Prompt are required." },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: orgId,
        name,
        description,
        systemPrompt,
        voiceId: voiceId || "meera",
        language: language || "en-IN",
        callTiming: callTiming || "9:00 AM - 6:00 PM",
        retryAttempts: retryAttempts !== undefined ? Number(retryAttempts) : 3,
        status: "DRAFT",
      },
    });

    logger.info({ campaignId: campaign.id, organizationId: orgId }, "Created new multi-tenant campaign");
    return NextResponse.json(campaign, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error.message }, "POST campaign error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
