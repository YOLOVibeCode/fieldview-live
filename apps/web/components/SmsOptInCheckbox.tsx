'use client';

import { SMS_BRAND, SMS_PURPOSE_PHRASE } from '@fieldview/data-model';
import Link from 'next/link';

interface SmsOptInCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SmsOptInCheckbox({ checked, onChange, disabled }: SmsOptInCheckboxProps) {
  return (
    <div className="space-y-1 rounded-md border border-border/60 p-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          data-testid="checkbox-sms-opt-in"
          className="mt-1 h-4 w-4 shrink-0"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label="Opt in to SMS notifications"
        />
        <span>
          Text me {SMS_PURPOSE_PHRASE} from {SMS_BRAND}. Message frequency varies. Message and data rates
          may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See our{' '}
          <Link href="/terms#sms" className="underline underline-offset-2">
            SMS Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
    </div>
  );
}
