import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('OpenAPI Contract Tests', () => {
  it('OpenAPI spec file exists', () => {
    const specPath = join(__dirname, '../../../openapi/api.yaml');
    const spec = readFileSync(specPath, 'utf-8');
    expect(spec).toBeTruthy();
    expect(spec).toContain('openapi: 3.1.0');
  });

  it('OpenAPI spec has required schemas', () => {
    const schemasPath = join(__dirname, '../../../openapi/components/schemas.yaml');
    const schemas = readFileSync(schemasPath, 'utf-8');
    
    // Check for required schemas
    expect(schemas).toContain('ViewerIdentity');
    expect(schemas).toContain('StreamSource');
    expect(schemas).toContain('CheckoutCreateRequest');
    expect(schemas).toContain('Game');
    expect(schemas).toContain('Purchase');
  });

  it('CheckoutCreateRequest requires viewerEmail', () => {
    const schemasPath = join(__dirname, '../../../openapi/components/schemas.yaml');
    const schemas = readFileSync(schemasPath, 'utf-8');
    
    // Verify viewerEmail is required
    const checkoutSchema = schemas.split('CheckoutCreateRequest:')[1]?.split('ErrorResponse:')[0] || '';
    expect(checkoutSchema).toContain('viewerEmail');
    expect(checkoutSchema).toContain('required:');
  });
});
