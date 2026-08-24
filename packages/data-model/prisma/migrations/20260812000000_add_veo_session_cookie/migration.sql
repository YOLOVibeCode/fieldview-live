-- Browser-free Veo connector: store a seeded auth.veo.co `_session` cookie
-- (encrypted) so the runtime mints access tokens over pure HTTP (no Chromium).
ALTER TABLE "VeoIntegration" ADD COLUMN "veoSessionCookieEncrypted" TEXT;
