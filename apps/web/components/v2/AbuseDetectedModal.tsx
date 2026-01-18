/**
 * AbuseDetectedModal Component
 *
 * Compassionate popup shown when multi-account abuse is detected.
 * Offers a one-time pass with understanding message.
 *
 * Messages:
 * - abuse_detected: First detection, offer one-time pass
 * - final_block: Pass already used, hard block
 */

'use client';

import { BottomSheet } from './primitives/BottomSheet';
import { TouchButton } from './primitives/TouchButton';

export type AbuseMessage = 'abuse_detected' | 'final_block' | 'first_warning';

export interface AbuseDetectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptPass: () => void;
  message: AbuseMessage;
  linkedAccountCount?: number;
  oneTimePassAvailable: boolean;
}

/**
 * Get modal content based on abuse message type
 */
function getModalContent(
  message: AbuseMessage,
  linkedAccountCount: number,
  oneTimePassAvailable: boolean
) {
  switch (message) {
    case 'first_warning':
      return {
        icon: '👋',
        title: 'Already Have an Account?',
        description: `It looks like you already have ${linkedAccountCount} account${
          linkedAccountCount > 1 ? 's' : ''
        } associated with this device. If you need multiple accounts for different purposes (e.g., personal + organization), you can continue.`,
        showPass: false,
        canProceed: true,
        ctaText: 'Continue Registration',
      };

    case 'abuse_detected':
      return {
        icon: '💝',
        title: 'We See You',
        description: `Hey, we noticed this device has ${linkedAccountCount} accounts already registered. We get it — maybe you're in a tight spot, or circumstances are difficult right now.

We don't want to rob parents of being able to see their kids play. That's why we built this.

We'll let you off this one time. But could you please consider paying for the service when you're able? It helps us keep the lights on for everyone.`,
        showPass: oneTimePassAvailable,
        canProceed: oneTimePassAvailable,
        ctaText: 'I Understand — Continue',
      };

    case 'final_block':
      return {
        icon: '🛑',
        title: 'Account Limit Reached',
        description: `We've already given a one-time pass to this device. We truly want to help, but we need to maintain fairness for all our users.

If you believe this is an error, or you have a legitimate need for multiple accounts, please contact our support team — we're happy to help!`,
        showPass: false,
        canProceed: false,
        ctaText: 'Contact Support',
      };

    default:
      return {
        icon: '⚠️',
        title: 'Notice',
        description: 'Please contact support for assistance.',
        showPass: false,
        canProceed: false,
        ctaText: 'Close',
      };
  }
}

export function AbuseDetectedModal({
  isOpen,
  onClose,
  onAcceptPass,
  message,
  linkedAccountCount = 0,
  oneTimePassAvailable,
}: AbuseDetectedModalProps) {
  const content = getModalContent(message, linkedAccountCount, oneTimePassAvailable);

  const handleCta = () => {
    if (content.canProceed) {
      onAcceptPass();
    } else {
      // Contact support - could open mailto or support page
      window.open('mailto:support@fieldview.live', '_blank');
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.7]}
      enableDrag={true}
      aria-labelledby="abuse-modal-title"
    >
      <div
        className="space-y-6 pb-6 text-center"
        data-testid="modal-abuse-detected"
      >
        {/* Icon */}
        <div className="text-5xl">{content.icon}</div>

        {/* Title */}
        <h2
          id="abuse-modal-title"
          className="text-xl font-bold text-[var(--fv-color-text-primary)]"
        >
          {content.title}
        </h2>

        {/* Description */}
        <div className="text-sm text-[var(--fv-color-text-secondary)] whitespace-pre-line text-left px-4">
          {content.description}
        </div>

        {/* Account count badge */}
        {linkedAccountCount > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--fv-color-bg-elevated)] text-xs text-[var(--fv-color-text-muted)]">
            <span>Accounts on this device:</span>
            <span className="font-bold text-[var(--fv-color-warning)]">
              {linkedAccountCount}
            </span>
          </div>
        )}

        {/* CTAs */}
        <div className="space-y-3 pt-4">
          <TouchButton
            variant={content.canProceed ? 'primary' : 'secondary'}
            size="lg"
            fullWidth
            onClick={handleCta}
            data-testid="btn-abuse-cta"
          >
            {content.ctaText}
          </TouchButton>

          <TouchButton
            variant="ghost"
            size="md"
            fullWidth
            onClick={onClose}
            data-testid="btn-abuse-close"
          >
            {content.canProceed ? 'Cancel' : 'Close'}
          </TouchButton>
        </div>

        {/* Reassurance message */}
        {content.showPass && (
          <p className="text-xs text-[var(--fv-color-text-muted)] px-4">
            🤝 We trust you. No judgment, no questions asked.
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
