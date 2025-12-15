/**
 * Admin Authentication Service Interfaces (ISP)
 * 
 * Segregated interfaces for admin authentication operations.
 */

export interface AdminLoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
}

export interface AdminLoginResponse {
  adminAccount: {
    id: string;
    email: string;
    role: string;
  };
  sessionToken: string;
  mfaRequired: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

/**
 * Reader Interface (ISP)
 */
export interface IAdminAuthReader {
  login(request: AdminLoginRequest): Promise<AdminLoginResponse>;
}

/**
 * Writer Interface (ISP)
 */
export interface IAdminAuthWriter {
  setupMfa(adminAccountId: string): Promise<MfaSetupResponse>;
  verifyMfa(adminAccountId: string, token: string): Promise<boolean>;
}
