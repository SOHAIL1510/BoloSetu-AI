import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/logger";

// Helper to seed mock data specifically for a new organization if they have no campaigns
async function seedMockDataIfEmpty(orgId: string) {
  const campaignCount = await prisma.campaign.count({
    where: { organizationId: orgId },
  });
  if (campaignCount > 0) return;

  logger.info({ organizationId: orgId }, "Seeding new organization with professional mock telecalling data...");

  // 1. Create Campaigns
  const camp1 = await prisma.campaign.create({
    data: {
      organizationId: orgId,
      name: "Q3 Full Stack Course Inbound Leads",
      description: "Outbound qualifying calls for students who signed up on our landing page.",
      systemPrompt: "You are an AI sales assistant calling on behalf of ABC Institute. Introduce yourself as an AI assistant. Address the customer by name. Explain our course. If interested, schedule a demo on Monday 2 PM.",
      voiceId: "meera",
      language: "hi-IN",
      status: "RUNNING",
      retryAttempts: 3,
      callTiming: "9:00 AM - 6:00 PM",
    },
  });

  const camp2 = await prisma.campaign.create({
    data: {
      organizationId: orgId,
      name: "Enterprise AI Telecalling Cold Outreach",
      description: "Reaching out to CTOs and tech leads for our corporate training programs.",
      systemPrompt: "You are an AI assistant calling on behalf of TechCorp. Pitch our enterprise training modules.",
      voiceId: "arvind",
      language: "en-IN",
      status: "PAUSED",
      retryAttempts: 2,
      callTiming: "10:00 AM - 5:00 PM",
    },
  });

  // 2. Create Customers
  const customersData = [
    { organizationId: orgId, name: "Rahul Sharma", phone: "+919876543210", email: "rahul@gmail.com", company: "Student", city: "Delhi", product: "Full Stack Development", notes: "Prefers Hindi. High intent.", campaignId: camp1.id, status: "COMPLETED" },
    { organizationId: orgId, name: "Priya Patel", phone: "+919812345678", email: "priya@yahoo.com", company: "TCS", city: "Mumbai", product: "Full Stack Development", notes: "Working professional looking for weekend batch.", campaignId: camp1.id, status: "COMPLETED" },
    { organizationId: orgId, name: "Amit Verma", phone: "+919922334455", email: "amit.v@outlook.com", company: "Freelancer", city: "Bangalore", product: "Full Stack Development", notes: "Inquired about placement cell.", campaignId: camp1.id, status: "COMPLETED" },
    { organizationId: orgId, name: "Suresh Kumar", phone: "+919555667788", email: "suresh@company.com", company: "Cognizant", city: "Chennai", product: "Corporate Training", notes: "CTO contact.", campaignId: camp2.id, status: "COMPLETED" },
    { organizationId: orgId, name: "Kiran Rao", phone: "+919444555666", email: "kiran.r@tech.com", company: "Wipro", city: "Hyderabad", product: "Corporate Training", notes: "Requested email proposal.", campaignId: camp2.id, status: "COMPLETED" },
    { organizationId: orgId, name: "Deepak Gupta", phone: "+919333222111", email: "deepak@gmail.com", company: "Student", city: "Pune", product: "Full Stack Development", notes: "Needs financial aid details.", campaignId: camp1.id, status: "PENDING" },
    { organizationId: orgId, name: "Ananya Sen", phone: "+919222111000", email: "ananya@gmail.com", company: "Student", city: "Kolkata", product: "Full Stack Development", notes: "Will discuss with parents.", campaignId: camp1.id, status: "PENDING" },
    { organizationId: orgId, name: "Vikram Singh", phone: "+919111000999", email: "vikram@gmail.com", company: "Self Employed", city: "Jaipur", product: "Full Stack Development", notes: "Incorrect number listed.", campaignId: camp1.id, status: "FAILED" },
  ];

  await prisma.customer.createMany({
    data: customersData,
  });

  const dbCustomers = await prisma.customer.findMany({
    where: { organizationId: orgId }
  });

  // 3. Create Call Logs & Appointments
  const rahul = dbCustomers.find((c) => c.name === "Rahul Sharma")!;
  const priya = dbCustomers.find((c) => c.name === "Priya Patel")!;
  const amit = dbCustomers.find((c) => c.name === "Amit Verma")!;
  const suresh = dbCustomers.find((c) => c.name === "Suresh Kumar")!;
  const kiran = dbCustomers.find((c) => c.name === "Kiran Rao")!;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const log1 = await prisma.callLog.create({
    data: {
      organizationId: orgId,
      customerId: rahul.id,
      campaignId: camp1.id,
      duration: 112,
      transcriptJSON: JSON.stringify([
        { role: "ai", text: `नमस्ते राहुल जी, मैं ABC इंस्टिट्यूट से एक AI सहायक बात कर रहा हूँ। क्या मैं आपकी रुचि फुल स्टैक वेब डेवलपमेंट कोर्स के बारे में २ मिनट बात कर सकता हूँ?`, timestamp: new Date(twoDaysAgo.getTime()) },
        { role: "customer", text: "हाँ हाँ बताइए, मैंने आपकी वेबसाइट पर फॉर्म भरा था। कोर्स की फीस क्या है?", timestamp: new Date(twoDaysAgo.getTime() + 15000) },
        { role: "ai", text: "कोर्स की फीस ४५,००० रुपये है, जिसमें १००% प्लेसमेंट असिस्टेंस और लाइव प्रोजेक्ट्स शामिल हैं। क्या आप सोमवार दोपहर २ बजे डेमो क्लास बुक करना चाहेंगे?", timestamp: new Date(twoDaysAgo.getTime() + 35000) },
        { role: "customer", text: "हाँ, सोमवार दोपहर २ बजे का समय ठीक रहेगा। मेरी सीट बुक कर दीजिये।", timestamp: new Date(twoDaysAgo.getTime() + 55000) },
        { role: "ai", text: "बहुत बढ़िया राहुल जी! मैंने सोमवार दोपहर २ बजे के डेमो सेशन के लिए आपकी सीट कन्फर्म कर दी है। आपके नंबर पर विवरण भेज दिया गया है। धन्यवाद!", timestamp: new Date(twoDaysAgo.getTime() + 75000) }
      ]),
      summary: "AI introduced course details. Customer requested a free demo class. AI confirmed demo booking for Monday at 2 PM.",
      leadStatus: "APPOINTMENT_BOOKED",
      sentimentScore: 92.0,
      recordingUrl: "mock_recording_1.wav",
      createdAt: twoDaysAgo,
    },
  });

  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
  nextMonday.setHours(14, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      organizationId: orgId,
      customerId: rahul.id,
      callLogId: log1.id,
      dateTime: nextMonday,
      status: "CONFIRMED",
    },
  });

  // Call 2 - Very Interested
  await prisma.callLog.create({
    data: {
      organizationId: orgId,
      customerId: priya.id,
      campaignId: camp1.id,
      duration: 85,
      transcriptJSON: JSON.stringify([
        { role: "ai", text: "नमस्ते प्रिया जी, मैं ABC इंस्टिट्यूट से एक AI सहायक बात कर रहा हूँ। क्या मैं आपसे फुल स्टैक डेवलपमेंट कोर्स के बारे में बात कर सकता हूँ?", timestamp: new Date(yesterday.getTime()) },
        { role: "customer", text: "हाय, हाँ बिल्कुल। मुझे जावास्क्रिप्ट और रिएक्ट सीखना है। क्या आप वीकेंड बैच प्रदान करते हैं?", timestamp: new Date(yesterday.getTime() + 15000) },
        { role: "ai", text: "हाँ प्रिया जी! हमारे पास विशेष रूप से कामकाजी पेशेवरों के लिए शनिवार और रविवार को वीकेंड बैच हैं। क्या मैं आपको व्हाट्सएप पर ब्रोशर भेज सकता हूँ?", timestamp: new Date(yesterday.getTime() + 35000) },
        { role: "customer", text: "हाँ, प्लीज मुझे मेरी ईमेल या व्हाट्सएप पर सिलेबस और फीस की डिटेल्स भेज दीजिये। मैं देखकर बताउंगी।", timestamp: new Date(yesterday.getTime() + 55000) },
        { role: "ai", text: "जी ज़रूर! मैंने विवरण भेज दिए हैं। आप चेक कर सकती हैं। धन्यवाद!", timestamp: new Date(yesterday.getTime() + 75000) }
      ]),
      summary: "Customer requested weekend batch information. AI sent the syllabus and brochure via WhatsApp.",
      leadStatus: "VERY_INTERESTED",
      sentimentScore: 85.0,
      recordingUrl: "mock_recording_2.wav",
      createdAt: yesterday,
    },
  });

  // Call 3 - Callback Requested
  await prisma.callLog.create({
    data: {
      organizationId: orgId,
      customerId: amit.id,
      campaignId: camp1.id,
      duration: 35,
      transcriptJSON: JSON.stringify([
        { role: "ai", text: "नमस्ते अमित जी, मैं ABC इंस्टिट्यूट से एक AI सहायक बात कर रहा हूँ। क्या मैं आपकी रुचि फुल स्टैक डेवलपमेंट कोर्स के बारे में बात कर सकता हूँ?", timestamp: new Date() },
        { role: "customer", text: "अरे, अभी मैं ऑफिस की मीटिंग में हूँ। क्या आप मुझे शाम को ५ बजे कॉल कर सकते हैं?", timestamp: new Date(Date.now() + 10000) },
        { role: "ai", text: "निश्चित रूप से अमित जी! मैं शाम को ५ बजे आपको दोबारा कॉल करूँगा। धन्यवाद!", timestamp: new Date(Date.now() + 20000) }
      ]),
      summary: "Customer was busy in a meeting and requested a callback at 5:00 PM today.",
      leadStatus: "CALLBACK_REQUESTED",
      sentimentScore: 60.0,
      recordingUrl: "mock_recording_3.wav",
      createdAt: new Date(),
    },
  });

  // Call 4 - Not Interested
  await prisma.callLog.create({
    data: {
      organizationId: orgId,
      customerId: suresh.id,
      campaignId: camp2.id,
      duration: 42,
      transcriptJSON: JSON.stringify([
        { role: "ai", text: "Hello Suresh, I'm an AI assistant calling from TechCorp. I wanted to tell you about our new corporate technical training packages.", timestamp: yesterday },
        { role: "customer", text: "Hi, actually we already have an internal training department and aren't looking for third party vendors right now.", timestamp: new Date(yesterday.getTime() + 10000) },
        { role: "ai", text: "Understood, Suresh. Thank you for clarifying. Have a great day!", timestamp: new Date(yesterday.getTime() + 20000) }
      ]),
      summary: "CTO stated they have internal systems and do not require external training vendors.",
      leadStatus: "NOT_INTERESTED",
      sentimentScore: 40.0,
      recordingUrl: "mock_recording_4.wav",
      createdAt: yesterday,
    },
  });

  // Call 5 - Wrong Number
  await prisma.callLog.create({
    data: {
      organizationId: orgId,
      customerId: kiran.id,
      campaignId: camp2.id,
      duration: 15,
      transcriptJSON: JSON.stringify([
        { role: "ai", text: "Hello Kiran, I am an AI assistant calling on behalf of TechCorp.", timestamp: new Date() },
        { role: "customer", text: "Wrong number, this is not Kiran.", timestamp: new Date(Date.now() + 5000) },
        { role: "ai", text: "Apologies for the inconvenience. Goodbye.", timestamp: new Date(Date.now() + 10000) }
      ]),
      summary: "Person answered and stated it was a wrong number.",
      leadStatus: "WRONG_NUMBER",
      sentimentScore: 30.0,
      recordingUrl: "mock_recording_5.wav",
      createdAt: new Date(),
    },
  });

  // Create notifications
  await prisma.notification.createMany({
    data: [
      { organizationId: orgId, title: "Demo Appointment Booked", message: "Rahul Sharma scheduled a demo for next Monday at 2:00 PM.", type: "SUCCESS" },
      { organizationId: orgId, title: "High-Value Lead Qualified", message: "Priya Patel expressed weekend batch interest with 85% positive sentiment.", type: "SUCCESS" },
      { organizationId: orgId, title: "Callback Scheduled", message: "Amit Verma requested a callback at 5:00 PM today.", type: "INFO" },
    ],
  });
}

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    const orgId = session?.user?.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Seed mock data specifically for this organization if empty
    await seedMockDataIfEmpty(orgId);

    // 1. Calculate General Aggregations
    const totalCustomers = await prisma.customer.count({ where: { organizationId: orgId } });
    const callsCompleted = await prisma.customer.count({ where: { organizationId: orgId, status: "COMPLETED" } });
    const callsPending = await prisma.customer.count({ where: { organizationId: orgId, status: "PENDING" } });
    const callsFailed = await prisma.customer.count({ where: { organizationId: orgId, status: "FAILED" } });

    // Lead statuses
    const interestedLeads = await prisma.callLog.count({
      where: { organizationId: orgId, leadStatus: { in: ["INTERESTED", "VERY_INTERESTED"] } },
    });
    const followUpRequired = await prisma.callLog.count({
      where: { organizationId: orgId, leadStatus: "CALLBACK_REQUESTED" },
    });
    const appointmentsBooked = await prisma.appointment.count({
      where: { organizationId: orgId, status: "CONFIRMED" },
    });

    const callLogs = await prisma.callLog.findMany({ where: { organizationId: orgId } });
    const totalDuration = callLogs.reduce((acc, log) => acc + log.duration, 0);
    const averageCallDuration = callLogs.length > 0 ? Math.round(totalDuration / callLogs.length) : 0;

    const totalSentiment = callLogs.reduce((acc, log) => acc + log.sentimentScore, 0);
    const averageSentiment = callLogs.length > 0 ? Math.round(totalSentiment / callLogs.length) : 50;

    // Rates
    const successCount = await prisma.callLog.count({
      where: { organizationId: orgId, leadStatus: { in: ["INTERESTED", "VERY_INTERESTED", "APPOINTMENT_BOOKED", "CALLBACK_REQUESTED"] } },
    });
    const successRate = callLogs.length > 0 ? Math.round((successCount / callLogs.length) * 100) : 0;
    const conversionRate = totalCustomers > 0 ? Math.round((appointmentsBooked / totalCustomers) * 100) : 0;

    // 2. Fetch Notifications
    const notifications = await prisma.notification.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // 3. Compile Chart Data
    // A. Daily Calls (last 7 days)
    const dailyCalls = [];
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const count = await prisma.callLog.count({
        where: {
          organizationId: orgId,
          createdAt: {
            gte: d,
            lt: nextD,
          },
        },
      });

      dailyCalls.push({
        day: weekday[d.getDay()],
        calls: count,
      });
    }

    // B. Hourly Calls (Dynamic distribution of calls placed today)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const callsToday = await prisma.callLog.findMany({
      where: {
        organizationId: orgId,
        createdAt: {
          gte: startOfToday,
        },
      },
      select: { createdAt: true },
    });

    const businessHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const hourlyCalls = businessHours.map((hour) => {
      const hourStr = hour === 12 
        ? "12:00 PM" 
        : hour > 12 
          ? `${String(hour - 12).padStart(2, "0")}:00 PM` 
          : `${String(hour).padStart(2, "0")}:00 AM`;
      
      const count = callsToday.filter((log) => {
        const logHour = new Date(log.createdAt).getHours();
        return logHour === hour;
      }).length;

      return {
        hour: hourStr,
        calls: count,
      };
    });

    // C. Lead Conversion Funnel
    const leadConversion = [
      { name: "Imported Leads", value: totalCustomers },
      { name: "Connected Calls", value: callLogs.length },
      { name: "Interested Leads", value: successCount },
      { name: "Appointments Booked", value: appointmentsBooked },
    ];

    // D. Customer Sentiment (Dynamic counts based entirely on database records)
    const positiveCount = callLogs.filter((l) => l.sentimentScore >= 75).length;
    const neutralCount = callLogs.filter((l) => l.sentimentScore >= 45 && l.sentimentScore < 75).length;
    const negativeCount = callLogs.filter((l) => l.sentimentScore < 45).length;

    const customerSentiment = [
      { name: "Positive (>75%)", value: positiveCount },
      { name: "Neutral (45-75%)", value: neutralCount },
      { name: "Negative (<45%)", value: negativeCount },
    ];

    // E. Campaign Performance
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      take: 5,
      include: {
        _count: {
          select: { customers: true, callLogs: true },
        },
      },
    });

    const campaignPerformance = await Promise.all(
      campaigns.map(async (c) => {
        const booked = await prisma.callLog.count({
          where: {
            organizationId: orgId,
            campaignId: c.id,
            leadStatus: "APPOINTMENT_BOOKED",
          },
        });
        const interested = await prisma.callLog.count({
          where: {
            organizationId: orgId,
            campaignId: c.id,
            leadStatus: { in: ["INTERESTED", "VERY_INTERESTED"] },
          },
        });

        return {
          name: c.name.length > 20 ? c.name.substring(0, 17) + "..." : c.name,
          completed: c._count.callLogs,
          interested: interested,
          appointments: booked,
        };
      })
    );

    return NextResponse.json({
      stats: {
        totalCustomers,
        callsCompleted,
        callsPending,
        callsFailed,
        interestedLeads,
        followUpRequired,
        appointmentsBooked,
        averageCallDuration,
        averageSentiment,
        successRate,
        conversionRate,
      },
      notifications,
      charts: {
        dailyCalls,
        hourlyCalls,
        leadConversion,
        customerSentiment,
        campaignPerformance,
      },
    });
  } catch (error: any) {
    logger.error({ err: error.message }, "GET dashboard-stats error");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
