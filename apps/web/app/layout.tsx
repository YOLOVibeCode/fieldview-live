import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/v2/tokens.css'; // v2 Design Tokens
import { VersionDisplay } from '@/components/VersionDisplay';
import { TrakletWidget } from '@/components/TrakletWidget';
import { EnvChrome } from '@/lib/env-chrome/EnvChrome';
import { badgeFor } from '@/lib/env-chrome/chrome';
import { resolveServerEnv } from '@/lib/env-chrome/resolve';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const BASE_TITLE = 'FieldView.Live';
const BASE_DESCRIPTION = 'Monetization platform for youth sports live streaming';

export function generateMetadata(): Metadata {
  const env = resolveServerEnv();
  const badge = badgeFor(env);
  const prefix = badge ? `[${badge.short}] ` : '';
  return {
    title: {
      template: `${prefix}%s`,
      default: `${prefix}${BASE_TITLE}`,
    },
    description: BASE_DESCRIPTION,
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: BASE_TITLE,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const env = resolveServerEnv();
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen`}>
        <EnvChrome env={env} />
        {children}
        <TrakletWidget />
        <VersionDisplay />
      </body>
    </html>
  );
}
