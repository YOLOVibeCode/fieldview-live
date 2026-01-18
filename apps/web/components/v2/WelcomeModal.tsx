/**
 * WelcomeModal Component
 *
 * Veo Discovery welcome popup that explains monetization.
 * Shown to first-time visitors or via ?ref=veo query param.
 *
 * Content:
 * 1. Welcome message (Veo camera context)
 * 2. Use cases (coaches, schools, fundraising)
 * 3. 3-step tutorial
 * 4. Pricing/ROI metrics
 * 5. CTA to get started
 */

'use client';

import Link from 'next/link';
import { useState } from 'react';

import { BottomSheet } from './primitives/BottomSheet';
import { TouchButton } from './primitives/TouchButton';

// Pricing constants (for metrics display)
const VEO_CAMERA_COST = 999; // $999 Veo Cam 3
const VEO_LIVE_MONTHLY = 65; // $65/month Veo Live subscription
const SUGGESTED_GAME_PRICE = 499; // $4.99 suggested price per game (in cents)
const PLATFORM_FEE_PERCENT = 10; // 10% platform fee

export interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain: () => void;
  isVeoReferral?: boolean;
}

/**
 * Calculate games needed to recoup costs
 */
function calculateBreakeven(
  totalCost: number,
  pricePerGame: number,
  viewersPerGame: number
): number {
  const netPerGame = pricePerGame * (1 - PLATFORM_FEE_PERCENT / 100) * viewersPerGame;
  return Math.ceil(totalCost / netPerGame);
}

