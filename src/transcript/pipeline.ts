import type { TranscriptResult, ExtensionSettings } from '@/types';
import { getTierATranscript, getTierATranscriptForLanguage } from './tier-a-youtube';
import { getTierBFallback } from './tier-b-fallback';
import {
  submitForTranscription,
  checkTranscriptionStatus,
} from './tier-c-backend';

export type TranscriptCallback = (result: TranscriptResult) => void;

/**
 * Main transcript retrieval pipeline
 *
 * Attempts tiers in order:
 * 1. Tier A: YouTube native captions (fast, free)
 * 2. Tier B: Fallback content (description, chapters)
 * 3. Tier C: Backend transcription service (if configured)
 *
 * Always returns something, updating as better results become available
 */
export async function getTranscript(
  videoId: string,
  settings: ExtensionSettings,
  onUpdate?: TranscriptCallback
): Promise<TranscriptResult> {
  // Try Tier A first (fastest)
  const tierAResult = await getTierATranscript(
    videoId,
    settings.preferredLanguage
  );
  if (tierAResult) {
    console.log('[ClearTranscript] Tier A success:', tierAResult.source);
    return tierAResult;
  }

  // Try Tier B (fallback content)
  const tierBResult = await getTierBFallback(videoId);
  if (tierBResult) {
    console.log('[ClearTranscript] Tier B fallback');

    // If backend is configured, try Tier C in background
    if (settings.backendUrl) {
      // Return Tier B immediately, start Tier C in background
      startTierCInBackground(videoId, settings.backendUrl, onUpdate);
    }

    return tierBResult;
  }

  // Try Tier C (backend transcription)
  if (settings.backendUrl) {
    console.log('[ClearTranscript] Attempting Tier C');

    // First check if transcript already exists
    const existingResult = await checkTranscriptionStatus(
      videoId,
      settings.backendUrl
    );

    if (existingResult.status === 'complete') {
      return existingResult;
    }

    // Submit for transcription if not processing
    if (existingResult.status !== 'processing') {
      const submissionResult = await submitForTranscription(
        videoId,
        settings.backendUrl
      );

      if (onUpdate) {
        // Return processing state, poll for completion
        pollForCompletion(videoId, settings.backendUrl, onUpdate);
      }

      return submissionResult;
    }

    // Already processing, poll for completion
    if (onUpdate) {
      pollForCompletion(videoId, settings.backendUrl, onUpdate);
    }

    return existingResult;
  }

  // Nothing available, return empty Tier B
  return {
    tier: 'B',
    source: 'fallback-partial',
    isPartial: true,
    description:
      'No transcript available. Configure a transcription backend in settings for automatic transcription.',
  };
}

/**
 * Get transcript for a specific language
 */
export async function getTranscriptForLanguage(
  videoId: string,
  languageCode: string
): Promise<TranscriptResult | null> {
  const result = await getTierATranscriptForLanguage(videoId, languageCode);
  return result;
}

/**
 * Start Tier C transcription in background
 */
async function startTierCInBackground(
  videoId: string,
  backendUrl: string,
  onUpdate?: TranscriptCallback
): Promise<void> {
  try {
    // Check if already exists
    const existing = await checkTranscriptionStatus(videoId, backendUrl);
    if (existing.status === 'complete') {
      onUpdate?.(existing);
      return;
    }

    // Submit for transcription
    if (existing.status !== 'processing') {
      await submitForTranscription(videoId, backendUrl);
    }

    // Poll for completion
    if (onUpdate) {
      pollForCompletion(videoId, backendUrl, onUpdate);
    }
  } catch (error) {
    console.error('[ClearTranscript] Background Tier C failed:', error);
  }
}

/**
 * Poll for Tier C completion
 */
async function pollForCompletion(
  videoId: string,
  backendUrl: string,
  onUpdate: TranscriptCallback,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<void> {
  let attempts = 0;

  const poll = async () => {
    if (attempts >= maxAttempts) {
      onUpdate({
        tier: 'C',
        source: 'server-transcription',
        transcript: [],
        status: 'error',
        error: 'Transcription timeout',
      });
      return;
    }

    const result = await checkTranscriptionStatus(videoId, backendUrl);
    onUpdate(result);

    if (result.status === 'processing') {
      attempts++;
      setTimeout(poll, intervalMs);
    }
  };

  poll();
}

/**
 * Get source label for display
 */
export function getSourceLabel(result: TranscriptResult): string {
  switch (result.source) {
    case 'youtube-captions':
      return 'YouTube captions';
    case 'youtube-auto-generated':
      return 'Auto-generated';
    case 'fallback-partial':
      return 'Partial content';
    case 'server-transcription':
      return 'Server transcription';
  }
}

/**
 * Check if result has actual transcript lines
 */
export function hasTranscriptLines(result: TranscriptResult): boolean {
  if (result.tier === 'B') return false;
  return result.transcript.length > 0;
}
