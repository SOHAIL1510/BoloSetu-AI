import { analyzeCall } from "./call-analysis.service";

/**
 * Classifies lead status based on post-call dialog audits.
 * Invokes the core Call Analysis pipeline to audit and update parameters.
 */
export async function classifyLead(orgId: string, callLogId: string): Promise<any> {
  return analyzeCall(orgId, callLogId);
}
