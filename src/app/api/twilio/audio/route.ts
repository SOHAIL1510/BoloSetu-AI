import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const SILENT_WAV = Buffer.from([
  0x52, 0x49, 0x46, 0x46,
  0x2c, 0x00, 0x00, 0x00,
  0x57, 0x41, 0x56, 0x45,
  0x66, 0x6d, 0x74, 0x20,
  0x10, 0x00, 0x00, 0x00,
  0x01, 0x00,
  0x01, 0x00,
  0x40, 0x1f, 0x00, 0x00,
  0x40, 0x1f, 0x00, 0x00,
  0x01, 0x00,
  0x08, 0x00,
  0x64, 0x61, 0x74, 0x61,
  0x08, 0x00, 0x00, 0x00,
  0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");
    const language = searchParams.get("language") || "hi-IN";
    const voice = searchParams.get("voice") || "meera";
    const orgId = searchParams.get("organizationId");

    if (!text || !orgId) {
      return new NextResponse(SILENT_WAV, {
        headers: { "Content-Type": "audio/wav" },
      });
    }

    // 1. Fetch Organization-specific settings
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });
    const apiKey = settings?.sarvamApiKey;

    if (!apiKey) {
      logger.warn({ organizationId: orgId }, "Sarvam API key is missing. Streaming silent WAV fallback.");
      return new NextResponse(SILENT_WAV, {
        headers: { "Content-Type": "audio/wav" },
      });
    }

    // 2. Fetch Text-to-Speech audio from Sarvam
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: language,
        speaker: voice,
        pitch: 0.5,
        pace: 1.0,
        loudness: 1.5,
        speech_modulation: 1.5,
        model: "bulbul:v1",
      }),
    });

    if (!response.ok) {
      logger.error({ status: response.status, organizationId: orgId }, "Sarvam TTS streaming error");
      return new NextResponse(SILENT_WAV, {
        headers: { "Content-Type": "audio/wav" },
      });
    }

    const data = await response.json();
    if (!data.audios || !data.audios[0]) {
      return new NextResponse(SILENT_WAV, {
        headers: { "Content-Type": "audio/wav" },
      });
    }

    const audioBuffer = Buffer.from(data.audios[0], "base64");

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Audio streaming endpoint crash");
    return new NextResponse(SILENT_WAV, {
      headers: { "Content-Type": "audio/wav" },
    });
  }
}
