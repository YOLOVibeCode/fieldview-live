import { describe, it, expect } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  parseDirectKey,
  rewriteHierarchicalDirectPath,
  rewriteHierarchicalPublicDirectPath,
} from '../direct-slug';

describe('parseDirectKey', () => {
  it('parses a simple slug', () => {
    expect(parseDirectKey('dev-free-stream')).toEqual({
      key: 'dev-free-stream',
      parentSlug: 'dev-free-stream',
    });
  });

  it('parses parent/event and %2F-encoded slugs', () => {
    expect(parseDirectKey('dentondiablos/soccer-2008-20260325')).toEqual({
      key: 'dentondiablos/soccer-2008-20260325',
      parentSlug: 'dentondiablos',
      eventSlug: 'soccer-2008-20260325',
    });
    expect(parseDirectKey('dentondiablos%2Fsoccer-2008-20260325')).toEqual({
      key: 'dentondiablos/soccer-2008-20260325',
      parentSlug: 'dentondiablos',
      eventSlug: 'soccer-2008-20260325',
    });
  });
});

describe('rewriteHierarchicalDirectPath', () => {
  function run(url: string): string {
    const req = { url } as Request;
    rewriteHierarchicalDirectPath(req, {} as Response, (() => undefined) as NextFunction);
    return req.url;
  }

  it('rewrites parent/event/leaf to a single encoded slug segment', () => {
    expect(run('/dentondiablos/soccer-2008-20260325/unlock-admin')).toBe(
      '/dentondiablos%2Fsoccer-2008-20260325/unlock-admin'
    );
    expect(run('/dentondiablos/soccer-2008-20260325/scoreboard/stream?x=1')).toBe(
      '/dentondiablos%2Fsoccer-2008-20260325/scoreboard/stream?x=1'
    );
  });

  it('leaves simple /:slug/leaf paths alone', () => {
    expect(run('/e2e-test/bootstrap')).toBe('/e2e-test/bootstrap');
    expect(run('/dev-free-stream/unlock-admin')).toBe('/dev-free-stream/unlock-admin');
  });
});

describe('rewriteHierarchicalPublicDirectPath', () => {
  it('rewrites nested public viewer paths', () => {
    const req = { url: '/direct/dentondiablos/soccer-2008-20260325/viewer/unlock' } as Request;
    rewriteHierarchicalPublicDirectPath(req, {} as Response, (() => undefined) as NextFunction);
    expect(req.url).toBe('/direct/dentondiablos%2Fsoccer-2008-20260325/viewer/unlock');
  });
});
