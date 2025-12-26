import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  toSRT,
  toVTT,
  toPlainText,
  toTimestampedText,
  copyToClipboard,
} from '@/utils/export';
import type { TranscriptLine } from '@/types';

describe('export utilities', () => {
  const mockTranscript: TranscriptLine[] = [
    { start: 0, duration: 2, text: 'Hello world' },
    { start: 2, duration: 3, text: 'This is a test' },
    { start: 5, duration: 2.5, text: 'Testing captions' },
    { start: 7.5, duration: 2, text: 'End of transcript' },
  ];

  describe('toSRT', () => {
    it('should convert transcript to SRT format', () => {
      const srt = toSRT(mockTranscript);

      // Check first entry
      expect(srt).toContain('1\n');
      expect(srt).toContain('00:00:00,000 --> 00:00:02,000\n');
      expect(srt).toContain('Hello world');

      // Check second entry
      expect(srt).toContain('2\n');
      expect(srt).toContain('00:00:02,000 --> 00:00:05,000\n');
      expect(srt).toContain('This is a test');
    });

    it('should handle hours correctly', () => {
      const longTranscript: TranscriptLine[] = [
        { start: 3661.5, duration: 2, text: 'One hour in' },
      ];
      const srt = toSRT(longTranscript);
      expect(srt).toContain('01:01:01,500 --> 01:01:03,500');
    });

    it('should return empty string for empty transcript', () => {
      expect(toSRT([])).toBe('');
    });
  });

  describe('toVTT', () => {
    it('should include WEBVTT header', () => {
      const vtt = toVTT(mockTranscript);
      expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    });

    it('should use period for milliseconds (VTT format)', () => {
      const vtt = toVTT(mockTranscript);
      expect(vtt).toContain('00:00:00.000 --> 00:00:02.000');
    });

    it('should include transcript content', () => {
      const vtt = toVTT(mockTranscript);
      expect(vtt).toContain('Hello world');
      expect(vtt).toContain('This is a test');
    });
  });

  describe('toPlainText', () => {
    it('should join all text with spaces', () => {
      const text = toPlainText(mockTranscript);
      expect(text).toBe('Hello world This is a test Testing captions End of transcript');
    });

    it('should return empty string for empty transcript', () => {
      expect(toPlainText([])).toBe('');
    });
  });

  describe('toTimestampedText', () => {
    it('should include timestamps with each line', () => {
      const text = toTimestampedText(mockTranscript);
      expect(text).toContain('[0:00] Hello world');
      expect(text).toContain('[0:02] This is a test');
    });

    it('should format minutes and seconds correctly', () => {
      const longTranscript: TranscriptLine[] = [
        { start: 125, duration: 2, text: 'Two minutes in' },
      ];
      const text = toTimestampedText(longTranscript);
      expect(text).toContain('[2:05] Two minutes in');
    });
  });

  describe('copyToClipboard', () => {
    it('should use navigator.clipboard when available', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('test text');
      expect(writeTextMock).toHaveBeenCalledWith('test text');
      expect(result).toBe(true);
    });

    it('should return false when clipboard fails', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockRejectedValue(new Error('Failed')) },
        writable: true,
        configurable: true,
      });

      // Also mock document.execCommand for fallback
      document.execCommand = vi.fn().mockReturnValue(false);

      const result = await copyToClipboard('test text');
      expect(result).toBe(false);
    });
  });
});
