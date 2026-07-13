import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

// Simple validation utility
function cleanPhone(phone: string | number | undefined): string {
  if (phone === undefined || phone === null) return "";
  return String(phone).replace(/[^\d+]/g, "").trim();
}

function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/[^\d]/g, "");
  return digitsOnly.length >= 9 && digitsOnly.length <= 15;
}

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: orgId,
        ...(campaignId ? { campaignId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(customers);
  } catch (error: any) {
    logger.error({ err: error.message }, "GET customers error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { campaignId, customers } = body;

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required." }, { status: 400 });
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({ error: "No customer records provided." }, { status: 400 });
    }

    // Verify campaign exists and belongs to the organization
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found or access denied." }, { status: 404 });
    }

    // Fetch existing phone numbers in this campaign to check database duplicates
    const existingCustomers = await prisma.customer.findMany({
      where: { campaignId, organizationId: orgId },
      select: { phone: true },
    });
    const existingPhonesSet = new Set(existingCustomers.map((c) => cleanPhone(c.phone)));

    const validData: any[] = [];
    const importErrors: { row: number; name: string; phone: string; reason: string }[] = [];
    const batchPhonesSet = new Set<string>();

    for (let i = 0; i < customers.length; i++) {
      const rawRow = customers[i];
      const rowIndex = i + 1;
      const rawName = rawRow.Name || rawRow.name || "Unknown Customer";
      const rawPhoneStr = rawRow["Phone Number"] || rawRow.phoneNumber || rawRow.phone || "";
      const email = rawRow.Email || rawRow.email || "";
      const company = rawRow.Company || rawRow.company || "";
      const city = rawRow.City || rawRow.city || "";
      const product = rawRow["Product Interested"] || rawRow.productInterested || rawRow.product || "";
      const previousInteraction = rawRow["Previous Interaction"] || rawRow.previousInteraction || "";
      const notes = rawRow.Notes || rawRow.notes || "";

      const cleanedPhone = cleanPhone(rawPhoneStr);

      if (!cleanedPhone) {
        importErrors.push({
          row: rowIndex,
          name: rawName,
          phone: rawPhoneStr,
          reason: "Missing phone number",
        });
        continue;
      }

      if (!isValidPhone(cleanedPhone)) {
        importErrors.push({
          row: rowIndex,
          name: rawName,
          phone: rawPhoneStr,
          reason: "Invalid phone number format (must be 9-15 digits)",
        });
        continue;
      }

      if (batchPhonesSet.has(cleanedPhone)) {
        importErrors.push({
          row: rowIndex,
          name: rawName,
          phone: rawPhoneStr,
          reason: "Duplicate entry within the uploaded file",
        });
        continue;
      }

      if (existingPhonesSet.has(cleanedPhone)) {
        importErrors.push({
          row: rowIndex,
          name: rawName,
          phone: rawPhoneStr,
          reason: "Phone number already exists in this campaign",
        });
        continue;
      }

      batchPhonesSet.add(cleanedPhone);
      validData.push({
        organizationId: orgId,
        name: rawName,
        phone: cleanedPhone,
        email,
        company,
        city,
        product,
        previousInteraction,
        notes,
        campaignId,
        status: "PENDING",
      });
    }

    let createdCount = 0;
    if (validData.length > 0) {
      const result = await prisma.customer.createMany({
        data: validData,
      });
      createdCount = result.count;
    }

    // Update campaign status if draft
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: campaign.status === "DRAFT" ? "SCHEDULED" : undefined,
      },
    });

    logger.info(
      { campaignId, organizationId: orgId, importedCount: createdCount, failedCount: importErrors.length },
      "Bulk customer CSV upload completed"
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalRows: customers.length,
        imported: createdCount,
        failed: importErrors.length,
      },
      errors: importErrors,
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "POST customers error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
