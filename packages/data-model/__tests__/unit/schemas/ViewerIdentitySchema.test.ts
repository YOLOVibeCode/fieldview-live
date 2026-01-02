import { describe, it, expect } from 'vitest';
import { ViewerIdentitySchema } from '@/schemas/ViewerIdentitySchema';

describe('ViewerIdentitySchema', () => {
  it('validates valid viewer identity with email', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    expect(() => ViewerIdentitySchema.parse(valid)).not.toThrow();
  });
  
  it('rejects missing email', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    const result = ViewerIdentitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected ViewerIdentitySchema to reject missing email');
    }
    expect(result.error.issues[0]?.path).toEqual(['email']);
  });
  
  it('rejects invalid email format', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'not-an-email',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    const result = ViewerIdentitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected ViewerIdentitySchema to reject invalid email format');
    }
    expect(result.error.issues[0]?.path).toEqual(['email']);
  });
  
  it('validates optional phoneE164 in E.164 format', () => {
    const valid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      phoneE164: '+15551234567',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    expect(() => ViewerIdentitySchema.parse(valid)).not.toThrow();
  });
  
  it('rejects invalid phoneE164 format', () => {
    const invalid = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      phoneE164: '5551234567', // Missing +
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    const result = ViewerIdentitySchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected ViewerIdentitySchema to reject invalid phoneE164 format');
    }
    expect(result.error.issues[0]?.path).toEqual(['phoneE164']);
  });
});
