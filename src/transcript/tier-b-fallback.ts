import type { TierBResult } from '@/types';
import { extractDescription, extractChapters } from '@/utils/youtube-api';

/**
 * Tier B: Fallback content when no captions are available
 *
 * Returns:
 * - Video description
 * - Chapter markers (if available)
 *
 * Always marked as partial content
 */
export async function getTierBFallback(
  videoId: string
): Promise<TierBResult | null> {
  try {
    const description = extractDescription();
    const chapters = extractChapters();

    // Only return if we have some content
    if (!description && chapters.length === 0) {
      console.log('[ClearTranscript] No fallback content available');
      return null;
    }

    return {
      tier: 'B',
      source: 'fallback-partial',
      description: description || undefined,
      chapters: chapters.length > 0 ? chapters : undefined,
      isPartial: true,
    };
  } catch (error) {
    console.error('[ClearTranscript] Tier B failed:', error);
    return null;
  }
}

/**
 * Format fallback content for display
 */
export function formatFallbackContent(result: TierBResult): string {
  const parts: string[] = [];

  if (result.chapters && result.chapters.length > 0) {
    parts.push('## Chapters\n');
    result.chapters.forEach((chapter) => {
      const timestamp = formatTimestamp(chapter.start);
      parts.push(`[${timestamp}] ${chapter.title}`);
    });
    parts.push('');
  }

  if (result.description) {
    parts.push('## Description\n');
    parts.push(result.description);
  }

  return parts.join('\n');
}

/**
 * Format seconds to timestamp
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
