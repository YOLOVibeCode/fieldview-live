import { describe, it, expect } from 'vitest';
import { maskEmail } from '@/utils/emailMasking';

describe('Email Masking', () => {
  it('masks email correctly (normal case)', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
  });

  it('masks email correctly (long local part)', () => {
    expect(maskEmail('johndoe@example.com')).toBe('j***@example.com');
  });

  it('masks email correctly (single character local part)', () => {
    expect(maskEmail('j@example.com')).toBe('***@example.com');
  });

  it('handles empty local part', () => {
    expect(maskEmail('@example.com')).toBe('***@***');
  });

  it('handles invalid email format', () => {
    expect(maskEmail('invalid')).toBe('***@***');
  });

  it('masks email correctly (different domain)', () => {
    expect(maskEmail('test@gmail.com')).toBe('t***@gmail.com');
  });
});
