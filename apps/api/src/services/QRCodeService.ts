/**
 * QR Code Service Implementation
 * 
 * Generates QR code URLs for game keywords.
 */

import QRCode from 'qrcode';

import type { IQRCodeGenerator } from './IQRCodeService';

const DEFAULT_BASE_URL = process.env.APP_URL || 'https://fieldview.live';
const QR_CODE_SIZE = 300;

export class QRCodeService implements IQRCodeGenerator {
  async generateQRCodeUrl(keywordCode: string, baseUrl?: string): Promise<string> {
    const url = `${baseUrl || DEFAULT_BASE_URL}/watch/${keywordCode}`;

    // Generate QR code as data URL (SVG)
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: QR_CODE_SIZE,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl;
  }
}
