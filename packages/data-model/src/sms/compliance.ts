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
