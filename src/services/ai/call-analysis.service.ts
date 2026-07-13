import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateGeminiJson } from "./gemini.service";
import { loadConversationTurns } from "./conversation.service";

/**
 * Main service to process post-call audits and classification.
 * Runs idempotently, checking analysisStatus state.
 */
export async function analyzeCall(orgId: string, callLogId: string): Promise<any> {
  const call = await prisma.callLog.findUnique({
    where: { id: callLogId },
    include: { customer: true },
  });

  if (!call) {
    throw new Error("CALL_NOT_FOUND");
  }

  // 1. Enforce idempotency: prevent concurrent or duplicate runs
  if (call.analysisStatus === "PROCESSING") {
    logger.info({ callLogId }, "Post-call analysis is already in progress. Skipping.");
    return { status: "PROCESSING" };
  }

  if (call.analysisStatus === "COMPLETED") {
    logger.info({ callLogId }, "Post-call analysis is already completed. Skipping.");
    return { status: "COMPLETED" };
  }

  // 2. Mark as processing
  await prisma.callLog.update({
    where: { id: callLogId },
    data: { analysisStatus: "PROCESSING" },
  });

  try {
    // 3. Fetch Settings for key
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });

    if (!settings || !settings.geminiApiKey) {
      logger.warn({ orgId }, "Gemini API key is not configured. Skipping post-call analysis.");
      await prisma.callLog.update({
        where: { id: callLogId },
        data: { analysisStatus: "FAILED" },
      });
      return { status: "FAILED", reason: "API_KEY_MISSING" };
    }

    // 4. Fetch conversation turns
    const turns = await loadConversationTurns(orgId, callLogId);
    if (turns.length === 0) {
      // Unanswered or immediate hang up
      await prisma.callLog.update({
        where: { id: callLogId },
        data: {
          summary: "Call was unanswered or hung up immediately.",
          leadStatus: call.leadStatus === "DO_NOT_CALL" ? "DO_NOT_CALL" : "NO_ANSWER",
          sentimentScore: 50.0,
          analysisStatus: "COMPLETED",
        },
      });
      return { status: "COMPLETED" };
    }

    const transcriptText = turns
      .map((t) => `${t.role === "ASSISTANT" ? "AI Assistant" : "Customer"}: ${t.content}`)
      .join("\n");

    const auditPrompt = `
      Analyze this call transcript between our AI calling agent and a customer.
      
      Transcript:
      ${transcriptText}
      
      Provide the output in JSON format with these exact fields:
      {
        "summary": "Concise summary of what happened during the call (max 2 sentences)",
        "leadStatus": "Classify into one of: INTERESTED, VERY_INTERESTED, CALLBACK_REQUESTED, NOT_INTERESTED, BUSY, NO_ANSWER, WRONG_NUMBER, DO_NOT_CALL",
        "sentimentScore": Number from 0 (very negative) to 100 (very positive),
        "appointmentBooked": true or false,
        "appointmentDateTime": "ISO DateTime string if booked or callback requested, otherwise null"
      }
      
      If they booked an appointment or agreed to a specific time, set appointmentBooked to true and estimate the ISO date (assume today is ${new Date().toISOString()}).
    `;

    const responseText = await generateGeminiJson(settings, "You are a professional call auditor. Output JSON.", auditPrompt);
    const analysis = JSON.parse(responseText);

    // 5. If appointment is booked, create it idempotently
    if (analysis.appointmentBooked && analysis.appointmentDateTime) {
      const existingAppointment = await prisma.appointment.findFirst({
        where: { callLogId: callLogId },
      });

      if (!existingAppointment) {
        await prisma.appointment.create({
          data: {
            organizationId: orgId,
            callLogId: callLogId,
            customerId: call.customerId,
            dateTime: new Date(analysis.appointmentDateTime),
            status: "CONFIRMED",
          },
        });
        logger.info({ callLogId }, "Idempotently scheduled Appointment.");
      }
    }

    // 6. If Gemini output classifies as DO_NOT_CALL, update customer model too
    let leadStatus = analysis.leadStatus || "NOT_INTERESTED";
    if (call.leadStatus === "DO_NOT_CALL" || leadStatus === "DO_NOT_CALL") {
      leadStatus = "DO_NOT_CALL";
      await prisma.customer.update({
        where: { id: call.customerId },
        data: { doNotCall: true },
      });
    }

    // 7. Update CallLog with analysis results
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        summary: analysis.summary,
        leadStatus: leadStatus,
        sentimentScore: typeof analysis.sentimentScore === "number" ? analysis.sentimentScore : 50.0,
        analysisStatus: "COMPLETED",
      },
    });

    logger.info({ callLogId }, "Call analysis completed successfully.");
    return { status: "COMPLETED" };
  } catch (error: any) {
    logger.error({ err: error.message, callLogId }, "Failed call analysis");
    await prisma.callLog.update({
      where: { id: callLogId },
      data: { analysisStatus: "FAILED" },
    });
    return { status: "FAILED", error: error.message };
  }
}
