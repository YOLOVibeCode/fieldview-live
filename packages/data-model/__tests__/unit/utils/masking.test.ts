import { describe, it, expect } from 'vitest';
import { maskEmail } from '@/utils/masking';

describe('maskEmail', () => {
  it('masks email correctly', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
    expect(maskEmail('jane.doe@example.com')).toBe('j***@example.com');
  });
  
  it('handles single character local part', () => {
    expect(maskEmail('a@example.com')).toBe('***@example.com');
  });
  
  it('handles invalid email gracefully', () => {
    expect(maskEmail('invalid')).toBe('***@***');
    expect(maskEmail('@example.com')).toBe('***@***');
  });
  
  it('preserves domain', () => {
    const masked = maskEmail('test@example.com');
    expect(masked).toContain('@example.com');
  });
});
