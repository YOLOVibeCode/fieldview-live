import { describe, it, expect } from 'vitest';
import type { ViewerIdentity } from '@/entities/ViewerIdentity';

describe('ViewerIdentity', () => {
  it('has required email field', () => {
    const viewer: ViewerIdentity = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    expect(viewer.email).toBe('test@example.com');
  });
  
  it('allows optional phoneE164', () => {
    const viewer: ViewerIdentity = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      phoneE164: '+15551234567',
      smsOptOut: false,
      createdAt: new Date(),
    };
    
    expect(viewer.phoneE164).toBe('+15551234567');
  });
});
