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

    const items = await prisma.knowledgeBase.findMany({
      where: {
        organizationId: orgId,
        ...(campaignId ? { campaignId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(items);
  } catch (error: any) {
    logger.error({ err: error.message }, "GET knowledge-base error");
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
    const { name, fileType, contentText, campaignId } = body;

    if (!name || !fileType || !contentText) {
      return NextResponse.json(
        { error: "Name, fileType, and contentText are required." },
        { status: 400 }
      );
    }

    // Verify campaign if linked
    if (campaignId) {
      const campaignExists = await prisma.campaign.findFirst({
        where: { id: campaignId, organizationId: orgId }
      });
      if (!campaignExists) {
        return NextResponse.json({ error: "Campaign access denied" }, { status: 403 });
      }
    }

    const kbItem = await prisma.knowledgeBase.create({
      data: {
        organizationId: orgId,
        name,
        fileType,
        contentText,
        campaignId: campaignId || null,
      },
    });

    logger.info({ kbId: kbItem.id, organizationId: orgId }, "Uploaded knowledge base document");
    return NextResponse.json(kbItem, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error.message }, "POST knowledge-base error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    // Verify that the document belongs to the organization
    const document = await prisma.knowledgeBase.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found or access denied." }, { status: 404 });
    }

    await prisma.knowledgeBase.delete({
      where: { id },
    });

    logger.info({ docId: id, organizationId: orgId }, "Deleted knowledge base document");
    return NextResponse.json({ success: true, message: "Document deleted successfully." });
  } catch (error: any) {
    logger.error({ err: error.message }, "DELETE knowledge-base error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
