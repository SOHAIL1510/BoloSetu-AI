import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text, languageCode, speaker } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Retrieve active settings for API keys from the tenant organization settings
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });

    const apiKey = settings?.sarvamApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "api_key_missing", message: "Sarvam API Key is not configured in Settings." },
        { status: 400 }
      );
    }

    // Call Sarvam AI Text-to-Speech API
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: languageCode || "hi-IN",
        speaker: speaker || "meera",
        pitch: 0.5,
        pace: 1.0,
        loudness: 1.5,
        speech_modulation: 1.5,
        model: "bulbul:v1",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ err: errText, organizationId: orgId }, "Sarvam API error response");
      return NextResponse.json(
        { error: "sarvam_api_error", message: `Sarvam API error: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error({ err: error.message }, "Sarvam API proxy crash");
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}
