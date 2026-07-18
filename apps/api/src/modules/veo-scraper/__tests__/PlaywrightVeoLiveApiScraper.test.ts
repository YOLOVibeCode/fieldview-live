import { describe, it, expect } from 'vitest';
import {
  mapStreamHistoryToRows,
  isLiveRow,
  type StreamHistoryResponse,
} from '../implementations/PlaywrightVeoLiveApiScraper';

// Shape mirrors a real GET /api/v2/live/stream-history/clubs/<club>/stream-history response.
const SAMPLE: StreamHistoryResponse = {
  result: [
    {
      firmware_version: '3.9.8',
      additional_info: {
        home_team: 'FC Dutchmen Surf NPL 2010',
        away_team: 'FC United.vs Masson',
        status: 'finished',
        average_upload_speed: 468107.21,
        is_external: false,
        broadcast_link: 'https://stream.mux.com/gPwKhTvi5Jiz02Dk13nUUDqOxM016OvQGtHhVnip2j1018.m3u8',
      },
    },
    {
      firmware_version: '3.9.8',
      additional_info: {
        home_team: 'Denton Diablos 2010B',
        away_team: '',
        status: 'live',
        broadcast_link: 'https://stream.mux.com/LIVE0abcDEF123.m3u8',
      },
    },
  ],
};

describe('mapStreamHistoryToRows', () => {
  it('maps additional_info fields onto VeoMatchRow', () => {
    const rows = mapStreamHistoryToRows(SAMPLE);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      matchName: 'FC Dutchmen Surf NPL 2010 vs FC United.vs Masson',
      status: 'finished',
      streamUrl: 'https://stream.mux.com/gPwKhTvi5Jiz02Dk13nUUDqOxM016OvQGtHhVnip2j1018.m3u8',
      uploadSpeed: 468107.21,
      firmware: '3.9.8',
    });
  });

  it('uses home team alone as the match name when away is blank', () => {
    const rows = mapStreamHistoryToRows(SAMPLE);
    expect(rows[1].matchName).toBe('Denton Diablos 2010B');
  });

  it('returns [] for null / empty / malformed payloads', () => {
    expect(mapStreamHistoryToRows(null)).toEqual([]);
    expect(mapStreamHistoryToRows({})).toEqual([]);
    expect(mapStreamHistoryToRows({ result: [] })).toEqual([]);
  });

  it('tolerates missing additional_info', () => {
    const rows = mapStreamHistoryToRows({ result: [{ firmware_version: '4.0' }] });
    expect(rows[0]).toEqual({
      matchName: '',
      status: '',
      streamUrl: null,
      uploadSpeed: null,
      firmware: '4.0',
    });
  });
});

describe('isLiveRow', () => {
  it('excludes finished streams', () => {
    const [finished] = mapStreamHistoryToRows(SAMPLE);
    expect(isLiveRow(finished)).toBe(false);
  });

  it('includes a non-finished stream that has a URL', () => {
    const live = mapStreamHistoryToRows(SAMPLE)[1];
    expect(isLiveRow(live)).toBe(true);
  });

  it('excludes a non-finished stream with no URL', () => {
    expect(
      isLiveRow({ matchName: 'x', status: 'live', streamUrl: null, uploadSpeed: null, firmware: '' })
    ).toBe(false);
  });

  it('filtering the sample yields only the live, playable stream', () => {
    const live = mapStreamHistoryToRows(SAMPLE).filter(isLiveRow);
    expect(live).toHaveLength(1);
    expect(live[0].matchName).toBe('Denton Diablos 2010B');
    expect(live[0].streamUrl).toBe('https://stream.mux.com/LIVE0abcDEF123.m3u8');
  });
});
