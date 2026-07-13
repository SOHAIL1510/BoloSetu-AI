import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organizationName } = body;

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "Missing required registration parameters." },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "email_in_use", message: "Email is already registered. Please login instead." },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create Tenant Organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
      },
    });

    // Create Tenant default organization credentials settings card
    await prisma.organizationSetting.create({
      data: {
        organizationId: organization.id,
        sarvamApiKey: "",
        geminiApiKey: "",
        openaiApiKey: "",
        twilioAccountSid: "",
        twilioAuthToken: "",
        twilioPhoneNumber: "",
        publicWebhookUrl: "",
        defaultVoiceId: "meera",
        defaultLanguage: "en-IN",
      },
    });

    // Create User Admin account
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        organizationId: organization.id,
        role: "ADMIN",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    logger.info(
      { userId: user.id, organizationId: organization.id },
      "Created new SaaS organization tenant and admin user"
    );

    return NextResponse.json({
      success: true,
      user,
      message: "Organization registered successfully. You can now login.",
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "Registration error");
    return NextResponse.json({ error: error.message }, { status: 550 });
  }
}
