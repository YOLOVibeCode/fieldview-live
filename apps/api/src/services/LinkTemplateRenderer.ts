/**
 * Link Template Renderer
 *
 * Renders canonical paths from preset templates.
 */

import type { ILinkTemplateRenderer, LinkPresetId, RenderPresetInput } from './ILinkTemplateRenderer';

const PRESET_TEMPLATES: Record<LinkPresetId, string> = {
  preset_a: '/{org}/{ageYear}',
  preset_b: '/{org}/{ageYear}/{urlKey}',
  preset_c: '/{org}/{teamSlug}/{urlKey}',
};

export class LinkTemplateRenderer implements ILinkTemplateRenderer {
  renderPreset(input: RenderPresetInput): string {
    const { presetId, orgShortName, teamSlug, ageYear, urlKey } = input;
    const template = this.getPresetTemplate(presetId);

    let path = template
      .replace('{org}', orgShortName.toLowerCase())
      .replace('{ageYear}', ageYear ?? '')
      .replace('{teamSlug}', teamSlug ?? '')
      .replace('{urlKey}', urlKey ?? '');

    // Remove trailing slashes and empty segments
    path = path.replace(/\/+/g, '/').replace(/\/$/, '');

    // Validate required variables
    if (presetId === 'preset_a' && !ageYear) {
      throw new Error('Preset A requires ageYear');
    }
    if (presetId === 'preset_b' && (!ageYear || !urlKey)) {
      throw new Error('Preset B requires ageYear and urlKey');
    }
    if (presetId === 'preset_c' && (!teamSlug || !urlKey)) {
      throw new Error('Preset C requires teamSlug and urlKey');
    }

    return path;
  }

  getPresetTemplate(presetId: LinkPresetId): string {
    const template = PRESET_TEMPLATES[presetId];
    if (!template) {
      throw new Error(`Unknown preset ID: ${presetId}`);
    }
    return template;
  }
}

