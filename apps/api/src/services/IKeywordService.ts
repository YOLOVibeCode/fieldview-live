/**
 * Keyword Service Interface (ISP)
 * 
 * Focused on keyword generation and validation.
 */

export interface IKeywordGenerator {
  generateUniqueKeyword(): Promise<string>;
  validateKeyword(keyword: string): boolean;
}
