import { SMS_BRAND } from '@fieldview/data-model';

const SMS_RELAY_BASE = (process.env.NOCTUSOFT_SMS_RELAY_BASE_URL || 'https://api.twilio.noctusoft.com').replace(
  /\/+$/,
  '',
);
const RELAY_API_KEY = process.env.NOCTUSOFT_API_KEY || '';

export const SMS_RELAY_SEND_PATH = '/sms/send';

export type RelaySmsSendResult =
  | { ok: true; messageSid: string }
  | { ok: false; code: number; message: string; optedOut: boolean };

export async function relaySmsSend(to: string, body: string): Promise<RelaySmsSendResult> {
  if (!RELAY_API_KEY) {
    throw new Error('NOCTUSOFT_API_KEY is not configured');
  }

  let res: Response;
  try {
    res = await fetch(`${SMS_RELAY_BASE}${SMS_RELAY_SEND_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RELAY_API_KEY}`,
      },
      body: JSON.stringify({ to, body }),
    });
  } catch (error) {
    throw new Error(`Relay SMS request failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (res.status >= 200 && res.status < 300) {
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message_sid?: string };
    const messageSid = data.sid || data.message_sid || '';
    return { ok: true, messageSid };
  }

  const payload = (await res.json().catch(() => ({}))) as {
    error?: boolean;
    code?: number;
    message?: string;
  };
  const code = typeof payload.code === 'number' ? payload.code : res.status;
  const message = payload.message || `Relay SMS failed (${res.status})`;
  return { ok: false, code, message, optedOut: code === 21610 };
}

export function ensureBrandPrefix(body: string): string {
  const prefix = `${SMS_BRAND}:`;
  const trimmed = body.trimStart();
  if (trimmed.startsWith(prefix)) {
    return trimmed;
  }
  return `${prefix} ${trimmed}`;
}
