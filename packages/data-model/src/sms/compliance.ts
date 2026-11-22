/** SMS compliance copy and constants shared by API and web. */

export const SMS_BRAND = 'FieldView.Live';

export const SMS_PURPOSE_PHRASE = 'game alerts, score updates, and payment links';

export const SMS_PURPOSE_VIEWER_NOTIFICATIONS = 'viewer_notifications';

export const SMS_CONSENT_TEXT_VERSION = '2026-10-01';

export const SMS_SUPPORT_EMAIL = 'support@fieldview.live';

export const SMS_HELP_ONE_LINER =
  'game and score alerts for youth sports streams.';

export const SMS_INBOUND_WEBHOOK_URL = 'https://api.fieldview.live/api/webhooks/twilio';

export const SMS_STATUS_WEBHOOK_URL = 'https://api.fieldview.live/api/webhooks/twilio/status';

export const SMS_PRIVACY_VERBATIM_THIRD_PARTY =
  'We do not share, sell, or provide your mobile phone number or SMS opt-in data to third parties or affiliates for marketing or promotional purposes.';

export const SMS_STOP_KEYWORDS = [
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'REVOKE',
  'OPTOUT',
] as const;

export const SMS_START_KEYWORDS = ['START', 'UNSTOP'] as const;

export const SMS_HELP_KEYWORDS = ['HELP', 'INFO'] as const;

export const SMS_YES_KEYWORD = 'YES';

/** FieldView's own toll-free text number. Shown in the owner portal for text commands. */
export const SMS_PRODUCT_NUMBER_E164 = '+18773435308';

/** Consent purpose for an owner login that texts commands to FieldView (coach text commands). */
export const SMS_PURPOSE_OWNER_COMMANDS = 'owner_commands';

export const SMS_OWNER_CONSENT_TEXT_VERSION = '2026-11-21';

/**
 * Shown beside "Get my code" in the owner portal. The coach's own verified LINK text is the
 * opt-in, so consent is recorded when that text arrives, not when the form is submitted.
 */
export function buildOwnerCommandsConsentPlain(): string {
  return `By linking, you agree to get text replies from ${SMS_BRAND} at this number when you text commands. Message frequency varies. Message and data rates may apply. Reply STOP to pause, HELP for help.`;
}

export function buildSmsOptInLabelHtml(): string {
  return `Text me ${SMS_PURPOSE_PHRASE} from ${SMS_BRAND}. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase. See our SMS Terms and Privacy Policy.`;
}

export function buildSmsOptInLabelPlain(): string {
  return `Text me ${SMS_PURPOSE_PHRASE} from ${SMS_BRAND}. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.`;
}

export function buildInboundHelpTwimlBody(): string {
  return `${SMS_BRAND}: ${SMS_HELP_ONE_LINER} Help: ${SMS_SUPPORT_EMAIL}. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out.`;
}

export function prefixSmsBrand(body: string): string {
  const prefix = `${SMS_BRAND}:`;
  const trimmed = body.trimStart();
  if (trimmed.startsWith(prefix)) {
    return trimmed;
  }
  return `${prefix} ${trimmed}`;
}
