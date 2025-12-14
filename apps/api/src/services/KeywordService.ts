/**
 * Keyword Service Implementation
 * 
 * Generates unique keyword codes for games.
 * Handles collision detection and retry logic.
 */

import crypto from 'crypto';

import type { IGameReader } from '../repositories/IGameRepository';

import type { IKeywordGenerator } from './IKeywordService';

const KEYWORD_LENGTH = 6;
const KEYWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous chars (I, O, 0, 1)
const MAX_RETRIES = 10;

export class KeywordService implements IKeywordGenerator {
  constructor(private gameReader: IGameReader) {}

  validateKeyword(keyword: string): boolean {
    // Must be exactly KEYWORD_LENGTH characters
    if (keyword.length !== KEYWORD_LENGTH) {
      return false;
    }

    // Must contain only allowed characters
    const regex = new RegExp(`^[${KEYWORD_CHARS}]+$`);
    return regex.test(keyword);
  }

  async generateUniqueKeyword(): Promise<string> {
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      const keyword = this.generateRandomKeyword();

      // Check if keyword already exists
      const exists = await this.gameReader.existsKeywordCode(keyword);
      if (!exists) {
        return keyword;
      }

      attempts++;
    }

    // If we've exhausted retries, throw error
    throw new Error(`Failed to generate unique keyword after ${MAX_RETRIES} attempts`);
  }

  private generateRandomKeyword(): string {
    const randomBytes = crypto.randomBytes(KEYWORD_LENGTH);
    let keyword = '';

    for (let i = 0; i < KEYWORD_LENGTH; i++) {
      const byte = randomBytes[i];
      if (byte === undefined) {
        throw new Error('Failed to generate random bytes');
      }
      const index = byte % KEYWORD_CHARS.length;
      keyword += KEYWORD_CHARS[index];
    }

    return keyword;
  }
}
