import type { TranscriptLine } from '@/types';
import { formatTimestamp, highlightMatches, escapeHtml } from '@/utils/dom-utils';

export interface TranscriptLineProps {
  line: TranscriptLine;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  searchQuery: string;
  onClick: (line: TranscriptLine, index: number) => void;
}

/**
 * Create a transcript line element
 */
export function createTranscriptLine(props: TranscriptLineProps): HTMLElement {
  const { line, index, isActive, isSelected, searchQuery, onClick } = props;

  const element = document.createElement('div');
  element.className = getLineClasses(isActive, isSelected);
  element.dataset.index = String(index);
  element.dataset.start = String(line.start);

  element.innerHTML = `
    <span class="ct-line-timestamp">${formatTimestamp(line.start)}</span>
    <span class="ct-line-text">${searchQuery ? highlightMatches(line.text, searchQuery) : escapeHtml(line.text)}</span>
  `;

  element.addEventListener('click', () => onClick(line, index));

  return element;
}

/**
 * Get CSS classes for line state
 */
function getLineClasses(isActive: boolean, isSelected: boolean): string {
  const classes = ['ct-transcript-line'];
  if (isActive) classes.push('ct-line-active');
  if (isSelected) classes.push('ct-line-selected');
  return classes.join(' ');
}

/**
 * Update line state (for efficient updates)
 */
export function updateLineState(
  element: HTMLElement,
  isActive: boolean,
  isSelected: boolean
): void {
  element.classList.toggle('ct-line-active', isActive);
  element.classList.toggle('ct-line-selected', isSelected);
}

/**
 * Update line highlight (for search)
 */
export function updateLineHighlight(
  element: HTMLElement,
  line: TranscriptLine,
  searchQuery: string
): void {
  const textSpan = element.querySelector('.ct-line-text');
  if (textSpan) {
    textSpan.innerHTML = searchQuery
      ? highlightMatches(line.text, searchQuery)
      : escapeHtml(line.text);
  }
}

/**
 * Get transcript line styles
 */
export function getTranscriptLineStyles(): string {
  return `
    .ct-transcript-line {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: background var(--ct-transition);
    }

    .ct-transcript-line:hover {
      background: var(--ct-bg-secondary);
    }

    .ct-line-active {
      background: var(--ct-bg-secondary);
      border-left: 3px solid var(--ct-accent);
      padding-left: 9px;
    }

    .ct-line-selected {
      background: var(--ct-bg-secondary);
      outline: 2px solid var(--ct-accent);
      outline-offset: -2px;
    }

    .ct-line-timestamp {
      flex-shrink: 0;
      font-size: 12px;
      font-family: monospace;
      color: var(--ct-text-secondary);
      min-width: 48px;
    }

    .ct-line-active .ct-line-timestamp {
      color: var(--ct-accent);
      font-weight: 500;
    }

    .ct-line-text {
      flex: 1;
      word-break: break-word;
    }
  `;
}
