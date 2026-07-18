/**
 * DirectStream Repository Interface (ISP: minimal read interface)
 *
 * Provides only the fields needed by consuming services.
 */

export interface IDirectStreamTitleReader {
  getTitleById(id: string): Promise<{ title: string } | null>;
}
