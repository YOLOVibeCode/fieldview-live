/**
 * Square Service Interfaces (ISP)
 * 
 * Segregated interfaces for Square Connect onboarding and payments.
 */

export interface SquareConnectUrlData {
  connectUrl: string;
  state: string; // CSRF token for callback verification
}

/**
 * Reader Interface (ISP)
 * 
 * Focused on reading Square account information.
 */
export interface ISquareReader {
  getAccountInfo(merchantId: string): Promise<{ merchantId: string; status: string } | null>;
}

/**
 * Writer Interface (ISP)
 * 
 * Focused on Square Connect operations.
 */
export interface ISquareWriter {
  generateConnectUrl(ownerAccountId: string, returnUrl: string): Promise<SquareConnectUrlData>;
  handleConnectCallback(code: string, state: string): Promise<{ merchantId: string }>;
}
