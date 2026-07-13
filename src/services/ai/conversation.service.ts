import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateGeminiResponse } from "./gemini.service";
import { getCampaignGrounding } from "./rag.service";

export interface ConversationTurnInput {
  role: "SYSTEM" | "ASSISTANT" | "CUSTOMER";
  content: string;
  language: string;
}

/**
 * Validates organization ownership of a CallLog session.
 */
export async function validateCallOwnership(orgId: string, callLogId: string): Promise<boolean> {
  const call = await prisma.callLog.findUnique({
    where: { id: callLogId },
    select: { organizationId: true },
  });
  return call?.organizationId === orgId;
}

/**
 * Loads conversation history turns for a CallLog session.
 */
export async function loadConversationTurns(orgId: string, callLogId: string) {
  return prisma.conversationTurn.findMany({
    where: {
      organizationId: orgId,
      callLogId: callLogId,
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Appends a conversation turn to the database.
 */
export async function appendConversationTurn(
  orgId: string,
  callLogId: string,
  turn: ConversationTurnInput
) {
  return prisma.conversationTurn.create({
    data: {
      organizationId: orgId,
      callLogId: callLogId,
      role: turn.role,
      content: turn.content,
      language: turn.language,
    },
  });
}

/**
 * Detects if user requests Do Not Call opt-out.
 */
function isDncRequested(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("do not call") ||
    t.includes("stop calling") ||
    t.includes("never call") ||
    t.includes("remove my number") ||
    t.includes("remove me") ||
    t.includes("dnd") ||
    t.includes("don't call") ||
    t.includes("mujhse baat mat karo") ||
    t.includes("call mat karna") ||
    t.includes("delete my number")
  );
}

/**
 * Interpolate prompt text template.
 */
function interpolatePrompt(template: string, customer: any): string {
  let prompt = template;
  prompt = prompt.replace(/\{\{customer_name\}\}/gi, customer.name || "Customer");
  prompt = prompt.replace(/\{\{city\}\}/gi, customer.city || "your city");
  prompt = prompt.replace(/\{\{company\}\}/gi, customer.company || "your company");
  prompt = prompt.replace(/\{\{product\}\}/gi, customer.product || "our services");
  prompt = prompt.replace(/\{\{notes\}\}/gi, customer.notes || "previous conversations");
  return prompt;
}

/**
 * Core conversation pipeline
 */
export async function processConversationTurn(
  orgId: string,
  callLogId: string,
  customerMessage: string,
  language: string,
  isFirstTurn = false
): Promise<string> {
  // 1. Verify tenant scoping
  const isOwner = await validateCallOwnership(orgId, callLogId);
  if (!isOwner) {
    throw new Error("UNAUTHORIZED_ACCESS: Scoping mismatch.");
  }

  // 2. Fetch Call session, Customer details and Campaign properties
  const callLog = await prisma.callLog.findUnique({
    where: { id: callLogId },
    include: { customer: true, campaign: true },
  });

  if (!callLog) {
    throw new Error("CALL_NOT_FOUND");
  }

  const { customer, campaign } = callLog;

  // 3. Check for immediate DNC opt-out
  if (!isFirstTurn && isDncRequested(customerMessage)) {
    // Save customer message turn
    await appendConversationTurn(orgId, callLogId, {
      role: "CUSTOMER",
      content: customerMessage,
      language,
    });

    // Mark customer in DNC and update call log lead status
    await prisma.customer.update({
      where: { id: customer.id },
      data: { doNotCall: true },
    });

    await prisma.callLog.update({
      where: { id: callLogId },
      data: { leadStatus: "DO_NOT_CALL" },
    });

    const optOutText = language.startsWith("hi")
      ? "ठीक है, मैंने आपका नंबर हटा दिया है। हम आपको दोबारा कॉल नहीं करेंगे। धन्यवाद।"
      : "I understand. I have registered your number on our do not call list. We will not contact you again. Thank you.";

    // Save AI turn
    await appendConversationTurn(orgId, callLogId, {
      role: "ASSISTANT",
      content: optOutText,
      language,
    });

    return optOutText;
  }

  // 4. Save Customer Turn
  if (!isFirstTurn && customerMessage.trim()) {
    await appendConversationTurn(orgId, callLogId, {
      role: "CUSTOMER",
      content: customerMessage,
      language,
    });
  }

  // 5. Query grounding documents (RAG)
  const grounding = await getCampaignGrounding(orgId, campaign.id);

  // 6. Map target script instructions
  let scriptInstruction = `Speak in the language of the campaign: ${campaign.language}.`;
  const langCode = campaign.language.toLowerCase();
  
  if (langCode.startsWith("hi")) {
    scriptInstruction = "You MUST output your response strictly in the Hindi language using the Devnagari script (हिंदी देवनागरी लिपि). Do NOT write in English or transliterated Hinglish. All words and numbers must be in native Hindi script.";
  } else if (langCode.startsWith("mr")) {
    scriptInstruction = "You MUST output your response strictly in the Marathi language using the Devnagari script (मराठी देवनागरी लिपि). Do NOT write in English.";
  } else if (langCode.startsWith("en")) {
    scriptInstruction = "Speak in Indian English naturally.";
  }

  const systemInstructions = `
    ${interpolatePrompt(campaign.systemPrompt, customer)}
    ${grounding.contextText}
    
    CRITICAL INSTRUCTIONS:
    - Always introduce and identify yourself as an AI assistant. Never pretend to be human.
    - ${scriptInstruction}
    - Keep responses very short, friendly, and natural (1 to 2 sentences max).
    - Do not output markdown, formatting, or bullet points. Speak directly as if on a phone call.
    - If the customer wants to book a meeting/demo, ask for their preferred day and time.
  `;

  // 7. Load turns from relational ConversationTurn database model
  const turns = await loadConversationTurns(orgId, callLogId);
  const formattedHistory = turns
    .map((t) => `${t.role === "ASSISTANT" ? "AI Assistant" : "Customer"}: ${t.content}`)
    .join("\n");

  const prompt = isFirstTurn
    ? "Generate your introductory greeting to start the phone call. Address the customer by name."
    : `Below is the conversation history so far:
\n${formattedHistory}\n
Generate the next response for the AI Assistant. Remember to speak directly, naturally, and stay extremely concise (1-2 sentences maximum).
AI Assistant:`;

  // 8. Fetch settings for key
  const settings = await prisma.organizationSetting.findUnique({
    where: { organizationId: orgId },
  });

  // 9. Generate Response from Gemini
  const response = await generateGeminiResponse(settings, systemInstructions, prompt);

  // 10. Save AI Response Turn
  await appendConversationTurn(orgId, callLogId, {
    role: "ASSISTANT",
    content: response,
    language,
  });

  return response;
}
