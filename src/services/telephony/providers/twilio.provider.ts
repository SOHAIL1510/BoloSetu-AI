import twilio from "twilio";
import { TelephonyProvider, InitiateCallParams, TelephonyCallResult } from "../telephony.types";
import { logger } from "@/lib/logger";

export class TwilioProvider implements TelephonyProvider {
  async initiateCall(params: InitiateCallParams, config: any): Promise<TelephonyCallResult> {
    const { accountSid, authToken, phoneNumber } = config;
    if (!accountSid || !authToken || !phoneNumber) {
      return { success: false, error: "TWILIO_NOT_CONFIGURED" };
    }

    try {
      const client = twilio(accountSid, authToken);
      const publicUrl = process.env.PUBLIC_WEBHOOK_URL || "";
      
      const call = await client.calls.create({
        url: `${publicUrl}/api/twilio/twiml?customerId=${params.customerId}&campaignId=${params.campaignId}&callLogId=${params.idempotencyKey}`,
        to: params.to,
        from: phoneNumber,
      });

      return {
        success: true,
        providerCallId: call.sid,
      };
    } catch (error: any) {
      logger.error({ err: error.message, customerId: params.customerId }, "Twilio outbound call initiation failed");
      return {
        success: false,
        error: `TWILIO_CALL_FAILED: ${error.message}`,
      };
    }
  }

  async testConnection(config: any): Promise<{ success: boolean; error?: string }> {
    const { accountSid, authToken } = config;
    if (!accountSid || !authToken) {
      return { success: false, error: "TWILIO_NOT_CONFIGURED" };
    }

    try {
      const client = twilio(accountSid, authToken);
      // Fetch account details to verify credentials
      await client.api.v2010.accounts(accountSid).fetch();
      return { success: true };
    } catch (error: any) {
      logger.error({ err: error.message }, "Twilio connection test failed");
      return {
        success: false,
        error: `TWILIO_AUTH_FAILED: ${error.message}`,
      };
    }
  }
}
