import type { TranscriptLine } from '@/types';
import { formatTimestamp } from './dom-utils';

/**
 * Convert transcript to SRT format
 */
export function toSRT(transcript: TranscriptLine[]): string {
  return transcript
    .map((line, index) => {
      const startTime = formatSRTTime(line.start);
      const endTime = formatSRTTime(line.start + line.duration);
      return `${index + 1}\n${startTime} --> ${endTime}\n${line.text}\n`;
    })
    .join('\n');
}

/**
 * Convert transcript to VTT format
 */
export function toVTT(transcript: TranscriptLine[]): string {
  const header = 'WEBVTT\n\n';
  const body = transcript
    .map((line) => {
      const startTime = formatVTTTime(line.start);
      const endTime = formatVTTTime(line.start + line.duration);
      return `${startTime} --> ${endTime}\n${line.text}\n`;
    })
    .join('\n');
  return header + body;
}

/**
 * Convert transcript to plain text
 */
export function toPlainText(transcript: TranscriptLine[]): string {
  return transcript.map((line) => line.text).join(' ');
}

/**
 * Convert transcript to timestamped text
 */
export function toTimestampedText(transcript: TranscriptLine[]): string {
  return transcript
    .map((line) => `[${formatTimestamp(line.start)}] ${line.text}`)
    .join('\n');
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
}

/**
 * Format time for VTT (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
}

/**
 * Pad number with leading zeros
 */
function pad(num: number, size: number): string {
  return num.toString().padStart(size, '0');
}

/**
 * Download content as file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Download transcript in specified format
 */
export function downloadTranscript(
  transcript: TranscriptLine[],
  videoTitle: string,
  format: 'srt' | 'vtt' | 'txt'
): void {
  const sanitizedTitle = videoTitle
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);

  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'srt':
      content = toSRT(transcript);
      mimeType = 'text/plain';
      extension = 'srt';
      break;
    case 'vtt':
      content = toVTT(transcript);
      mimeType = 'text/vtt';
      extension = 'vtt';
      break;
    case 'txt':
      content = toTimestampedText(transcript);
      mimeType = 'text/plain';
      extension = 'txt';
      break;
  }

  downloadFile(content, `${sanitizedTitle}.${extension}`, mimeType);
}

/**
 * Copy transcript to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
