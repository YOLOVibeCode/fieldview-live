/**
 * QR Code Service Interface (ISP)
 * 
 * Focused on QR code generation.
 */

export interface IQRCodeGenerator {
  generateQRCodeUrl(keywordCode: string, baseUrl?: string): Promise<string>;
}
