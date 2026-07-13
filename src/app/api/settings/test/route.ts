import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { testGeminiConnection } from "@/services/ai/gemini.service";
import { testTelephonyConnection } from "@/services/telephony/telephony.service";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { target, keys } = body; // target: 'gemini' | 'sarvam' | 'twilio' | 'plivo'

    // Fetch existing settings to merge with any newly typed credentials
    const existing = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });

    const mergeKey = (val: string | undefined, dbVal: string | null | undefined) => {
      if (!val) return dbVal || "";
      if (val.startsWith("••••")) return dbVal || "";
      return val;
    };

    if (target === "gemini") {
      const tempSettings = {
        geminiApiKey: mergeKey(keys?.geminiApiKey, existing?.geminiApiKey),
        geminiModel: keys?.geminiModel || existing?.geminiModel || "gemini-3.1-flash-lite",
      };

      const result = await testGeminiConnection(tempSettings);
      return NextResponse.json({
        success: result.connected,
        message: result.safeMessage,
        code: result.errorCode,
      });
    }

    if (target === "sarvam") {
      const sarvamKey = mergeKey(keys?.sarvamApiKey, existing?.sarvamApiKey);
      if (!sarvamKey) {
        return NextResponse.json({ success: false, message: "Sarvam API Key is not configured." });
      }

      try {
        const res = await fetch("https://api.sarvam.ai/text-to-speech", {
          method: "POST",
          headers: {
            "api-subscription-key": sarvamKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: ["ping"],
            target_language_code: "hi-IN",
            speaker: "meera",
            model: "bulbul:v1",
          }),
        });

        if (res.ok) {
          return NextResponse.json({ success: true, message: "Successfully connected to Sarvam API." });
        } else {
          const errText = await res.text();
          return NextResponse.json({ success: false, message: `Sarvam connection failed: ${errText}` });
        }
      } catch (err: any) {
        return NextResponse.json({ success: false, message: `Sarvam API connection failed: ${err.message}` });
      }
    }

    if (target === "twilio") {
      const tempSettings = {
        twilioAccountSid: mergeKey(keys?.twilioAccountSid, existing?.twilioAccountSid),
        twilioAuthToken: mergeKey(keys?.twilioAuthToken, existing?.twilioAuthToken),
        twilioPhoneNumber: keys?.twilioPhoneNumber || existing?.twilioPhoneNumber,
      };

      const result = await testTelephonyConnection(orgId); // can test existing
      // Let's test with temp settings instead:
      try {
        const twilio = require("twilio");
        const client = twilio(tempSettings.twilioAccountSid, tempSettings.twilioAuthToken);
        await client.api.v2010.accounts(tempSettings.twilioAccountSid).fetch();
        return NextResponse.json({ success: true, message: "Successfully connected to Twilio." });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: `Twilio auth failed: ${err.message}` });
      }
    }

    if (target === "plivo") {
      const tempSettings = {
        plivoAuthId: mergeKey(keys?.plivoAuthId, existing?.plivoAuthId),
        plivoAuthToken: mergeKey(keys?.plivoAuthToken, existing?.plivoAuthToken),
      };

      try {
        const plivo = require("plivo");
        const client = new plivo.Client(tempSettings.plivoAuthId, tempSettings.plivoAuthToken);
        await client.accounts.get();
        return NextResponse.json({ success: true, message: "Successfully connected to Plivo." });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: `Plivo connection failed: ${err.message}` });
      }
    }

    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  } catch (error: any) {
    logger.error({ err: error.message }, "Connection test endpoint error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
