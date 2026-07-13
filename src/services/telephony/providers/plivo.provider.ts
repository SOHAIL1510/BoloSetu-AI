import plivo from "plivo";
import { TelephonyProvider, InitiateCallParams, TelephonyCallResult } from "../telephony.types";
import { logger } from "@/lib/logger";

export class PlivoProvider implements TelephonyProvider {
  async initiateCall(params: InitiateCallParams, config: any): Promise<TelephonyCallResult> {
    const { authId, authToken, phoneNumber } = config;
    if (!authId || !authToken || !phoneNumber) {
      return { success: false, error: "PLIVO_NOT_CONFIGURED" };
    }

    try {
      const client = new plivo.Client(authId, authToken);
      const publicUrl = process.env.PUBLIC_WEBHOOK_URL || "";
      
      const answerUrl = `${publicUrl}/api/webhooks/plivo/answer?customerId=${params.customerId}&campaignId=${params.campaignId}&callLogId=${params.idempotencyKey}`;
      const statusUrl = `${publicUrl}/api/webhooks/plivo/status?callLogId=${params.idempotencyKey}`;

      const response = await client.calls.create(
        phoneNumber, // from
        params.to,    // to
        answerUrl,    // answer_url
        {
          answerMethod: "POST",
          statusCallbackUrl: statusUrl,
          statusCallbackMethod: "POST",
        }
      );

      return {
        success: true,
        providerCallId: Array.isArray(response.requestUuid)
          ? response.requestUuid[0]
          : response.requestUuid,
      };
    } catch (error: any) {
      logger.error({ err: error.message, customerId: params.customerId }, "Plivo outbound call initiation failed");
      return {
        success: false,
        error: `PLIVO_CALL_FAILED: ${error.message}`,
      };
    }
  }

  async testConnection(config: any): Promise<{ success: boolean; error?: string }> {
    const { authId, authToken } = config;
    if (!authId || !authToken) {
      return { success: false, error: "PLIVO_NOT_CONFIGURED" };
    }

    try {
      const client = new plivo.Client(authId, authToken);
      // Fetch account details to verify credentials
      await client.accounts.get();
      return { success: true };
    } catch (error: any) {
      logger.error({ err: error.message }, "Plivo connection test failed");
      return {
        success: false,
        error: `PLIVO_AUTH_FAILED: ${error.message}`,
      };
    }
  }

  /**
   * Validates Plivo webhook signature to ensure it came from Plivo
   */
  validateSignature(
    uri: string,
    nonce: string,
    signature: string,
    authToken: string
  ): boolean {
    try {
      const crypto = require("crypto");
      const message = uri + nonce;
      const hmac = crypto.createHmac("sha256", authToken);
      hmac.update(message);
      const generatedSignature = hmac.digest("base64");
      return generatedSignature === signature;
    } catch (error: any) {
      logger.error({ err: error.message }, "Plivo signature validation failed");
      return false;
    }
  }
}
