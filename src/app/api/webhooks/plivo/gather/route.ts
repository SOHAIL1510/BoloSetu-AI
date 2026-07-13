import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { processConversationTurn } from "@/services/ai/conversation.service";
import { isCallClosingRemark } from "@/services/voice/language.service";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callLogId = searchParams.get("callLogId");

    if (!callLogId) {
      return new NextResponse(
        `<Response><Speak>Session expired. Goodbye.</Speak><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: { customer: true, campaign: true },
    });

    if (!callLog) {
      return new NextResponse(
        `<Response><Speak>Session not found. Goodbye.</Speak><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const campaign = callLog.campaign;
    const orgId = callLog.organizationId;

    // Parse Plivo input parameters
    const formData = await req.formData();
    const speechResult = formData.get("SpeechResult")?.toString() || "";

    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId }
    });
    const publicUrl = settings?.publicWebhookUrl || "";
    const speechLang = campaign.language || "en-IN";

    // Handle silence / empty inputs
    if (!speechResult.trim()) {
      const promptAgainText = speechLang.startsWith("hi")
        ? "माफ़ कीजियेगा, मैंने कुछ सुना नहीं। क्या आप दोहरा सकते हैं?"
        : "I'm sorry, I didn't catch that. Could you please repeat?";
      
      const retryXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <GetInput inputType="speech" action="${publicUrl}/api/webhooks/plivo/gather?callLogId=${callLogId}" method="POST" speechTimeout="auto" language="${speechLang}">
    <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(promptAgainText)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  </GetInput>
  <Speak language="${speechLang === "hi-IN" ? "hi-IN" : "en-IN"}">Goodbye.</Speak>
  <Hangup/>
</Response>`;

      return new NextResponse(retryXml, { headers: { "Content-Type": "text/xml" } });
    }

    // Call Conversation Service to process turn
    const aiResponse = await processConversationTurn(
      orgId,
      callLogId,
      speechResult,
      speechLang,
      false // isFirstTurn
    );

    // Check if call should conclude
    if (isCallClosingRemark(aiResponse) || callLog.leadStatus === "DO_NOT_CALL") {
      const endXml = `<?xml version="1.5" encoding="UTF-8"?>
<Response>
  <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(aiResponse)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  <Hangup/>
</Response>`;
      return new NextResponse(endXml, { headers: { "Content-Type": "text/xml" } });
    }

    // Continue gather dialogue loop
    const loopXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <GetInput inputType="speech" action="${publicUrl}/api/webhooks/plivo/gather?callLogId=${callLogId}" method="POST" speechTimeout="auto" language="${speechLang}">
    <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(aiResponse)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  </GetInput>
  <Speak language="${speechLang === "hi-IN" ? "hi-IN" : "en-IN"}">Closing call. Goodbye.</Speak>
  <Hangup/>
</Response>`;

    return new NextResponse(loopXml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Plivo Gather webhook crash");
    return new NextResponse(
      `<Response><Speak>Error processing voice input. Goodbye.</Speak><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
