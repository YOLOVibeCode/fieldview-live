/**
 * Sport Registry
 *
 * Singleton that aggregates all sport configs and implements ISportRegistryReader.
 * Import `sportRegistry` wherever you need to look up a sport or event type.
 */

import { baseballConfig } from './configs/baseball';
import { basketballConfig } from './configs/basketball';
import { footballConfig } from './configs/football';
import { genericConfig } from './configs/generic';
import { hockeyConfig } from './configs/hockey';
import { lacrosseConfig } from './configs/lacrosse';
import { soccerConfig } from './configs/soccer';
import { volleyballConfig } from './configs/volleyball';
import type { ISportConfig, ISportEventType, ISportRegistryReader } from './types';

const ALL_CONFIGS: readonly ISportConfig[] = [
  soccerConfig,
  footballConfig,
  basketballConfig,
  lacrosseConfig,
  baseballConfig,
  volleyballConfig,
  hockeyConfig,
  genericConfig,
];

/** The exhaustive set of valid sport id strings. */
export const SPORT_IDS = ALL_CONFIGS.map((s) => s.id);

class SportRegistry implements ISportRegistryReader {
  private readonly byId: ReadonlyMap<string, ISportConfig>;

  constructor(configs: readonly ISportConfig[]) {
    this.byId = new Map(configs.map((c) => [c.id, c]));
  }

  listSports(): readonly ISportConfig[] {
    return ALL_CONFIGS;
  }

  getSport(id: string): ISportConfig {
    const config = this.byId.get(id);
    if (!config) {
      throw new Error(`Unknown sport: "${id}". Valid ids: ${[...this.byId.keys()].join(', ')}`);
    }
    return config;
  }

  getEventType(sportId: string, eventTypeId: string): ISportEventType {
    const sport = this.getSport(sportId);
    const et = sport.eventTypes.find((e) => e.id === eventTypeId);
    if (!et) {
      throw new Error(
        `Unknown event type "${eventTypeId}" for sport "${sportId}". ` +
        `Valid ids: ${sport.eventTypes.map((e) => e.id).join(', ')}`
      );
    }
    return et;
  }
}

export const sportRegistry: ISportRegistryReader = new SportRegistry(ALL_CONFIGS);
