import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

function getMockAnalysis(messages: { role: string; text: string }[]) {
  const transcriptStr = messages.map((m) => `${m.role}: ${m.text}`).join(" ");
  const textLower = transcriptStr.toLowerCase();

  let leadStatus = "NOT_INTERESTED";
  let summary = "Customer completed the call but showed general interest.";
  let sentimentScore = 50;
  let appointmentBooked = false;
  let appointmentDateTime: string | null = null;

  if (textLower.includes("book") || textLower.includes("schedule") || textLower.includes("2 pm")) {
    leadStatus = "APPOINTMENT_BOOKED";
    summary = "Outbound call completed successfully. AI pitched the course, and the customer agreed to book a demo session.";
    sentimentScore = 90;
    appointmentBooked = true;
    
    const date = new Date();
    date.setDate(date.getDate() + ((1 + 7 - date.getDay()) % 7 || 7)); // Next Monday
    date.setHours(14, 0, 0, 0);
    appointmentDateTime = date.toISOString();
  } else if (textLower.includes("interested") || textLower.includes("tell me more")) {
    leadStatus = "VERY_INTERESTED";
    summary = "Customer expressed strong interest in learning more and requested brochures.";
    sentimentScore = 80;
  } else if (textLower.includes("later") || textLower.includes("busy") || textLower.includes("baad me")) {
    leadStatus = "CALLBACK_REQUESTED";
    summary = "Customer was busy and asked for a callback later.";
    sentimentScore = 60;
  } else if (textLower.includes("no") || textLower.includes("not interested")) {
    leadStatus = "NOT_INTERESTED";
    summary = "Customer was polite but explicitly stated they are not interested.";
    sentimentScore = 30;
  }

  return {
    summary,
    leadStatus,
    sentimentScore,
    appointmentBooked,
    appointmentDateTime,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callLogId = searchParams.get("callLogId");

    if (!callLogId) {
      return NextResponse.json({ error: "Missing callLogId" }, { status: 400 });
    }

    // 1. Fetch CallLog details
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: { customer: true, campaign: true },
    });

    if (!callLog) {
      return NextResponse.json({ error: "CallLog session not found" }, { status: 404 });
    }

    const orgId = callLog.organizationId;

    // Skip if call log already audited
    if (callLog.leadStatus !== "PENDING" && callLog.duration > 0) {
      return NextResponse.json({ success: true, message: "Already audited" });
    }

    // 2. Read Twilio CallDuration payload
    const formData = await req.formData();
    const callDurationStr = formData.get("CallDuration")?.toString() || "0";
    const duration = Number(callDurationStr);

    const transcript = JSON.parse(callLog.transcriptJSON || "[]");

    // Handle Unanswered/Silent Calls
    if (transcript.length <= 1) {
      await prisma.callLog.update({
        where: { id: callLogId },
        data: {
          duration,
          leadStatus: "NO_ANSWER",
          summary: "Outbound call placed but customer did not answer or hung up immediately.",
          sentimentScore: 50.0,
        },
      });

      await prisma.customer.update({
        where: { id: callLog.customerId },
        data: { status: "FAILED" },
      });

      await prisma.notification.create({
        data: {
          organizationId: orgId,
          title: "Outbound Call Failed",
          message: `Attempt to call ${callLog.customer.name} was unanswered.`,
          type: "WARNING",
          callLogId: callLog.id,
        },
      });

      logger.info({ callLogId, organizationId: orgId }, "Live call failed (no answer)");
      return NextResponse.json({ success: true, status: "no_answer" });
    }

    // 3. Retrieve settings for the Organization that owns this CallLog
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });
    const geminiKey = settings?.geminiApiKey;

    let audit = {
      summary: "Call completed.",
      leadStatus: "INTERESTED",
      sentimentScore: 70,
      appointmentBooked: false,
      appointmentDateTime: null as string | null,
    };

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite",
          generationConfig: { responseMimeType: "application/json" },
        });

        const transcriptText = transcript
          .map((m: any) => `${m.role === "ai" ? "AI Assistant" : "Customer"}: ${m.text}`)
          .join("\n");

        const auditPrompt = `
          Analyze this call transcript between our AI calling agent and a customer.
          
          Transcript:
          ${transcriptText}
          
          Provide the output in JSON format with these exact fields:
          {
            "summary": "Concise summary of what happened during the call (max 2 sentences)",
            "leadStatus": "Classify into one of: INTERESTED, VERY_INTERESTED, CALLBACK_REQUESTED, APPOINTMENT_BOOKED, NOT_INTERESTED, BUSY, NO_ANSWER, WRONG_NUMBER",
            "sentimentScore": Number from 0 (very negative) to 100 (very positive),
            "appointmentBooked": true or false,
            "appointmentDateTime": "ISO DateTime string if booked, otherwise null"
          }
          
          If they booked an appointment or agreed to a specific time, set appointmentBooked to true and estimate the ISO date (assume today is ${new Date().toISOString()}).
        `;

        const result = await model.generateContent(auditPrompt);
        audit = JSON.parse(result.response.text());
      } catch (err) {
        logger.error({ err: err, callLogId }, "Gemini audit failed in status callback, falling back to mock rules");
        audit = getMockAnalysis(transcript);
      }
    } else {
      audit = getMockAnalysis(transcript);
    }

    // 4. Update Database CallLog
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        duration,
        summary: audit.summary,
        leadStatus: audit.leadStatus,
        sentimentScore: audit.sentimentScore,
      },
    });

    // 5. Update Customer status to COMPLETED
    await prisma.customer.update({
      where: { id: callLog.customerId },
      data: {
        status: "COMPLETED",
      },
    });

    // 6. Create Appointment if booked
    if (audit.appointmentBooked && audit.appointmentDateTime) {
      await prisma.appointment.create({
        data: {
          organizationId: orgId,
          customerId: callLog.customerId,
          callLogId: callLog.id,
          dateTime: new Date(audit.appointmentDateTime),
          status: "CONFIRMED",
        },
      });

      await prisma.notification.create({
        data: {
          organizationId: orgId,
          title: "Demo Scheduled (Live Call)",
          message: `Appointment booked for ${callLog.customer.name} on ${new Date(
            audit.appointmentDateTime
          ).toLocaleString()}`,
          type: "SUCCESS",
          callLogId: callLog.id,
        },
      });
    }

    // High value notifications
    if (audit.leadStatus === "VERY_INTERESTED" || audit.leadStatus === "INTERESTED") {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          title: "High Value Lead (Live Call)",
          message: `${callLog.customer.name} qualified as ${audit.leadStatus} during active call.`,
          type: "SUCCESS",
          callLogId: callLog.id,
        },
      });
    }

    logger.info({ callLogId, organizationId: orgId, leadStatus: audit.leadStatus }, "Live call status audit finalized");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ err: error.message }, "Twilio status callback error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
