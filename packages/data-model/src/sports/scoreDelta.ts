/**
 * Score Delta Calculator
 *
 * Translates a confirmed ISportEventType + team selection into
 * home / away score increments. Implements IScoreDeltaCalculator.
 */

import type { ISportEventType, IScoreDeltaCalculator, TeamSide } from './types';

export class ScoreDeltaCalculator implements IScoreDeltaCalculator {
  resolveScoreDelta(
    event: ISportEventType,
    team: TeamSide | null
  ): { homeDelta: number; awayDelta: number } {
    if (event.scoreAppliesTo === 'none' || event.pointsDelta === 0) {
      return { homeDelta: 0, awayDelta: 0 };
    }

    if (event.teamScoped && team === null) {
      throw new Error(
        `Event "${event.id}" is team-scoped; a team (home|away) must be provided.`
      );
    }

    const n = event.pointsDelta;

    if (event.scoreAppliesTo === 'selected_team') {
      return team === 'home'
        ? { homeDelta: n, awayDelta: 0 }
        : { homeDelta: 0, awayDelta: n };
    }

    // scoreAppliesTo === 'opponent'  (own-goal, etc.)
    return team === 'home'
      ? { homeDelta: 0, awayDelta: n }
      : { homeDelta: n, awayDelta: 0 };
  }
}
