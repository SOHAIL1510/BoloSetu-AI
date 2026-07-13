import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiConfig } from "@/config/ai.config";
import { logger } from "@/lib/logger";

export interface GeminiTestResult {
  configured: boolean;
  connected: boolean;
  model: string;
  errorCode: "GEMINI_NOT_CONFIGURED" | "GEMINI_AUTH_FAILED" | "GEMINI_MODEL_NOT_FOUND" | "GEMINI_RATE_LIMITED" | "GEMINI_REQUEST_FAILED" | null;
  safeMessage: string;
}

/**
 * Validates connection to the Gemini API using the configured key and model.
 */
export async function testGeminiConnection(orgSettings: any): Promise<GeminiTestResult> {
  const config = getGeminiConfig(orgSettings);
  if (!config.apiKey) {
    return {
      configured: false,
      connected: false,
      model: config.model,
      errorCode: "GEMINI_NOT_CONFIGURED",
      safeMessage: "Gemini API key is not configured.",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    
    // Call generateContent with a minimal prompt to verify model access and method support
    const testResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });

    const text = testResult.response.text();
    if (!text) {
      throw new Error("Empty response received from test completion.");
    }

    return {
      configured: true,
      connected: true,
      model: config.model,
      errorCode: null,
      safeMessage: "Successfully connected to Gemini API.",
    };
  } catch (error: any) {
    const msg = error.message || "";
    logger.error({ err: msg, model: config.model }, "Gemini connection test failed");

    let errorCode: GeminiTestResult["errorCode"] = "GEMINI_REQUEST_FAILED";
    let safeMessage = "Gemini request failed. Please try again later.";

    if (msg.includes("API_KEY_INVALID") || msg.includes("key is invalid") || msg.includes("unauthorized") || msg.includes("401")) {
      errorCode = "GEMINI_AUTH_FAILED";
      safeMessage = "Authentication failed. The provided API key is invalid.";
    } else if (msg.includes("model not found") || msg.includes("404") || msg.includes("not found")) {
      errorCode = "GEMINI_MODEL_NOT_FOUND";
      safeMessage = `The configured model "${config.model}" was not found or is unavailable to this key.`;
    } else if (msg.includes("rate limit") || msg.includes("429") || msg.includes("Quota exceeded")) {
      errorCode = "GEMINI_RATE_LIMITED";
      safeMessage = "API rate limit exceeded. Please wait before retrying.";
    }

    return {
      configured: true,
      connected: false,
      model: config.model,
      errorCode,
      safeMessage,
    };
  }
}

/**
 * Generates chat completion text based on system prompt and history.
 */
export async function generateGeminiResponse(
  orgSettings: any,
  systemInstruction: string,
  prompt: string
): Promise<string> {
  const config = getGeminiConfig(orgSettings);
  if (!config.apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED: API key is missing.");
  }

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemInstruction,
    });

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error: any) {
    logger.error({ err: error.message, model: config.model }, "Gemini response generation failed");
    throw error;
  }
}

/**
 * Generates structured JSON completions (used for post-call analysis)
 */
export async function generateGeminiJson(
  orgSettings: any,
  systemInstruction: string,
  prompt: string
): Promise<string> {
  const config = getGeminiConfig(orgSettings);
  if (!config.apiKey) {
    throw new Error("GEMINI_NOT_CONFIGURED: API key is missing.");
  }

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error: any) {
    logger.error({ err: error.message, model: config.model }, "Gemini JSON generation failed");
    throw error;
  }
}
