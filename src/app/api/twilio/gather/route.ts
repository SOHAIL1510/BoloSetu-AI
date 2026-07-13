import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

function isClosingRemarks(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("goodbye") ||
    t.includes("thank you for your time") ||
    t.includes("have a great day") ||
    t.includes("have a wonderful day") ||
    t.includes("dhanyawad") ||
    t.includes("shukriya") ||
    t.includes("alvida") ||
    t.includes("bye bye")
  );
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callLogId = searchParams.get("callLogId");

    if (!callLogId) {
      return new NextResponse(
        `<Response><Say>Session error. Goodbye.</Say><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // 1. Fetch Call Log, Campaign, and Customer
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: { customer: true, campaign: true },
    });

    if (!callLog) {
      return new NextResponse(
        `<Response><Say>Session not found. Goodbye.</Say><Hangup/></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const campaign = callLog.campaign;
    const customer = callLog.customer;
    const orgId = callLog.organizationId;

    // 2. Parse Twilio Speech Result
    const formData = await req.formData();
    const speechResult = formData.get("SpeechResult")?.toString() || "";

    // 3. Get organization settings for host webhook url
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId }
    });
    const publicUrl = settings?.publicWebhookUrl || "";

    const speechLang = campaign.language || "en-IN";

    // Handle empty speech / silence
    if (!speechResult.trim()) {
      const promptAgainText = speechLang.startsWith("hi")
        ? "माफ़ कीजियेगा, मैंने कुछ सुना नहीं। क्या आप दोहरा सकते हैं?"
        : "I'm sorry, I didn't catch that. Could you please repeat?";
      
      const retryTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/twilio/gather?callLogId=${callLogId}" method="POST" speechTimeout="auto" language="${speechLang}">
    <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(promptAgainText)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  </Gather>
  <Say language="${speechLang === "hi-IN" ? "hi-IN" : "en-IN"}">Goodbye.</Say>
  <Hangup/>
</Response>`;

      return new NextResponse(retryTwiml, { headers: { "Content-Type": "text/xml" } });
    }

    // 4. Update History with Customer message
    const history = JSON.parse(callLog.transcriptJSON || "[]");
    history.push({
      role: "customer",
      text: speechResult,
      timestamp: new Date().toISOString(),
    });

    // 5. Query LLM to generate the next response
    const simulateUrl = `${publicUrl || req.nextUrl.origin}/api/simulate-call`;
    const simRes = await fetch(simulateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.id,
        campaignId: campaign.id,
        messages: history,
        isFirstTurn: false,
      }),
    });

    let aiResponse = "I understand. Thank you.";
    if (simRes.ok) {
      const simData = await simRes.json();
      aiResponse = simData.response;
    }

    // 6. Update History with AI response and Save to DB
    history.push({
      role: "ai",
      text: aiResponse,
      timestamp: new Date().toISOString(),
    });

    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        transcriptJSON: JSON.stringify(history),
      },
    });

    // 7. Check if call should hang up (closing remarks)
    if (isClosingRemarks(aiResponse)) {
      const endTwiml = `<?xml version="1.5" encoding="UTF-8"?>
<Response>
  <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(aiResponse)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  <Hangup/>
</Response>`;
      return new NextResponse(endTwiml, { headers: { "Content-Type": "text/xml" } });
    }

    // 8. Otherwise, continue gather loop
    const loopTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/twilio/gather?callLogId=${callLogId}" method="POST" speechTimeout="auto" language="${speechLang}">
    <Play>${publicUrl}/api/twilio/audio?text=${encodeURIComponent(aiResponse)}&amp;language=${campaign.language}&amp;voice=${campaign.voiceId}&amp;organizationId=${orgId}</Play>
  </Gather>
  <Say language="${speechLang === "hi-IN" ? "hi-IN" : "en-IN"}">Closing call. Goodbye.</Say>
  <Hangup/>
</Response>`;

    return new NextResponse(loopTwiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Gather API error");
    return new NextResponse(
      `<Response><Say>Error processing response. Goodbye.</Say><Hangup/></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}
