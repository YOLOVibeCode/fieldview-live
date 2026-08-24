import type { ISportEventType } from './types';

export interface NarrationInput {
  /** e.g. `'home'` | `'away'` | null for neutral events */
  team: 'home' | 'away' | null;
  /** e.g. `'Eagles'` */
  teamName?: string;
  /** jersey number 0-99 */
  jerseyNumber?: number | null;
  /** detail option id, e.g. `'run'` | `'header'` */
  detail?: string | null;
  /** numeric detail value, e.g. `18` yards */
  detailValue?: number | null;
}

/**
 * Build a human-readable narration line from a confirmed game event and
 * optional crowd-supplied detail. Pure function — no side effects.
 *
 * Examples:
 *   "Touchdown — Eagles, #12, 18-yd run"
 *   "Goal — Hawks, #9, header"
 *   "Field Goal — Eagles, 42-yd"
 *   "Touchdown — Eagles"   (no detail supplied)
 *   "End of Quarter"       (neutral event, no team)
 */
export function buildNarration(
  eventType: ISportEventType,
  input: NarrationInput
): string {
  const parts: string[] = [eventType.label];

  if (input.teamName) {
    let teamPart = input.teamName;
    if (input.jerseyNumber != null) {
      teamPart += `, #${input.jerseyNumber}`;
    }
    parts.push(teamPart);
  } else if (input.jerseyNumber != null) {
    parts.push(`#${input.jerseyNumber}`);
  }

  const detailLabel = resolveDetailLabel(eventType, input.detail, input.detailValue);
  if (detailLabel) {
    parts.push(detailLabel);
  }

  return parts.join(' — ');
}

function resolveDetailLabel(
  eventType: ISportEventType,
  detailId: string | null | undefined,
  detailValue: number | null | undefined
): string | null {
  if (!detailId) {
    // No chip picked; but maybe a standalone value (field_goal distance only)
    if (detailValue != null && eventType.detailOptions?.length === 1) {
      const opt = eventType.detailOptions[0];
      if (opt.unit === 'yards') return `${detailValue}-yd`;
    }
    return null;
  }

  const option = eventType.detailOptions?.find((d) => d.id === detailId);
  if (!option) return null;

  if (option.unit === 'yards' && detailValue != null) {
    return `${detailValue}-yd ${option.label.toLowerCase()}`;
  }

  return option.label.toLowerCase();
}