export function WelcomeModal({
  isOpen,
  onClose,
  onDontShowAgain,
  isVeoReferral = false,
}: WelcomeModalProps) {
  const [dontShow, setDontShow] = useState(false);

  const handleClose = () => {
    if (dontShow) {
      onDontShowAgain();
    } else {
      onClose();
    }
  };

  // Calculate ROI metrics
  const firstYearCost = VEO_CAMERA_COST + VEO_LIVE_MONTHLY * 12; // Camera + 1 year
  const priceInDollars = SUGGESTED_GAME_PRICE / 100;
  const avgViewers = 15; // Assumption: 15 paying viewers per game
  const gamesForCamera = calculateBreakeven(VEO_CAMERA_COST, priceInDollars, avgViewers);
  const gamesForYearCost = calculateBreakeven(firstYearCost, priceInDollars, avgViewers);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      snapPoints={[0.92]}
      enableDrag={true}
      aria-labelledby="welcome-modal-title"
    >
      <div
        className="space-y-6 pb-6"
        data-testid="modal-welcome"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-4xl">📹</div>
          <h2
            id="welcome-modal-title"
            className="text-2xl font-bold text-[var(--fv-color-text-primary)]"
          >
            Welcome to FieldView.Live!
          </h2>
          {isVeoReferral && (
            <p className="text-[var(--fv-color-text-secondary)]">
              Hey! You probably saw us on the field with you. 👋
            </p>
          )}
        </div>

        {/* Value Proposition */}
        <div className="bg-[var(--fv-color-bg-secondary)] rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-[var(--fv-color-text-primary)] flex items-center gap-2">
            💰 Monetize Your Veo Live Stream
          </h3>
          <p className="text-sm text-[var(--fv-color-text-secondary)]">
            Turn your Veo Live subscription into a revenue stream! Unlike sharing
            directly from Veo (where anyone with the link can watch), FieldView.Live
            gives you:
          </p>
          <ul className="text-sm text-[var(--fv-color-text-secondary)] space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-[var(--fv-color-accent)]">✓</span>
              <span>
                <strong className="text-[var(--fv-color-text-primary)]">IP-locked links</strong> — each
                purchase works for one household only
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--fv-color-accent)]">✓</span>
              <span>
                <strong className="text-[var(--fv-color-text-primary)]">Built-in paywall</strong> — Apple
                Pay, Google Pay, and cards
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--fv-color-accent)]">✓</span>
              <span>
                <strong className="text-[var(--fv-color-text-primary)]">
                  Direct payments to you
                </strong>{' '}
                — via your Square account
              </span>
            </li>
          </ul>
        </div>

        {/* Use Cases */}
        <div className="space-y-3">
          <h3 className="font-semibold text-[var(--fv-color-text-primary)]">
            Perfect for:
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--fv-color-bg-elevated)] rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🏈</div>
              <p className="text-sm font-medium text-[var(--fv-color-text-primary)]">
                Coaches
              </p>
              <p className="text-xs text-[var(--fv-color-text-muted)]">
                Recoup camera costs
              </p>
            </div>
            <div className="bg-[var(--fv-color-bg-elevated)] rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">🏫</div>
              <p className="text-sm font-medium text-[var(--fv-color-text-primary)]">
                Schools
              </p>
              <p className="text-xs text-[var(--fv-color-text-muted)]">
                Team fundraising
              </p>
            </div>
            <div className="bg-[var(--fv-color-bg-elevated)] rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">⚽</div>
              <p className="text-sm font-medium text-[var(--fv-color-text-primary)]">
                Clubs
              </p>
              <p className="text-xs text-[var(--fv-color-text-muted)]">
                Offset subscription
              </p>
            </div>
            <div className="bg-[var(--fv-color-bg-elevated)] rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">👨‍👩‍👧</div>
              <p className="text-sm font-medium text-[var(--fv-color-text-primary)]">
                Parents
              </p>
              <p className="text-xs text-[var(--fv-color-text-muted)]">
                Share premium access
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Tutorial */}
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--fv-color-text-primary)]">
            Get Started in 3 Steps:
          </h3>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fv-color-primary-500)] text-white flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-medium text-[var(--fv-color-text-primary)]">
                  Create Your Account
                </p>
                <p className="text-sm text-[var(--fv-color-text-secondary)]">
                  Sign up and connect your Square account to receive payments.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fv-color-primary-500)] text-white flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-[var(--fv-color-text-primary)]">
                  Create a Game Event
                </p>
                <p className="text-sm text-[var(--fv-color-text-secondary)]">
                  Set your price, enable the paywall, and paste your HLS stream URL
                  from Veo Live.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--fv-color-primary-500)] text-white flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-medium text-[var(--fv-color-text-primary)]">
                  Share Your Link
                </p>
                <p className="text-sm text-[var(--fv-color-text-secondary)]">
                  Send the link to your team. Parents pay, you get paid instantly
                  via Square.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ROI Metrics */}
        <div className="bg-[var(--fv-color-bg-secondary)] rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-[var(--fv-color-text-primary)] flex items-center gap-2">
            📊 Break-Even Calculator
          </h3>
          <p className="text-xs text-[var(--fv-color-text-muted)]">
            At ${priceInDollars.toFixed(2)}/viewer × {avgViewers} viewers/game:
          </p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-[var(--fv-color-accent)]">
                {gamesForCamera}
              </p>
              <p className="text-xs text-[var(--fv-color-text-secondary)]">
                Games to cover camera
              </p>
              <p className="text-xs text-[var(--fv-color-text-muted)]">
                (${VEO_CAMERA_COST})
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--fv-color-accent)]">
                {gamesForYearCost}
              </p>
              <p className="text-xs text-[var(--fv-color-text-secondary)]">
                Games for full 1st year
              </p>
              <p className="text-xs text-[var(--fv-color-text-muted)]">
                (camera + Veo Live)
              </p>
            </div>
          </div>
        </div>

        {/* Veo Live Requirement Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-200">
              Veo Live Subscription Required
            </p>
            <p className="text-xs text-[var(--fv-color-text-secondary)]">
              FieldView.Live requires an active Veo Live subscription
              (${VEO_LIVE_MONTHLY}/month) to stream. We use your Veo HLS stream
              URL.
            </p>
          </div>
        </div>

        {/* Free Tier Info */}
        <div className="text-center text-sm text-[var(--fv-color-text-secondary)]">
          <p>
            🎁 <strong>Try it free!</strong> Create up to 5 free games (no paywall)
            to test the platform.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Link href="/owners/register" className="block">
            <TouchButton
              variant="primary"
              size="lg"
              fullWidth
              data-testid="btn-get-started"
              onClick={handleClose}
            >
              Get Started — It&apos;s Free
            </TouchButton>
          </Link>

          <TouchButton
            variant="ghost"
            size="md"
            fullWidth
            onClick={handleClose}
            data-testid="btn-maybe-later"
          >
            Maybe Later
          </TouchButton>
        </div>

        {/* Don't show again checkbox */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <input
            type="checkbox"
            id="dont-show-again"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--fv-color-border)]"
            data-testid="checkbox-dont-show"
          />
          <label
            htmlFor="dont-show-again"
            className="text-sm text-[var(--fv-color-text-muted)]"
          >
            Don&apos;t show this again
          </label>
        </div>
      </div>
    </BottomSheet>
  );
}
