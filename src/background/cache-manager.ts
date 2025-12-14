import type { TranscriptResult, CacheEntry, CACHE_TTL } from '@/types';

const CACHE_KEY_PREFIX = 'ct_cache_';
const CACHE_INDEX_KEY = 'ct_cache_index';

/**
 * Cache manager for transcript results
 * Uses chrome.storage.local for persistence
 */

/**
 * Get cached transcript result
 */
export async function getCachedTranscript(
  videoId: string
): Promise<TranscriptResult | null> {
  const key = `${CACHE_KEY_PREFIX}${videoId}`;

  try {
    const result = await chrome.storage.local.get(key);
    const entry = result[key] as CacheEntry | undefined;

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      await removeCacheEntry(videoId);
      return null;
    }

    return entry.result;
  } catch (error) {
    console.error('[ClearTranscript] Cache read error:', error);
    return null;
  }
}

/**
 * Cache a transcript result
 */
export async function cacheTranscript(
  videoId: string,
  result: TranscriptResult
): Promise<void> {
  const key = `${CACHE_KEY_PREFIX}${videoId}`;
  const ttl = getTTLForResult(result);

  const entry: CacheEntry = {
    videoId,
    result,
    timestamp: Date.now(),
    ttl,
  };

  try {
    await chrome.storage.local.set({ [key]: entry });
    await updateCacheIndex(videoId, Date.now() + ttl);
  } catch (error) {
    console.error('[ClearTranscript] Cache write error:', error);
  }
}

/**
 * Remove a cache entry
 */
export async function removeCacheEntry(videoId: string): Promise<void> {
  const key = `${CACHE_KEY_PREFIX}${videoId}`;

  try {
    await chrome.storage.local.remove(key);
    await removeFromCacheIndex(videoId);
  } catch (error) {
    console.error('[ClearTranscript] Cache remove error:', error);
  }
}

/**
 * Clear all cached transcripts
 */
export async function clearCache(): Promise<void> {
  try {
    const index = await getCacheIndex();
    const keys = Object.keys(index).map((id) => `${CACHE_KEY_PREFIX}${id}`);
    keys.push(CACHE_INDEX_KEY);

    await chrome.storage.local.remove(keys);
  } catch (error) {
    console.error('[ClearTranscript] Cache clear error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entries: number;
  bytesUsed: number;
}> {
  try {
    const index = await getCacheIndex();
    const entries = Object.keys(index).length;

    const bytesUsed = await chrome.storage.local.getBytesInUse();

    return { entries, bytesUsed };
  } catch {
    return { entries: 0, bytesUsed: 0 };
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredEntries(): Promise<number> {
  try {
    const index = await getCacheIndex();
    const now = Date.now();
    let removed = 0;

    for (const [videoId, expiry] of Object.entries(index)) {
      if (now > expiry) {
        await removeCacheEntry(videoId);
        removed++;
      }
    }

    return removed;
  } catch (error) {
    console.error('[ClearTranscript] Cache cleanup error:', error);
    return 0;
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Get TTL based on result tier
 */
function getTTLForResult(result: TranscriptResult): number {
  const TIER_TTL: Record<string, number> = {
    A: 24 * 60 * 60 * 1000, // 24 hours
    B: 1 * 60 * 60 * 1000, // 1 hour
    C: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  return TIER_TTL[result.tier] || TIER_TTL.A;
}

/**
 * Get cache index (videoId -> expiry timestamp)
 */
async function getCacheIndex(): Promise<Record<string, number>> {
  const result = await chrome.storage.local.get(CACHE_INDEX_KEY);
  return result[CACHE_INDEX_KEY] || {};
}

/**
 * Update cache index with new entry
 */
async function updateCacheIndex(
  videoId: string,
  expiry: number
): Promise<void> {
  const index = await getCacheIndex();
  index[videoId] = expiry;
  await chrome.storage.local.set({ [CACHE_INDEX_KEY]: index });
}

/**
 * Remove entry from cache index
 */
async function removeFromCacheIndex(videoId: string): Promise<void> {
  const index = await getCacheIndex();
  delete index[videoId];
  await chrome.storage.local.set({ [CACHE_INDEX_KEY]: index });
}
