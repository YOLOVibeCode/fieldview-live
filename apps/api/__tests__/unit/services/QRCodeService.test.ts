import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QRCodeService } from '@/services/QRCodeService';

// Mock qrcode
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test-qr-code'),
  },
}));

describe('QRCodeService', () => {
  let service: QRCodeService;

  beforeEach(() => {
    service = new QRCodeService();
  });

  describe('generateQRCodeUrl', () => {
    it('generates QR code data URL', async () => {
      const qrCode = await service.generateQRCodeUrl('ABCDEF');

      expect(qrCode).toBe('data:image/png;base64,test-qr-code');
    });

    it('uses default base URL when not provided', async () => {
      const QRCode = await import('qrcode');
      await service.generateQRCodeUrl('ABCDEF');

      expect(QRCode.default.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('/watch/ABCDEF'),
        expect.any(Object)
      );
    });

    it('uses custom base URL when provided', async () => {
      const QRCode = await import('qrcode');
      await service.generateQRCodeUrl('ABCDEF', 'https://custom.example.com');

      expect(QRCode.default.toDataURL).toHaveBeenCalledWith(
        'https://custom.example.com/watch/ABCDEF',
        expect.any(Object)
      );
    });
  });
});
