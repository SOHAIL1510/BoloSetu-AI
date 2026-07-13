import { logger } from "@/lib/logger";

export interface SarvamSttResult {
  transcript: string;
  languageCode: string;
}

/**
 * Transcribes an audio buffer using Sarvam AI Speech-to-Text API
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  languageCode: string,
  apiKey: string
): Promise<SarvamSttResult> {
  if (!apiKey) {
    throw new Error("SARVAM_NOT_CONFIGURED: Sarvam API subscription key is missing.");
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/wav" });
    formData.append("file", blob, "audio.wav");
    formData.append("model", "saarika:v1");
    formData.append("language_code", languageCode || "hi-IN");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ err, status: response.status }, "Sarvam STT API call failed");
      throw new Error(`SARVAM_STT_FAILED: ${err}`);
    }

    const data = await response.json();
    return {
      transcript: data.transcript || "",
      languageCode: data.language_code || languageCode,
    };
  } catch (error: any) {
    logger.error({ err: error.message }, "Sarvam STT service exception");
    throw error;
  }
}
