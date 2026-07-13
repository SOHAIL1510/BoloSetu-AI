export interface TelephonyConfig {
  provider: "twilio" | "plivo";
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  plivo: {
    authId: string;
    authToken: string;
    phoneNumber: string;
  };
}

export function getTelephonyConfig(orgSettings: any): TelephonyConfig {
  // Read TELEPHONY_PROVIDER from environment, default to "twilio"
  const envProvider = (process.env.TELEPHONY_PROVIDER || "twilio").toLowerCase();
  const provider = envProvider === "plivo" ? "plivo" : "twilio";

  return {
    provider,
    twilio: {
      accountSid: (orgSettings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || "").trim(),
      authToken: (orgSettings?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || "").trim(),
      phoneNumber: (orgSettings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || "").trim(),
    },
    plivo: {
      authId: (orgSettings?.plivoAuthId || process.env.PLIVO_AUTH_ID || "").trim(),
      authToken: (orgSettings?.plivoAuthToken || process.env.PLIVO_AUTH_TOKEN || "").trim(),
      phoneNumber: (orgSettings?.plivoPhoneNumber || process.env.PLIVO_PHONE_NUMBER || "").trim(),
    },
  };
}
