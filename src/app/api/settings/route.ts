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

    // Mask secrets so they are never exposed to client browsers or localStorage
    const maskedSettings = {
      id: settings.id,
      organizationId: settings.organizationId,
      sarvamApiKey: settings.sarvamApiKey ? `••••••••${settings.sarvamApiKey.slice(-4)}` : "",
      geminiApiKey: settings.geminiApiKey ? `••••••••${settings.geminiApiKey.slice(-4)}` : "",
      openaiApiKey: settings.openaiApiKey ? `••••••••${settings.openaiApiKey.slice(-4)}` : "",
      twilioAccountSid: settings.twilioAccountSid ? `••••••••${settings.twilioAccountSid.slice(-4)}` : "",
      twilioAuthToken: settings.twilioAuthToken ? "••••••••" : "",
      twilioPhoneNumber: settings.twilioPhoneNumber || "",
      publicWebhookUrl: settings.publicWebhookUrl || "",
      defaultVoiceId: settings.defaultVoiceId || "meera",
      defaultLanguage: settings.defaultLanguage || "en-IN",
      plivoAuthId: settings.plivoAuthId ? `••••••••${settings.plivoAuthId.slice(-4)}` : "",
      plivoAuthToken: settings.plivoAuthToken ? "••••••••" : "",
      plivoPhoneNumber: settings.plivoPhoneNumber || "",
      geminiModel: settings.geminiModel || "gemini-3.1-flash-lite",
      isSarvamConfigured: !!settings.sarvamApiKey,
      isGeminiConfigured: !!settings.geminiApiKey,
      isTwilioConfigured: !!(settings.twilioAccountSid && settings.twilioAuthToken && settings.twilioPhoneNumber),
      isPlivoConfigured: !!(settings.plivoAuthId && settings.plivoAuthToken && settings.plivoPhoneNumber),
    };

    return NextResponse.json(maskedSettings);
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
      plivoAuthId,
      plivoAuthToken,
      plivoPhoneNumber,
      geminiModel,
    } = body;

    // Load existing settings to verify if masked secrets are untouched
    const existing = await getOrganizationSettings(orgId);

    const updateData = {
      sarvamApiKey: sarvamApiKey && sarvamApiKey.startsWith("••••") ? existing.sarvamApiKey : (sarvamApiKey || ""),
      geminiApiKey: geminiApiKey && geminiApiKey.startsWith("••••") ? existing.geminiApiKey : (geminiApiKey || ""),
      openaiApiKey: openaiApiKey && openaiApiKey.startsWith("••••") ? existing.openaiApiKey : (openaiApiKey || ""),
      twilioAccountSid: twilioAccountSid && twilioAccountSid.startsWith("••••") ? existing.twilioAccountSid : (twilioAccountSid || ""),
      twilioAuthToken: twilioAuthToken && twilioAuthToken.startsWith("••••") ? existing.twilioAuthToken : (twilioAuthToken || ""),
      twilioPhoneNumber: twilioPhoneNumber || "",
      publicWebhookUrl: publicWebhookUrl || "",
      defaultVoiceId: defaultVoiceId || "meera",
      defaultLanguage: defaultLanguage || "en-IN",
      plivoAuthId: plivoAuthId && plivoAuthId.startsWith("••••") ? existing.plivoAuthId : (plivoAuthId || ""),
      plivoAuthToken: plivoAuthToken && plivoAuthToken.startsWith("••••") ? existing.plivoAuthToken : (plivoAuthToken || ""),
      plivoPhoneNumber: plivoPhoneNumber || "",
      geminiModel: geminiModel || "gemini-3.1-flash-lite",
    };

    const settings = await prisma.organizationSetting.upsert({
      where: { organizationId: orgId },
      update: updateData,
      create: {
        organizationId: orgId,
        ...updateData,
      },
    });

    logger.info({ organizationId: orgId }, "Updated organization settings credentials");
    
    // Return masked settings to frontend
    return NextResponse.json({
      ...settings,
      sarvamApiKey: settings.sarvamApiKey ? "••••••••" : "",
      geminiApiKey: settings.geminiApiKey ? "••••••••" : "",
      openaiApiKey: settings.openaiApiKey ? "••••••••" : "",
      twilioAccountSid: settings.twilioAccountSid ? "••••••••" : "",
      twilioAuthToken: settings.twilioAuthToken ? "••••••••" : "",
      plivoAuthId: settings.plivoAuthId ? "••••••••" : "",
      plivoAuthToken: settings.plivoAuthToken ? "••••••••" : "",
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "POST settings error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
