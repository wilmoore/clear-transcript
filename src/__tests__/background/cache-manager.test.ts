import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCachedTranscript,
  cacheTranscript,
  removeCacheEntry,
  clearCache,
  getCacheStats,
  cleanupExpiredEntries,
} from '@/background/cache-manager';
import { resetChromeMock, setStorageData, getStorageData } from '../mocks/chrome';
import type { TranscriptResult, TierAResult } from '@/types';

describe('cache-manager', () => {
  beforeEach(() => {
    resetChromeMock();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockTierAResult: TierAResult = {
    tier: 'A',
    source: 'youtube-captions',
    transcript: [
      { start: 0, duration: 2, text: 'Hello' },
      { start: 2, duration: 3, text: 'World' },
    ],
    language: 'en',
    languageName: 'English',
    availableTracks: [],
  };

  describe('cacheTranscript', () => {
    it('should cache transcript with correct structure', async () => {
      await cacheTranscript('video123', mockTierAResult);

      const storage = getStorageData('local');
      expect(storage['ct_cache_video123']).toBeDefined();

      const entry = storage['ct_cache_video123'] as {
        videoId: string;
        result: TranscriptResult;
        timestamp: number;
        ttl: number;
      };
      expect(entry.videoId).toBe('video123');
      expect(entry.result.tier).toBe('A');
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('should set correct TTL for Tier A (24 hours)', async () => {
      await cacheTranscript('video123', mockTierAResult);

      const storage = getStorageData('local');
      const entry = storage['ct_cache_video123'] as { ttl: number };
      expect(entry.ttl).toBe(24 * 60 * 60 * 1000);
    });

    it('should set correct TTL for Tier B (1 hour)', async () => {
      const tierBResult: TranscriptResult = {
        tier: 'B',
        source: 'fallback-partial',
        isPartial: true,
        description: 'Test description',
      };

      await cacheTranscript('video123', tierBResult);

      const storage = getStorageData('local');
      const entry = storage['ct_cache_video123'] as { ttl: number };
      expect(entry.ttl).toBe(1 * 60 * 60 * 1000);
    });

    it('should set correct TTL for Tier C (7 days)', async () => {
      const tierCResult: TranscriptResult = {
        tier: 'C',
        source: 'server-transcription',
        transcript: [],
        status: 'complete',
      };

      await cacheTranscript('video123', tierCResult);

      const storage = getStorageData('local');
      const entry = storage['ct_cache_video123'] as { ttl: number };
      expect(entry.ttl).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should update cache index', async () => {
      await cacheTranscript('video123', mockTierAResult);

      const storage = getStorageData('local');
      const index = storage['ct_cache_index'] as Record<string, number>;
      expect(index['video123']).toBeDefined();
    });
  });

  describe('getCachedTranscript', () => {
    it('should return null for non-existent cache entry', async () => {
      const result = await getCachedTranscript('nonexistent');
      expect(result).toBeNull();
    });

    it('should return cached transcript when valid', async () => {
      await cacheTranscript('video123', mockTierAResult);

      const result = await getCachedTranscript('video123');
      expect(result).not.toBeNull();
      expect(result?.tier).toBe('A');
    });

    it('should return null for expired cache entry', async () => {
      await cacheTranscript('video123', mockTierAResult);

      // Advance time past TTL
      vi.advanceTimersByTime(25 * 60 * 60 * 1000); // 25 hours

      const result = await getCachedTranscript('video123');
      expect(result).toBeNull();
    });
  });

  describe('removeCacheEntry', () => {
    it('should remove cache entry', async () => {
      await cacheTranscript('video123', mockTierAResult);
      await removeCacheEntry('video123');

      const result = await getCachedTranscript('video123');
      expect(result).toBeNull();
    });

    it('should update cache index on removal', async () => {
      await cacheTranscript('video123', mockTierAResult);
      await removeCacheEntry('video123');

      const storage = getStorageData('local');
      const index = storage['ct_cache_index'] as Record<string, number>;
      expect(index['video123']).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('should remove all cache entries', async () => {
      await cacheTranscript('video1', mockTierAResult);
      await cacheTranscript('video2', mockTierAResult);
      await clearCache();

      expect(await getCachedTranscript('video1')).toBeNull();
      expect(await getCachedTranscript('video2')).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return correct entry count', async () => {
      await cacheTranscript('video1', mockTierAResult);
      await cacheTranscript('video2', mockTierAResult);

      const stats = await getCacheStats();
      expect(stats.entries).toBe(2);
    });

    it('should return 0 for empty cache', async () => {
      const stats = await getCacheStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should remove expired entries', async () => {
      // Cache with Tier B (1 hour TTL)
      const tierBResult: TranscriptResult = {
        tier: 'B',
        source: 'fallback-partial',
        isPartial: true,
      };

      await cacheTranscript('expiring', tierBResult);
      await cacheTranscript('fresh', mockTierAResult);

      // Advance time past Tier B TTL but not Tier A
      vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

      const removed = await cleanupExpiredEntries();
      expect(removed).toBe(1);

      expect(await getCachedTranscript('expiring')).toBeNull();
      expect(await getCachedTranscript('fresh')).not.toBeNull();
    });

    it('should return 0 when no expired entries', async () => {
      await cacheTranscript('fresh', mockTierAResult);

      const removed = await cleanupExpiredEntries();
      expect(removed).toBe(0);
    });
  });
});
