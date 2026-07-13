import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface GroundingContext {
  contextText: string;
  hasDocs: boolean;
}

/**
 * Retrieves grounding documents scoped strictly by organization ID and campaign ID.
 * Multi-tenant safety: Institute A cannot read Institute B documents.
 */
export async function getCampaignGrounding(
  orgId: string,
  campaignId: string
): Promise<GroundingContext> {
  try {
    const docs = await prisma.knowledgeBase.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { campaignId: campaignId },
          { campaignId: null }, // Global organization documents
        ],
      },
    });

    if (!docs || docs.length === 0) {
      return { contextText: "", hasDocs: false };
    }

    let contextText = "\nUse the following verified company information to answer questions. Do not make up answers not found in this documentation:\n";
    docs.forEach((doc) => {
      // Avoid raw binary PDF metadata strings
      if (doc.contentText && !doc.contentText.startsWith("%PDF")) {
        contextText += `Document [${doc.name}]: ${doc.contentText}\n`;
      }
    });

    return { contextText, hasDocs: true };
  } catch (error: any) {
    logger.error({ err: error.message, orgId, campaignId }, "RAG grounding retrieval failed");
    return { contextText: "", hasDocs: false };
  }
}
