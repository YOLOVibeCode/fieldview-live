/**
 * Build a stable, single-segment stream key for the TCHS API.
 *
 * Format: tchs-YYYYMMDD-teamSlug
 */
export function buildTchsStreamKey(input: { date: string; team: string }): string {
  const date = (input.date || '').trim();
  const team = (input.team || '').trim();

  if (!/^\d{8}$/.test(date)) {
    throw new Error('Invalid date (expected YYYYMMDD)');
  }

  const teamSlug = team
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!teamSlug) {
    throw new Error('Invalid team');
  }

  return `tchs-${date}-${teamSlug}`;
}


