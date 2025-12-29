import { apiClient } from '../lib/api';

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerificationRequest {
  token: string;
  backupCode?: string;
}

export interface MFASetupRequest {
  secret: string;
  token: string;
}

class MFAService {
  // Generate TOTP secret and QR code for setup
  async setupMFA(): Promise<MFASetupResponse> {
    try {
      const response = await apiClient.setupMFA();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    } catch (error) {
      throw new Error('Failed to setup MFA');
    }
  }

  // Verify TOTP token during setup
  async verifyMFASetup(request: MFASetupRequest): Promise<{ success: boolean; backupCodes: string[] }> {
    try {
      const response = await apiClient.verifyMFASetup(request);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    } catch (error) {
      throw new Error('Failed to verify MFA setup');
    }
  }

  // Verify MFA token during login
  async verifyMFA(request: MFAVerificationRequest): Promise<{ success: boolean; user: any; tokens: any }> {
    try {
      const response = await apiClient.verifyMFA(request);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    } catch (error) {
      throw new Error('Invalid MFA token');
    }
  }

  // Disable MFA
  async disableMFA(token: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.disableMFA(token);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    } catch (error) {
      throw new Error('Failed to disable MFA');
    }
  }

  // Generate new backup codes
  async generateBackupCodes(): Promise<{ backupCodes: string[] }> {
    try {
      const response = await apiClient.generateBackupCodes();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data!;
    } catch (error) {
      throw new Error('Failed to generate backup codes');
    }
  }

  // Check if user has MFA enabled
  async checkMFAStatus(): Promise<{ mfaEnabled: boolean; hasBackupCodes: boolean }> {
    try {
      const response = await apiClient.getMFAStatus();
      if (response.error) {
        return { mfaEnabled: false, hasBackupCodes: false };
      }
      return response.data!;
    } catch (error) {
      return { mfaEnabled: false, hasBackupCodes: false };
    }
  }

  // Generate QR code URL for manual entry
  generateQRCodeUrl(secret: string, accountName: string, issuer: string = 'SkillSwap'): string {
    const encodedSecret = secret.replace(/ /g, '');
    const encodedAccountName = encodeURIComponent(accountName);
    const encodedIssuer = encodeURIComponent(issuer);
    
    return `otpauth://totp/${encodedIssuer}:${encodedAccountName}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }

  // Validate TOTP token format
  validateTokenFormat(token: string): boolean {
    return /^\d{6}$/.test(token);
  }

  // Validate backup code format
  validateBackupCodeFormat(code: string): boolean {
    return /^[A-Z0-9]{8}$/.test(code);
  }
}

export const mfaService = new MFAService();