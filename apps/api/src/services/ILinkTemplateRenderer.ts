/**
 * Link Template Renderer Interface (ISP)
 *
 * Single responsibility: render canonical paths from presets and variables.
 */

export type LinkPresetId = 'preset_a' | 'preset_b' | 'preset_c';

export interface RenderPresetInput {
  presetId: LinkPresetId;
  orgShortName: string;
  teamSlug?: string;
  ageYear?: string; // e.g., '2010'
  urlKey?: string;
}

export interface ILinkTemplateRenderer {
  /**
   * Render canonical path from preset template and variables.
   */
  renderPreset(input: RenderPresetInput): string;

  /**
   * Get preset template by ID.
   */
  getPresetTemplate(presetId: LinkPresetId): string;
}


