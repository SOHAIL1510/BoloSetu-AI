import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const campaignId = searchParams.get("campaignId");
    const callLogId = searchParams.get("callLogId");

    if (!customerId || !campaignId || !callLogId) {
      return new NextResponse(
        `<Response><Say>Error. Missing session parameters.</Say><Reject/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    });

    if (!callLog) {
      return new NextResponse(
        `<Response><Say>Error. Call session log not found.</Say><Reject/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const orgId = callLog.organizationId;
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    if (!campaign || !customer) {
      return new NextResponse(
        `<Response><Say>Error. Customer or campaign not found.</Say><Reject/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // 1. Retrieve Organization Settings
    const settings = await prisma.organizationSetting.findUnique({ where: { organizationId: orgId } });
    const publicUrl = settings?.publicWebhookUrl || "";

    // 2. Fetch Initial AI Greeting Text (First Turn)
    const simulateUrl = `${publicUrl || req.nextUrl.origin}/api/simulate-call`;
    const simRes = await fetch(simulateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        campaignId,
        messages: [],
        isFirstTurn: true,
      }),
    });

    let greeting = "Hello, I am an AI voice assistant.";
    if (simRes.ok) {
      const simData = await simRes.json();
      greeting = simData.response;
    }

    // 3. Save Greeting to Database CallLog Transcript
    const initialHistory = [{ role: "ai", text: greeting, timestamp: new Date().toISOString() }];
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        transcriptJSON: JSON.stringify(initialHistory),
      },
    });

    const speechLang = campaign.language || "en-IN";

    // 4. Generate TwiML XML (Append organizationId context to speech paths)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/twilio/gather?callLogId=${callLogId}" method="POST" speechTimeout="auto" language="${speechLang}">
    <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(greeting)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  </Gather>
  <Say language="${speechLang === "hi-IN" ? "hi-IN" : "en-IN"}">I didn't hear anything. Closing call. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Twiml API error");
    return new NextResponse(
      `<Response><Say>Error occurred. Goodbye.</Say><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
