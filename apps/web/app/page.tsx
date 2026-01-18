'use client';

import Link from 'next/link';
import { Suspense } from 'react';

import { WelcomeModal } from '@/components/v2/WelcomeModal';
import { useWelcomeModal } from '@/hooks/useWelcomeModal';

function HomePageContent() {
  const { isOpen, closeModal, dontShowAgain, isVeoReferral } = useWelcomeModal();

  return (
    <>
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={isOpen}
        onClose={closeModal}
        onDontShowAgain={dontShowAgain}
        isVeoReferral={isVeoReferral}
      />

      <div className="min-h-screen flex flex-col" data-testid="container-home">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 gradient-primary">
        <div className="text-center max-w-3xl mx-auto space-y-6 sm:space-y-8">
          {/* Logo/Brand */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              FieldView<span className="text-primary">.Live</span>
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground text-balance">
              Protective streaming for youth sports — free or paid
            </p>
          </div>

          {/* Project Nature */}
          <div className="max-w-2xl mx-auto space-y-3 text-sm sm:text-base text-muted-foreground">
            <p data-testid="text-project-nature">
              FieldView.Live helps stream owners share a single stable link for a team or event. You can keep streams{' '}
              <strong className="text-foreground">free</strong> or enable a{' '}
              <strong className="text-foreground">pay-per-view</strong> paywall for fundraising and monetization.
            </p>
            <p data-testid="text-project-nature-security">
              Payments are processed securely by Square; FieldView.Live does <strong className="text-foreground">not</strong>{' '}
              store card numbers or CVVs.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
            <Link
              href="/owners/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 hover:shadow-xl active:scale-[0.98]"
              data-testid="link-owner-login"
            >
              Owner Login
            </Link>
            <Link
              href="/owners/register"
              className="inline-flex items-center justify-center rounded-lg border-2 border-primary bg-background px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-primary hover:bg-primary/5 transition-all duration-200 active:scale-[0.98]"
              data-testid="link-owner-register"
            >
              Get Started
            </Link>
            <Link
              href="/watch/STORMFC/2010"
              className="inline-flex items-center justify-center rounded-lg bg-background/70 px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-foreground shadow hover:bg-background/90 transition-all duration-200 active:scale-[0.98]"
              data-testid="link-demo-watch-stormfc-2010"
            >
              View Demo Stream
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-8 sm:pt-12">
            <div className="p-4 sm:p-6 rounded-xl bg-card border shadow-sm">
              <div className="text-3xl sm:text-4xl mb-2">📺</div>
              <h3 className="font-semibold text-base sm:text-lg mb-1">Live Streaming</h3>
              <p className="text-sm text-muted-foreground">
                High-quality streams for youth sports events
              </p>
            </div>
            <div className="p-4 sm:p-6 rounded-xl bg-card border shadow-sm">
              <div className="text-3xl sm:text-4xl mb-2">💳</div>
              <h3 className="font-semibold text-base sm:text-lg mb-1">Easy Payments</h3>
              <p className="text-sm text-muted-foreground">
                Apple Pay, Google Pay, and saved cards
              </p>
            </div>
            <div className="p-4 sm:p-6 rounded-xl bg-card border shadow-sm">
              <div className="text-3xl sm:text-4xl mb-2">🔗</div>
              <h3 className="font-semibold text-base sm:text-lg mb-1">Stable Links</h3>
              <p className="text-sm text-muted-foreground">
                Share once, use for every game
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="pt-6 sm:pt-8 text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/direct/StormFC"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
                data-testid="link-direct-stormfc"
              >
                Direct Stream Link (POC)
              </Link>
              <Link
                href="/direct/tchs"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
                data-testid="link-tchs"
              >
                TCHS Stream (Direct)
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t bg-muted/30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FieldView.Live. All rights reserved.</p>
          <div className="flex gap-4 sm:gap-6">
            <Link href="/owners/login" className="hover:text-foreground transition-colors" data-testid="link-footer-owner-portal">
              Owner Portal
            </Link>
            <Link href="/console" className="hover:text-foreground transition-colors" data-testid="link-footer-admin">
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
