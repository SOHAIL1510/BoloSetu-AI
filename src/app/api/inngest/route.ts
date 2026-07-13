import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { initiateCall } from "@/services/telephony/telephony.service";

// 1. Campaign Orchestrator: Triggered when a campaign is started
const processCampaign = inngest.createFunction(
  { 
    id: "process-campaign-calls",
    triggers: [{ event: "campaign/start" }]
  },
  async ({ event, step }) => {
    const { campaignId, organizationId } = event.data;

    logger.info({ campaignId, organizationId }, "Starting async campaign call orchestrator");

    // Fetch the campaign details
    const campaign = await step.run("fetch-campaign", async () => {
      return await prisma.campaign.findUnique({
        where: { id: campaignId, organizationId },
      });
    });

    if (!campaign || campaign.status !== "RUNNING") {
      logger.warn({ campaignId }, "Campaign not found or not in RUNNING status. Aborting.");
      return { success: false, reason: "Inactive campaign" };
    }

    // Fetch all pending customers
    const pendingCustomers = await step.run("fetch-pending-customers", async () => {
      return await prisma.customer.findMany({
        where: {
          campaignId: campaignId,
          organizationId: organizationId,
          status: "PENDING",
        },
        select: { id: true, name: true, phone: true },
      });
    });

    if (pendingCustomers.length === 0) {
      logger.info({ campaignId }, "No pending customers to call. Finishing campaign.");
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      });
      return { success: true, count: 0 };
    }

    logger.info(
      { campaignId, customerCount: pendingCustomers.length },
      `Dispatching calls for ${pendingCustomers.length} customers with 2s intervals`
    );

    // Schedule progressive call events to rate-limit Twilio dials (1 call per 2 seconds)
    const callEvents = pendingCustomers.map((customer, index) => {
      const delayMs = index * 2000; // 0s, 2s, 4s, 6s...
      return {
        name: "call/place-outbound",
        data: {
          customerId: customer.id,
          campaignId: campaignId,
          organizationId: organizationId,
        },
        delay: delayMs,
      };
    });

    // Inngest supports sending events in batches
    await step.sendEvent("schedule-outbound-dials", callEvents);

    return { success: true, count: pendingCustomers.length };
  }
);

// 2. Individual Call Dial Worker: Triggered progressively for each customer
const dialCustomer = inngest.createFunction(
  { 
    id: "dial-customer-outbound", 
    triggers: [{ event: "call/place-outbound" }],
    retries: 2 
  },
  async ({ event, step }) => {
    const { customerId, campaignId, organizationId } = event.data;

    logger.info({ customerId, campaignId, organizationId }, "Worker executing dialCustomer background job");

    // Fetch customer details
    const customer = await step.run("fetch-customer", async () => {
      return await prisma.customer.findUnique({
        where: { id: customerId, organizationId },
      });
    });

    if (!customer || customer.status !== "PENDING") {
      logger.warn({ customerId }, "Customer not found or not in PENDING state. Skipping dial.");
      return { success: false, reason: "Customer skipped" };
    }

    // DNC check
    if (customer.doNotCall) {
      logger.warn({ customerId }, "Customer registered in DNC. Skipping dial.");
      return { success: false, reason: "DNC_SUPPRESSED" };
    }

    // Format phone
    let toPhone = customer.phone;
    if (!toPhone.startsWith("+")) {
      toPhone = `+91${toPhone}`;
    }

    // Generate stable call attempt idempotency key based on campaign & customer
    const idempotencyKey = `attempt-${campaignId}-${customerId}`;

    // Trigger Outbound Dialing
    const callResult = await step.run("trigger-telephony-call", async () => {
      // 1. Create or retrieve CallLog entry idempotently using the stable key as the primary ID
      const callLog = await prisma.callLog.upsert({
        where: { id: idempotencyKey },
        create: {
          id: idempotencyKey,
          organizationId,
          customerId,
          campaignId,
          duration: 0,
          transcriptJSON: JSON.stringify([]),
          leadStatus: "PENDING",
          sentimentScore: 50.0,
        },
        update: {},
      });

      // 2. Place outbound call using Unified Telephony Service (Twilio/Plivo)
      const dialResult = await initiateCall({
        orgId: organizationId,
        customerId,
        campaignId,
        to: toPhone,
        idempotencyKey: idempotencyKey,
      });

      if (!dialResult.success) {
        logger.error({ err: dialResult.error, customerId }, "Outbound call placement failed");
        throw new Error(`TELEPHONY_CALL_FAILED: ${dialResult.error}`);
      }

      // 3. Save provider IDs to database
      await prisma.callLog.update({
        where: { id: idempotencyKey },
        data: {
          telephonyProvider: dialResult.providerCallId?.startsWith("sim-") ? "simulator" : undefined, // resolves dynamically on status webhook
          providerCallId: dialResult.providerCallId,
          callSid: dialResult.providerCallId, // keep for Twilio backward compatibility
        },
      });

      // 4. Mark customer as IN_PROGRESS
      await prisma.customer.update({
        where: { id: customerId },
        data: { status: "IN_PROGRESS" },
      });

      return { providerCallId: dialResult.providerCallId, callLogId: idempotencyKey };
    });

    logger.info(
      { customerId, campaignId, providerCallId: callResult.providerCallId },
      "Outbound phone dial placed successfully in background"
    );

    return { success: true, providerCallId: callResult.providerCallId };
  }
);

// Export the Next.js API handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processCampaign, dialCustomer],
});
