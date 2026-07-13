export interface AiConfig {
  apiKey: string;
  model: string;
}

/**
 * Dynamically resolves Gemini settings based on tenant organization settings
 */
export function getGeminiConfig(orgSettings: any): AiConfig {
  const apiKey = (orgSettings?.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
  const model = (orgSettings?.geminiModel || process.env.GEMINI_MODEL || "gemini-3.1-flash-lite").trim();
  return { apiKey, model };
}
