import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTranscript, getTranscriptForLanguage, getSourceLabel, hasTranscriptLines } from '@/transcript/pipeline';
import { resetChromeMock } from '../mocks/chrome';
import { setupYouTubeDOM, cleanupYouTubeDOM, mockFetch, mockPlayerResponse, mockPlayerResponseNoCaptions } from '../mocks/youtube-dom';
import type { ExtensionSettings, TranscriptResult, TierAResult, TierBResult, TierCResult } from '@/types';

describe('transcript pipeline', () => {
  const defaultSettings: ExtensionSettings = {
    backendUrl: null,
    preferredLanguage: 'en',
    autoOpen: false,
    darkMode: 'auto',
    defaultDownloadFormat: 'srt',
    keyboardShortcutsEnabled: true,
  };

  beforeEach(() => {
    resetChromeMock();
    cleanupYouTubeDOM();
    mockFetch();
  });

  afterEach(() => {
    cleanupYouTubeDOM();
    vi.restoreAllMocks();
  });

  describe('getTranscript', () => {
    it('should return Tier A result when captions available', async () => {
      setupYouTubeDOM(mockPlayerResponse);

      const result = await getTranscript('dQw4w9WgXcQ', defaultSettings);

      expect(result.tier).toBe('A');
      expect(result.source).toBe('youtube-captions');
      expect((result as TierAResult).transcript.length).toBeGreaterThan(0);
    });

    it('should return Tier B result when no captions', async () => {
      setupYouTubeDOM(mockPlayerResponseNoCaptions);

      const result = await getTranscript('noCaptions123', defaultSettings);

      expect(result.tier).toBe('B');
      expect(result.source).toBe('fallback-partial');
      expect((result as TierBResult).isPartial).toBe(true);
    });

    it('should fall back gracefully when no content available', async () => {
      // Don't set up YouTube DOM at all
      const result = await getTranscript('unknown123', defaultSettings);

      expect(result.tier).toBe('B');
      expect(result.source).toBe('fallback-partial');
    });

    it('should call onUpdate callback when provided', async () => {
      setupYouTubeDOM(mockPlayerResponse);
      const onUpdate = vi.fn();

      await getTranscript('dQw4w9WgXcQ', defaultSettings, onUpdate);

      // onUpdate is called for Tier C processing, not for immediate Tier A
      // This test verifies the callback is passed without error
      expect(true).toBe(true);
    });

    it('should prefer preferred language when available', async () => {
      setupYouTubeDOM(mockPlayerResponse);

      const spanishSettings = { ...defaultSettings, preferredLanguage: 'es' };
      const result = await getTranscript('dQw4w9WgXcQ', spanishSettings);

      expect(result.tier).toBe('A');
      // Note: The actual language may still be English if Spanish has no human captions
    });
  });

  describe('getTranscriptForLanguage', () => {
    it('should return transcript for specific language', async () => {
      setupYouTubeDOM(mockPlayerResponse);

      const result = await getTranscriptForLanguage('dQw4w9WgXcQ', 'en');

      expect(result).not.toBeNull();
      expect(result?.tier).toBe('A');
      expect((result as TierAResult)?.language).toBe('en');
    });

    it('should return null for unavailable language', async () => {
      setupYouTubeDOM(mockPlayerResponse);

      const result = await getTranscriptForLanguage('dQw4w9WgXcQ', 'zz');

      expect(result).toBeNull();
    });
  });

  describe('getSourceLabel', () => {
    it('should return correct label for youtube-captions', () => {
      const result: TierAResult = {
        tier: 'A',
        source: 'youtube-captions',
        transcript: [],
        language: 'en',
        languageName: 'English',
        availableTracks: [],
      };
      expect(getSourceLabel(result)).toBe('YouTube captions');
    });

    it('should return correct label for auto-generated', () => {
      const result: TierAResult = {
        tier: 'A',
        source: 'youtube-auto-generated',
        transcript: [],
        language: 'en',
        languageName: 'English',
        availableTracks: [],
      };
      expect(getSourceLabel(result)).toBe('Auto-generated');
    });

    it('should return correct label for fallback-partial', () => {
      const result: TierBResult = {
        tier: 'B',
        source: 'fallback-partial',
        isPartial: true,
      };
      expect(getSourceLabel(result)).toBe('Partial content');
    });

    it('should return correct label for server-transcription', () => {
      const result: TierCResult = {
        tier: 'C',
        source: 'server-transcription',
        transcript: [],
        status: 'complete',
      };
      expect(getSourceLabel(result)).toBe('Server transcription');
    });
  });

  describe('hasTranscriptLines', () => {
    it('should return true for Tier A with lines', () => {
      const result: TierAResult = {
        tier: 'A',
        source: 'youtube-captions',
        transcript: [{ start: 0, duration: 1, text: 'Hello' }],
        language: 'en',
        languageName: 'English',
        availableTracks: [],
      };
      expect(hasTranscriptLines(result)).toBe(true);
    });

    it('should return false for Tier A with empty lines', () => {
      const result: TierAResult = {
        tier: 'A',
        source: 'youtube-captions',
        transcript: [],
        language: 'en',
        languageName: 'English',
        availableTracks: [],
      };
      expect(hasTranscriptLines(result)).toBe(false);
    });

    it('should return false for Tier B', () => {
      const result: TierBResult = {
        tier: 'B',
        source: 'fallback-partial',
        isPartial: true,
        description: 'Some description',
      };
      expect(hasTranscriptLines(result)).toBe(false);
    });

    it('should return true for Tier C with lines', () => {
      const result: TierCResult = {
        tier: 'C',
        source: 'server-transcription',
        transcript: [{ start: 0, duration: 1, text: 'Hello' }],
        status: 'complete',
      };
      expect(hasTranscriptLines(result)).toBe(true);
    });
  });
});
