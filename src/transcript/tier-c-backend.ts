import type { TierCResult, TranscriptLine } from '@/types';

/**
 * Tier C: Backend transcription service
 *
 * Used when:
 * - No YouTube captions exist
 * - User explicitly requests server transcription
 *
 * Requires a configured backend URL in extension settings
 */

/**
 * Validate backend URL format
 */
function isValidBackendUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface BackendResponse {
  status: 'processing' | 'complete' | 'error';
  transcript?: TranscriptLine[];
  error?: string;
  estimatedTime?: number;
}

/**
 * Submit video for transcription
 */
export async function submitForTranscription(
  videoId: string,
  backendUrl: string
): Promise<TierCResult> {
  // Validate backend URL
  if (!isValidBackendUrl(backendUrl)) {
    return {
      tier: 'C',
      source: 'server-transcription',
      transcript: [],
      status: 'error',
      error: 'Invalid backend URL',
    };
  }

  try {
    const response = await fetch(`${backendUrl}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId }),
      signal: AbortSignal.timeout(30000), // 30 second timeout for submission
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data: BackendResponse = await response.json();

    return {
      tier: 'C',
      source: 'server-transcription',
      transcript: data.transcript || [],
      status: data.status,
      error: data.error,
    };
  } catch (error) {
    console.error('[ClearTranscript] Tier C submission failed:', error);
    return {
      tier: 'C',
      source: 'server-transcription',
      transcript: [],
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Poll for transcription status
 */
export async function checkTranscriptionStatus(
  videoId: string,
  backendUrl: string
): Promise<TierCResult> {
  // Validate backend URL
  if (!isValidBackendUrl(backendUrl)) {
    return {
      tier: 'C',
      source: 'server-transcription',
      transcript: [],
      status: 'error',
      error: 'Invalid backend URL',
    };
  }

  try {
    const response = await fetch(
      `${backendUrl}/api/transcript/${encodeURIComponent(videoId)}`,
      {
        signal: AbortSignal.timeout(10000), // 10 second timeout for status check
      }
    );

    if (response.status === 404) {
      // Transcript not found, needs to be submitted
      return {
        tier: 'C',
        source: 'server-transcription',
        transcript: [],
        status: 'error',
        error: 'Transcript not found',
      };
    }

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data: BackendResponse = await response.json();

    return {
      tier: 'C',
      source: 'server-transcription',
      transcript: data.transcript || [],
      status: data.status,
      error: data.error,
    };
  } catch (error) {
    console.error('[ClearTranscript] Tier C status check failed:', error);
    return {
      tier: 'C',
      source: 'server-transcription',
      transcript: [],
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Poll for transcript completion with retry logic
 */
export async function waitForTranscription(
  videoId: string,
  backendUrl: string,
  maxAttempts = 60,
  intervalMs = 5000,
  onProgress?: (status: TierCResult) => void
): Promise<TierCResult> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await checkTranscriptionStatus(videoId, backendUrl);

    if (onProgress) {
      onProgress(result);
    }

    if (result.status === 'complete' || result.status === 'error') {
      return result;
    }

    attempts++;
    await sleep(intervalMs);
  }

  return {
    tier: 'C',
    source: 'server-transcription',
    transcript: [],
    status: 'error',
    error: 'Transcription timeout',
  };
}

/**
 * Check if backend is configured and available
 */
export async function isBackendAvailable(backendUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cancel ongoing transcription (if supported by backend)
 */
export async function cancelTranscription(
  videoId: string,
  backendUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${backendUrl}/api/transcribe/${encodeURIComponent(videoId)}`,
      {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
