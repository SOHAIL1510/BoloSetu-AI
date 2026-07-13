import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

// Replace variables in the prompt template
function interpolatePrompt(template: string, customer: any): string {
  let prompt = template;
  prompt = prompt.replace(/\{\{customer_name\}\}/gi, customer.name || "Customer");
  prompt = prompt.replace(/\{\{city\}\}/gi, customer.city || "your city");
  prompt = prompt.replace(/\{\{company\}\}/gi, customer.company || "your company");
  prompt = prompt.replace(/\{\{product\}\}/gi, customer.product || "our services");
  prompt = prompt.replace(/\{\{notes\}\}/gi, customer.notes || "previous conversations");
  return prompt;
}

// Fallback rules for local offline testing (when no LLM API key is saved)
function getMockResponse(messages: { role: string; text: string }[], customer: any, campaign: any): string {
  const lastUserMessage = messages[messages.length - 1]?.text.toLowerCase() || "";
  const isHindi = campaign.language.startsWith("hi");

  if (messages.length <= 1) {
    if (isHindi) {
      return `नमस्ते ${customer.name || "जी"}, मैं ABC इंस्टिट्यूट से एक AI सहायक बात कर रहा हूँ। क्या मैं आपकी रुचि ${customer.product || "हमारे कोर्स"} के बारे में २ मिनट बात कर सकता हूँ?`;
    }
    return `Hello ${customer.name || "there"}, I am an AI sales assistant calling on behalf of ABC Institute. I noticed you are interested in ${customer.product || "our courses"}. May I have 2 minutes of your time?`;
  }

  if (lastUserMessage.includes("busy") || lastUserMessage.includes("later") || lastUserMessage.includes("baad me")) {
    if (isHindi) return "कोई बात नहीं। क्या मैं आपको कल दोबारा कॉल कर सकता हूँ?";
    return "No problem. Would it be okay if I call you back tomorrow?";
  }

  if (lastUserMessage.includes("no") || lastUserMessage.includes("not interested") || lastUserMessage.includes("nahi")) {
    if (isHindi) return "कोई बात नहीं, अपना समय देने के लिए धन्यवाद। आपका दिन शुभ हो!";
    return "I understand. Thank you for your time. Have a wonderful day!";
  }

  if (lastUserMessage.includes("yes") || lastUserMessage.includes("interested") || lastUserMessage.includes("haa") || lastUserMessage.includes("tell me") || lastUserMessage.includes("batao")) {
    if (isHindi) return `ज़रूर! हमारा ${customer.product || "कोर्स"} विशेष रूप से जॉब प्लेसमेंट के लिए डिज़ाइन किया गया है। क्या आप सोमवार दोपहर २ बजे डेमो क्लास बुक करना चाहेंगे?`;
    return `Great! Our ${customer.product || "program"} is designed for career acceleration. Would you like to schedule a free demo session for next Monday at 2:00 PM?`;
  }

  if (lastUserMessage.includes("book") || lastUserMessage.includes("schedule") || lastUserMessage.includes("time") || lastUserMessage.includes("monday") || lastUserMessage.includes("2 pm") || lastUserMessage.includes("somvar")) {
    if (isHindi) return "उत्कृष्ट! मैंने सोमवार दोपहर २ बजे का समय आपके लिए बुक कर दिया है। आपको एसएमएस पर विवरण मिल जाएगा। धन्यवाद!";
    return "Excellent! I have scheduled your demo class for next Monday at 2:00 PM. A confirmation message has been sent to your phone. Thank you and goodbye!";
  }

  if (isHindi) {
    return "जी, मैं समझ रहा हूँ। हमारे बारे में और जानकारी हमारी वेबसाइट पर उपलब्ध है। क्या आप कोई अन्य प्रश्न पूछना चाहते हैं?";
  }
  return "I see. Our system handles comprehensive training and support for this. Do you have any other questions I can help answer today?";
}

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
    summary = "Call completed successfully. AI pitched the course, and the customer agreed to book a demo session.";
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
    const body = await req.json();
    const { customerId, campaignId, messages, isFirstTurn, isHangUp } = body;

    if (!customerId || !campaignId) {
      return NextResponse.json({ error: "Missing customerId or campaignId" }, { status: 400 });
    }

    // 1. Fetch Campaign and Customer Info
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!campaign || !customer) {
      return NextResponse.json({ error: "Campaign or Customer not found" }, { status: 404 });
    }

    // 1.5 Fetch both campaign-specific and global knowledge base grounding documents
    const groundingDocs = await prisma.knowledgeBase.findMany({
      where: {
        organizationId: campaign.organizationId,
        OR: [
          { campaignId: campaign.id },
          { campaignId: null },
        ],
      },
    });

    // 2. Multi-tenant Authorization Check:
    const session: any = await getServerSession(authOptions);
    if (session?.user && campaign.organizationId !== session.user.organizationId) {
      logger.warn(
        { userId: session.user.id, campaignOrgId: campaign.organizationId, userOrgId: session.user.organizationId },
        "Cross-tenant access attempted by user on simulator"
      );
      return NextResponse.json({ error: "Forbidden: Tenant mismatch" }, { status: 403 });
    }

    // 3. Fetch settings for the specific Organization that owns this Campaign
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: campaign.organizationId },
    });

    const geminiKey = (settings?.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();

    // 4. Handle call termination audit
    if (isHangUp) {
      if (messages.length === 0) {
        return NextResponse.json({
          summary: "Call was unanswered or hung up immediately.",
          leadStatus: "NO_ANSWER",
          sentimentScore: 50,
          appointmentBooked: false,
        });
      }

      if (!geminiKey) {
        const mockAnalysis = getMockAnalysis(messages);
        return NextResponse.json(mockAnalysis);
      }

      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite",
          generationConfig: { responseMimeType: "application/json" },
        });

        const transcriptText = messages
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
        const responseText = result.response.text();
        const analysis = JSON.parse(responseText);
        return NextResponse.json(analysis);
      } catch (err: any) {
        logger.error({ err: err.message, campaignId }, "Gemini audit error");
        return NextResponse.json({
          summary: `[Gemini Audit Failed]: ${err.message}`,
          leadStatus: "FAILED",
          sentimentScore: 50,
          appointmentBooked: false,
          appointmentDateTime: null
        });
      }
    }

    // 5. Generate next conversation response
    const systemPromptText = interpolatePrompt(campaign.systemPrompt, customer);
    
    // Append RAG Knowledge Base articles if available
    let knowledgeBaseContext = "";
    if (groundingDocs && groundingDocs.length > 0) {
      knowledgeBaseContext = "\nUse the following verified company information to answer questions. Do not make up answers not found in this documentation:\n";
      groundingDocs.forEach((doc) => {
        // Filter out garbage binary PDF text cards from RAG injection
        if (doc.contentText && !doc.contentText.startsWith("%PDF")) {
          knowledgeBaseContext += `Document [${doc.name}]: ${doc.contentText}\n`;
        }
      });
    }

    // 6. Map language codes to strict native script generation instructions for the LLM.
    let scriptInstruction = `Speak in the language of the campaign: ${campaign.language}.`;
    const langCode = campaign.language.toLowerCase();
    
    if (langCode.startsWith("hi")) {
      scriptInstruction = "You MUST output your response strictly in the Hindi language using the Devnagari script (हिंदी देवनागरी लिपि). Do NOT write in English or transliterated Hinglish (do not write 'Namaste', write 'नमस्ते'). All words and numbers must be in native Hindi script.";
    } else if (langCode.startsWith("ta")) {
      scriptInstruction = "You MUST output your response strictly in the Tamil language using the native Tamil script (தமிழ்). Do NOT write in English or transliterated Tamil.";
    } else if (langCode.startsWith("te")) {
      scriptInstruction = "You MUST output your response strictly in the Telugu language using the native Telugu script (తెలుగు). Do NOT write in English or transliterated Telugu.";
    } else if (langCode.startsWith("bn")) {
      scriptInstruction = "You MUST output your response strictly in the Bengali language using the native Bengali script (বাংলা). Do NOT write in English or transliterated Bengali.";
    } else if (langCode.startsWith("mr")) {
      scriptInstruction = "You MUST output your response strictly in the Marathi language using the Devnagari script (मराठी देवनागरी लिपि). Do NOT write in English.";
    } else if (langCode.startsWith("kn")) {
      scriptInstruction = "You MUST output your response strictly in the Kannada language using the native Kannada script (ಕನ್ನಡ). Do NOT write in English.";
    } else if (langCode.startsWith("ml")) {
      scriptInstruction = "You MUST output your response strictly in the Malayalam language using the native Malayalam script (മലയാളം). Do NOT write in English.";
    } else if (langCode.startsWith("en")) {
      scriptInstruction = "Speak in Indian English naturally.";
    }

    const finalSystemPrompt = `
      ${systemPromptText}
      ${knowledgeBaseContext}
      
      CRITICAL INSTRUCTIONS:
      - Always identify yourself as an AI assistant. Never pretend to be human.
      - ${scriptInstruction}
      - Keep responses very short, friendly, and natural (1 to 2 sentences max).
      - Do not output markdown, formatting, or bullet points. Speak directly as if on a phone call.
      - If the customer wants to book a meeting/demo, ask for their preferred day and time.
    `;

    // First Turn Greeting
    if (isFirstTurn || messages.length === 0) {
      if (!geminiKey) {
        return NextResponse.json({ response: getMockResponse([], customer, campaign) });
      }

      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
        const greetingPrompt = `${finalSystemPrompt}\nGenerate your introductory greeting to start the phone call. Address the customer by name.`;
        const result = await model.generateContent(greetingPrompt);
        return NextResponse.json({ response: result.response.text().trim() });
      } catch (err: any) {
        logger.error({ err: err.message, campaignId }, "Gemini greeting generation error");
        return NextResponse.json({ response: `⚠️ [Gemini Greeting Error]: ${err.message}. Check API key in settings.` });
      }
    }

    // Interactive response generation
    if (!geminiKey) {
      return NextResponse.json({ response: getMockResponse(messages, customer, campaign) });
    }

    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

      const formattedHistory = messages
        .map((m: any) => `${m.role === "ai" ? "AI Assistant" : "Customer"}: ${m.text}`)
        .join("\n");

      const conversationPrompt = `
        ${finalSystemPrompt}

        Below is the conversation history so far:
        ${formattedHistory}

        Generate the next response for the AI Assistant. Remember to speak directly, naturally, and stay extremely concise (1-2 sentences maximum).
        AI Assistant:
      `;

      const result = await model.generateContent(conversationPrompt);
      return NextResponse.json({ response: result.response.text().trim() });
    } catch (err: any) {
      logger.error({ err: err.message, campaignId }, "Gemini dialogue inference error");
      return NextResponse.json({ response: `⚠️ [Gemini API Error]: ${err.message}. Check API key in settings.` });
    }
  } catch (error: any) {
    logger.error({ err: error.message }, "Simulate call server crash");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
