import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, campaignId } = body;

    if (!customerId || !campaignId) {
      return NextResponse.json({ error: "Missing customerId or campaignId" }, { status: 400 });
    }

    // 1. Fetch Tenant Settings
    const settings = await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
    });

    const accountSid = settings?.twilioAccountSid;
    const authToken = settings?.twilioAuthToken;
    const fromPhone = settings?.twilioPhoneNumber;
    const publicUrl = settings?.publicWebhookUrl;

    if (!accountSid || !authToken || !fromPhone || !publicUrl) {
      return NextResponse.json(
        {
          error: "twilio_credentials_missing",
          message: "Please configure Twilio credentials and your public webhook URL in Settings.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch Customer and Campaign (ensure they belong to the same organization)
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
    });
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
    });

    if (!customer || !campaign) {
      return NextResponse.json({ error: "Customer or Campaign not found or access denied" }, { status: 404 });
    }

    // Format phone number
    let toPhone = customer.phone;
    if (!toPhone.startsWith("+")) {
      toPhone = `+91${toPhone}`;
    }

    // 3. Create initial CallLog record in database scoped to the organization
    const callLog = await prisma.callLog.create({
      data: {
        organizationId: orgId,
        customerId,
        campaignId,
        duration: 0,
        transcriptJSON: JSON.stringify([]),
        leadStatus: "PENDING",
        sentimentScore: 50.0,
      },
    });

    // 4. Initiate Twilio REST Call
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
      logger.error({ err: errText, customerId }, "Twilio API REST connection failed");
      await prisma.callLog.delete({ where: { id: callLog.id } });
      return NextResponse.json(
        { error: "twilio_api_error", message: `Twilio failed: ${errText}` },
        { status: response.status }
      );
    }

    const callResult = await response.json();

    // 5. Update CallLog with the Twilio Call SID
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: { callSid: callResult.sid },
    });

    // 6. Update Customer Calling State to IN_PROGRESS
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        status: "IN_PROGRESS",
      },
    });

    logger.info({ callLogId: callLog.id, twilioSid: callResult.sid }, "Initiated live phone call via Twilio");

    return NextResponse.json({
      success: true,
      sid: callResult.sid,
      callLogId: callLog.id,
      message: "Twilio outbound phone call initiated successfully.",
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Outbound call API error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
