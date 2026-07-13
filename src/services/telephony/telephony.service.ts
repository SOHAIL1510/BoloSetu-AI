import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { InitiateCallParams, TelephonyCallResult } from "./telephony.types";
import { TwilioProvider } from "./providers/twilio.provider";
import { PlivoProvider } from "./providers/plivo.provider";
import { getTelephonyConfig } from "@/config/telephony.config";

const twilioProvider = new TwilioProvider();
const plivoProvider = new PlivoProvider();

/**
 * Initiates an outbound call using the configured telephony provider (Twilio or Plivo).
 * Enforces Do Not Call (DNC) list checking prior to placing the call.
 */
export async function initiateCall(params: InitiateCallParams): Promise<TelephonyCallResult> {
  const { orgId, customerId, campaignId, to } = params;

  try {
    // 1. Fetch Customer and verify DNC suppression
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, error: "CUSTOMER_NOT_FOUND" };
    }

    if (customer.doNotCall) {
      logger.warn({ customerId, phone: to }, "Call aborted - number is in the Do Not Call (DNC) list.");
      return { success: false, error: "DNC_SUPPRESSED" };
    }

    // 2. Fetch Organization Settings for provider credentials
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });

    // 3. Resolve Telephony Config
    const config = getTelephonyConfig(settings);

    // 4. Dispatch call execution to the active provider
    if (config.provider === "plivo") {
      logger.info({ customerId, provider: "plivo" }, "Placing outbound call via Plivo.");
      return plivoProvider.initiateCall(params, config.plivo);
    } else {
      logger.info({ customerId, provider: "twilio" }, "Placing outbound call via Twilio.");
      return twilioProvider.initiateCall(params, config.twilio);
    }
  } catch (error: any) {
    logger.error({ err: error.message, customerId }, "Telephony Service call dispatch failed");
    return { success: false, error: `TELEPHONY_DISPATCH_FAILED: ${error.message}` };
  }
}

/**
 * Tests connection to the configured active provider (Twilio or Plivo).
 */
export async function testTelephonyConnection(orgId: string): Promise<{
  provider: "twilio" | "plivo";
  success: boolean;
  error?: string;
}> {
  try {
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });

    const config = getTelephonyConfig(settings);

    if (config.provider === "plivo") {
      const res = await plivoProvider.testConnection(config.plivo);
      return { provider: "plivo", success: res.success, error: res.error };
    } else {
      const res = await twilioProvider.testConnection(config.twilio);
      return { provider: "twilio", success: res.success, error: res.error };
    }
  } catch (error: any) {
    logger.error({ err: error.message, orgId }, "Telephony connection test crash");
    return { provider: "twilio", success: false, error: error.message };
  }
}
