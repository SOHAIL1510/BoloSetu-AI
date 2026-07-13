import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

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

    // Fetch organization credentials
    const settings = await step.run("fetch-organization-settings", async () => {
      return await prisma.organizationSetting.findUnique({
        where: { organizationId },
      });
    });

    const accountSid = settings?.twilioAccountSid;
    const authToken = settings?.twilioAuthToken;
    const fromPhone = settings?.twilioPhoneNumber;
    const publicUrl = settings?.publicWebhookUrl;

    if (!accountSid || !authToken || !fromPhone || !publicUrl) {
      logger.error(
        { organizationId, customerId },
        "Twilio configuration missing for organization. Dial aborted."
      );
      return { success: false, reason: "Missing credentials" };
    }

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

    // Format phone
    let toPhone = customer.phone;
    if (!toPhone.startsWith("+")) {
      toPhone = `+91${toPhone}`;
    }

    // Trigger Outbound Dialing
    const callResult = await step.run("trigger-twilio-call", async () => {
      // 1. Create CallLog entry
      const callLog = await prisma.callLog.create({
        data: {
          organizationId,
          customerId,
          campaignId,
          duration: 0,
          transcriptJSON: JSON.stringify([]),
          leadStatus: "PENDING",
          sentimentScore: 50.0,
        },
      });

      const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const twimlUrl = `${publicUrl}/api/twilio/twiml?customerId=${customerId}&campaignId=${campaignId}&callLogId=${callLog.id}`;
      const statusCallbackUrl = `${publicUrl}/api/twilio/status?callLogId=${callLog.id}`;

      const formData = new URLSearchParams();
      formData.append("To", toPhone);
      formData.append("From", fromPhone);
      formData.append("Url", twimlUrl);
      formData.append("Method", "POST");
      formData.append("StatusCallback", statusCallbackUrl);
      formData.append("StatusCallbackMethod", "POST");
      formData.append("StatusCallbackEvent", "completed");

      const response = await fetch(twilioEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        await prisma.callLog.delete({ where: { id: callLog.id } });
        throw new Error(`Twilio call error: ${errText}`);
      }

      const twilioCall = await response.json();

      // Save callSid to database
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { callSid: twilioCall.sid },
      });

      // 2. Mark customer as IN_PROGRESS
      await prisma.customer.update({
        where: { id: customerId },
        data: { status: "IN_PROGRESS" },
      });

      return { sid: twilioCall.sid, callLogId: callLog.id };
    });

    logger.info(
      { customerId, campaignId, twilioSid: callResult.sid },
      "Outbound phone dial placed successfully in background"
    );

    return { success: true, sid: callResult.sid };
  }
);

// Export the Next.js API handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processCampaign, dialCustomer],
});
