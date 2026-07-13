import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { processConversationTurn } from "@/services/ai/conversation.service";
import plivo from "plivo";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const campaignId = searchParams.get("campaignId");
    const callLogId = searchParams.get("callLogId");

    if (!customerId || !campaignId || !callLogId) {
      return new NextResponse(
        `<Response><Speak>Error. Session parameters missing.</Speak><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    });

    if (!callLog) {
      return new NextResponse(
        `<Response><Speak>Error. Call session log not found.</Speak><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const orgId = callLog.organizationId;
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    if (!campaign || !customer) {
      return new NextResponse(
        `<Response><Speak>Error. Configuration mismatch.</Speak><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Retrieve Organization Settings
    const settings = await prisma.organizationSetting.findUnique({ where: { organizationId: orgId } });
    const publicUrl = settings?.publicWebhookUrl || "";

    // Signature Validation where possible
    const plivoSignature = req.headers.get("x-plivo-signature-v2");
    const plivoNonce = req.headers.get("x-plivo-signature-v2-nonce");
    if (plivoSignature && plivoNonce && settings?.plivoAuthToken) {
      const { PlivoProvider } = require("@/services/telephony/providers/plivo.provider");
      const plivoProvider = new PlivoProvider();
      const isValid = plivoProvider.validateSignature(
        req.url,
        plivoNonce,
        plivoSignature,
        settings.plivoAuthToken
      );
      if (!isValid) {
        logger.warn({ callLogId }, "Unauthorized Plivo webhook signature. Rejecting call.");
        return new NextResponse(
          `<Response><Speak>Security authorization check failed.</Speak><Hangup/></Response>`,
          { headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    // Generate AI Greeting Text (First Turn)
    const greeting = await processConversationTurn(
      orgId,
      callLogId,
      "",
      campaign.language,
      true // isFirstTurn
    );

    const speechLang = campaign.language || "en-IN";

    // Generate Plivo XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <GetInput inputType="speech" action="${publicUrl}/api/webhooks/plivo/gather?callLogId=${callLogId}" method="POST" speechTimeout="auto" language="${speechLang}">
    <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(greeting)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  </GetInput>
  <Speak language="${speechLang === "hi-IN" ? "hi-IN" : "en-IN"}">I didn't hear anything. Goodbye.</Speak>
  <Hangup/>
</Response>`;

    return new NextResponse(xml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Plivo Answer webhook crash");
    return new NextResponse(
      `<Response><Speak>Internal connection error occurred. Goodbye.</Speak><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
