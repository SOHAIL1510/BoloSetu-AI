export interface VoiceConfig {
  apiKey: string;
  defaultVoiceId: string;
  defaultLanguage: string;
}

export function getVoiceConfig(orgSettings: any): VoiceConfig {
  const apiKey = (orgSettings?.sarvamApiKey || process.env.SARVAM_API_KEY || "").trim();
  const defaultVoiceId = (orgSettings?.defaultVoiceId || "meera").trim();
  const defaultLanguage = (orgSettings?.defaultLanguage || "hi-IN").trim();
  return { apiKey, defaultVoiceId, defaultLanguage };
}
