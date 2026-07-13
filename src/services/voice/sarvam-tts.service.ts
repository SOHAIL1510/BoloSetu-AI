import { logger } from "@/lib/logger";

/**
 * Synthesizes text into audio buffer using Sarvam AI Text-to-Speech API
 */
export async function synthesizeText(
  text: string,
  languageCode: string,
  voiceId: string,
  apiKey: string
): Promise<Buffer> {
  if (!apiKey) {
    throw new Error("SARVAM_NOT_CONFIGURED: Sarvam API subscription key is missing.");
  }

  try {
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: languageCode || "hi-IN",
        speaker: voiceId || "meera",
        pitch: 0.5,
        pace: 1.0,
        loudness: 1.5,
        speech_modulation: 1.5,
        model: "bulbul:v1",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ err, status: response.status }, "Sarvam TTS API call failed");
      throw new Error(`SARVAM_TTS_FAILED: ${err}`);
    }

    const data = await response.json();
    if (!data.audios || !data.audios[0]) {
      throw new Error("SARVAM_TTS_FAILED: No audio content returned.");
    }

    return Buffer.from(data.audios[0], "base64");
  } catch (error: any) {
    logger.error({ err: error.message }, "Sarvam TTS service exception");
    throw error;
  }
}
