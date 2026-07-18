/**
 * Link Template Renderer Unit Tests (TDD)
 */

import { describe, it, expect } from 'vitest';
import { LinkTemplateRenderer } from '@/services/LinkTemplateRenderer';

describe('LinkTemplateRenderer', () => {
  const renderer = new LinkTemplateRenderer();

  describe('renderPreset', () => {
    it('should render preset_a template correctly', () => {
      const path = renderer.renderPreset({
        presetId: 'preset_a',
        orgShortName: 'STORMFC',
        ageYear: '2010',
      });
      expect(path).toBe('/stormfc/2010');
    });

    it('should render preset_b template correctly', () => {
      const path = renderer.renderPreset({
        presetId: 'preset_b',
        orgShortName: 'STORMFC',
        ageYear: '2010',
        urlKey: '202501301430',
      });
      expect(path).toBe('/stormfc/2010/202501301430');
    });

    it('should render preset_c template correctly', () => {
      const path = renderer.renderPreset({
        presetId: 'preset_c',
        orgShortName: 'STORMFC',
        teamSlug: '2010',
        urlKey: '202501301430',
      });
      expect(path).toBe('/stormfc/2010/202501301430');
    });

    it('should throw error if preset_a missing ageYear', () => {
      expect(() => {
        renderer.renderPreset({
          presetId: 'preset_a',
          orgShortName: 'STORMFC',
        });
      }).toThrow('Preset A requires ageYear');
    });

    it('should throw error if preset_b missing required fields', () => {
      expect(() => {
        renderer.renderPreset({
          presetId: 'preset_b',
          orgShortName: 'STORMFC',
          ageYear: '2010',
        });
      }).toThrow('Preset B requires ageYear and urlKey');
    });

    it('should throw error if preset_c missing required fields', () => {
      expect(() => {
        renderer.renderPreset({
          presetId: 'preset_c',
          orgShortName: 'STORMFC',
          urlKey: '202501301430',
        });
      }).toThrow('Preset C requires teamSlug and urlKey');
    });

    it('should lowercase org short name', () => {
      const path = renderer.renderPreset({
        presetId: 'preset_a',
        orgShortName: 'STORMFC',
        ageYear: '2010',
      });
      expect(path).toBe('/stormfc/2010');
    });
  });

  describe('getPresetTemplate', () => {
    it('should return correct template for preset_a', () => {
      const template = renderer.getPresetTemplate('preset_a');
      expect(template).toBe('/{org}/{ageYear}');
    });

    it('should return correct template for preset_b', () => {
      const template = renderer.getPresetTemplate('preset_b');
      expect(template).toBe('/{org}/{ageYear}/{urlKey}');
    });

    it('should return correct template for preset_c', () => {
      const template = renderer.getPresetTemplate('preset_c');
      expect(template).toBe('/{org}/{teamSlug}/{urlKey}');
    });
  });
});

