import type { GameEventPayload } from '@fieldview/data-model';
import { apiRequest } from '@/lib/api-client';

export interface ReportGameEventBody {
  eventTypeId: string;
  team?: 'home' | 'away';
  clockSeconds?: number;
  jerseyNumber?: number;
  detail?: string;
  detailValue?: number;
  note?: string;
  filmTimeSeconds?: number;
}

export async function reportGameEvent(
  slug: string,
  viewerToken: string,
  body: ReportGameEventBody
): Promise<GameEventPayload> {
  return apiRequest<GameEventPayload>(`/api/direct/${encodeURIComponent(slug)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${viewerToken}` },
    body: JSON.stringify(body),
  });
}

export async function confirmGameEvent(
  slug: string,
  eventId: string,
  viewerToken: string
): Promise<GameEventPayload> {
  return apiRequest<GameEventPayload>(
    `/api/direct/${encodeURIComponent(slug)}/events/${eventId}/confirm`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewerToken}` },
    }
  );
}

export async function resolveGameEvent(
  slug: string,
  eventId: string,
  action: 'confirm' | 'reject',
  adminToken?: string
): Promise<GameEventPayload> {
  return apiRequest<GameEventPayload>(
    `/api/direct/${encodeURIComponent(slug)}/events/${eventId}/resolve`,
    {
      method: 'POST',
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
      body: JSON.stringify({ action }),
    }
  );
}

export async function subscribeScoreAlerts(
  slug: string,
  phoneE164: string
): Promise<void> {
  await apiRequest(`/api/direct/${encodeURIComponent(slug)}/score-alerts`, {
    method: 'POST',
    body: JSON.stringify({ phoneE164, consent: true }),
  });
}
