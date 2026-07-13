import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        ...(campaignId
          ? {
              customer: {
                campaignId,
              },
            }
          : {}),
      },
      orderBy: { dateTime: "asc" },
      include: {
        customer: {
          include: {
            campaign: {
              select: { name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    logger.error({ err: error.message }, "GET appointments error");
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
    const { customerId, callLogId, dateTime, status } = body;

    if (!customerId || !dateTime) {
      return NextResponse.json(
        { error: "Customer ID and date/time are required." },
        { status: 400 }
      );
    }

    // Verify customer ownership
    const customerExists = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId }
    });
    if (!customerExists) {
      return NextResponse.json({ error: "Customer access denied" }, { status: 403 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        organizationId: orgId,
        customerId,
        callLogId: callLogId || null,
        dateTime: new Date(dateTime),
        status: status || "CONFIRMED",
      },
      include: {
        customer: true,
      },
    });

    // Create a system notification about this appointment
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        title: "Appointment Booked",
        message: `Appointment scheduled for ${appointment.customer.name} on ${new Date(
          dateTime
        ).toLocaleString()}`,
        type: "SUCCESS",
        callLogId: callLogId || null,
      },
    });

    logger.info({ appointmentId: appointment.id, organizationId: orgId }, "Booked appointment");
    return NextResponse.json(appointment, { status: 201 });
  } catch (error: any) {
    logger.error({ err: error.message }, "POST appointment error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
