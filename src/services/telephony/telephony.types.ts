export interface InitiateCallParams {
  orgId: string;
  customerId: string;
  campaignId: string;
  to: string;
  idempotencyKey?: string; // Stable attempt key to prevent duplicates
}

export interface TelephonyCallResult {
  success: boolean;
  providerCallId?: string;
  error?: string;
}

export interface TelephonyProvider {
  /**
   * Triggers an outbound call to the target number
   */
  initiateCall(params: InitiateCallParams, config: any): Promise<TelephonyCallResult>;

  /**
   * Tests connection validity using credentials
   */
  testConnection(config: any): Promise<{ success: boolean; error?: string }>;
}
