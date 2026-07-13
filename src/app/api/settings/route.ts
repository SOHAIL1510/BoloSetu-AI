import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

// Helper to get settings or initialize defaults for an organization
export async function getOrganizationSettings(orgId: string) {
  let settings = await prisma.organizationSetting.findUnique({
    where: { organizationId: orgId },
  });

  if (!settings) {
    settings = await prisma.organizationSetting.create({
      data: {
        organizationId: orgId,
        sarvamApiKey: "",
        geminiApiKey: "",
        openaiApiKey: "",
        twilioAccountSid: "",
        twilioAuthToken: "",
        twilioPhoneNumber: "",
        publicWebhookUrl: "",
        defaultVoiceId: "meera",
        defaultLanguage: "en-IN",
      },
    });
  }

  return settings;
}

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getOrganizationSettings(session.user.organizationId);
    return NextResponse.json(settings);
  } catch (error: any) {
    logger.error({ err: error.message }, "GET settings error");
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
      sarvamApiKey,
      geminiApiKey,
      openaiApiKey,
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber,
      publicWebhookUrl,
      defaultVoiceId,
      defaultLanguage,
    } = body;

    const settings = await prisma.organizationSetting.upsert({
      where: { organizationId: orgId },
      update: {
        sarvamApiKey: sarvamApiKey ?? "",
        geminiApiKey: geminiApiKey ?? "",
        openaiApiKey: openaiApiKey ?? "",
        twilioAccountSid: twilioAccountSid ?? "",
        twilioAuthToken: twilioAuthToken ?? "",
        twilioPhoneNumber: twilioPhoneNumber ?? "",
        publicWebhookUrl: publicWebhookUrl ?? "",
        defaultVoiceId: defaultVoiceId ?? "meera",
        defaultLanguage: defaultLanguage ?? "en-IN",
      },
      create: {
        organizationId: orgId,
        sarvamApiKey: sarvamApiKey ?? "",
        geminiApiKey: geminiApiKey ?? "",
        openaiApiKey: openaiApiKey ?? "",
        twilioAccountSid: twilioAccountSid ?? "",
        twilioAuthToken: twilioAuthToken ?? "",
        twilioPhoneNumber: twilioPhoneNumber ?? "",
        publicWebhookUrl: publicWebhookUrl ?? "",
        defaultVoiceId: defaultVoiceId ?? "meera",
        defaultLanguage: defaultLanguage ?? "en-IN",
      },
    });

    logger.info({ organizationId: orgId }, "Updated organization settings credentials");
    return NextResponse.json(settings);
  } catch (error: any) {
    logger.error({ err: error.message }, "POST settings error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
