import type { TranscriptResult, TranscriptLine, ExtensionSettings } from '@/types';
import { seekTo, getCurrentTime, onTimeUpdate } from '@/utils/youtube-api';
import { copyToClipboard, downloadTranscript, toPlainText } from '@/utils/export';
import { scrollIntoViewIfNeeded } from '@/utils/dom-utils';
import { getVideoTitle } from '@/content/page-detector';
import { hasTranscriptLines } from '@/transcript/pipeline';

import { createSearchBar, getSearchBarStyles } from './SearchBar';
import { createSourceIndicator, getSourceIndicatorStyles } from './SourceIndicator';
import { createToolbar, getToolbarStyles } from './Toolbar';
import {
  createTranscriptLine,
  updateLineState,
  updateLineHighlight,
  getTranscriptLineStyles,
} from './TranscriptLine';
import {
  createLoadingState,
  createErrorState,
  createEmptyState,
  createProcessingState,
  getStateStyles,
} from './LoadingState';

export interface TranscriptPanelController {
  setTranscript: (result: TranscriptResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string) => void;
  focusSearch: () => void;
  copyTranscript: () => Promise<void>;
  downloadTranscript: (format: 'srt' | 'vtt' | 'txt') => void;
  navigateLines: (delta: number) => void;
  seekToSelectedLine: () => void;
  getSelectedLineIndex: () => number;
  destroy: () => void;
}

export interface TranscriptPanelOptions {
  settings: ExtensionSettings;
  onLanguageChange?: (languageCode: string) => void;
  onClose?: () => void;
}

/**
 * Create transcript panel component
 */
export function createTranscriptPanel(
  container: HTMLElement,
  options: TranscriptPanelOptions
): TranscriptPanelController {
  const { settings, onLanguageChange, onClose } = options;

  let currentResult: TranscriptResult | null = null;
  let currentLines: TranscriptLine[] = [];
  let searchQuery = '';
  let activeLineIndex = -1;
  let selectedLineIndex = -1;
  let lineElements: HTMLElement[] = [];
  let unsubscribeTimeUpdate: (() => void) | null = null;

  // Create main structure
  const panel = document.createElement('div');
  panel.className = 'ct-panel';

  // Create toolbar
  const toolbar = createToolbar({
    onCopy: () => controller.copyTranscript(),
    onDownload: (format) => controller.downloadTranscript(format),
    onClose: () => onClose?.(),
  });

  // Create search bar
  const searchBar = createSearchBar({
    onSearch: handleSearch,
    onClear: () => handleSearch(''),
  });

  // Create source indicator
  const sourceIndicator = createSourceIndicator({
    result: {
      tier: 'B',
      source: 'fallback-partial',
      isPartial: true,
    },
    onLanguageChange,
  });

  // Create content container
  const content = document.createElement('div');
  content.className = 'ct-panel-content ct-scrollbar';

  // Assemble panel
  panel.appendChild(toolbar.element);
  panel.appendChild(searchBar.element);
  panel.appendChild(sourceIndicator.element);
  panel.appendChild(content);

  // Inject styles
  injectPanelStyles(container);

  // Append to container
  container.appendChild(panel);

  // Set up time update listener
  function setupTimeSync(): void {
    unsubscribeTimeUpdate?.();
    unsubscribeTimeUpdate = onTimeUpdate(handleTimeUpdate);
  }

  function handleTimeUpdate(time: number): void {
    if (currentLines.length === 0) return;

    // Find current line
    const newActiveIndex = currentLines.findIndex(
      (line, i) =>
        time >= line.start &&
        (i === currentLines.length - 1 || time < currentLines[i + 1].start)
    );

    if (newActiveIndex !== activeLineIndex) {
      // Update old line
      if (activeLineIndex >= 0 && lineElements[activeLineIndex]) {
        updateLineState(
          lineElements[activeLineIndex],
          false,
          activeLineIndex === selectedLineIndex
        );
      }

      // Update new line
      activeLineIndex = newActiveIndex;
      if (activeLineIndex >= 0 && lineElements[activeLineIndex]) {
        updateLineState(
          lineElements[activeLineIndex],
          true,
          activeLineIndex === selectedLineIndex
        );

        // Auto-scroll to active line
        scrollIntoViewIfNeeded(lineElements[activeLineIndex], content);
      }
    }
  }

  function handleSearch(query: string): void {
    searchQuery = query;
    renderLines();
  }

  function handleLineClick(line: TranscriptLine, index: number): void {
    seekTo(line.start);

    // Update selection
    if (selectedLineIndex >= 0 && lineElements[selectedLineIndex]) {
      updateLineState(
        lineElements[selectedLineIndex],
        selectedLineIndex === activeLineIndex,
        false
      );
    }

    selectedLineIndex = index;
    if (lineElements[selectedLineIndex]) {
      updateLineState(
        lineElements[selectedLineIndex],
        selectedLineIndex === activeLineIndex,
        true
      );
    }
  }

  function renderLines(): void {
    content.innerHTML = '';
    lineElements = [];

    if (!currentResult) {
      content.appendChild(createEmptyState('No transcript available'));
      return;
    }

    if (currentResult.tier === 'C' && currentResult.status === 'processing') {
      content.appendChild(createProcessingState());
      return;
    }

    if (!hasTranscriptLines(currentResult)) {
      // Show fallback content
      if (currentResult.tier === 'B') {
        content.innerHTML = `
          <div class="ct-fallback-content">
            ${currentResult.chapters?.length ? renderChapters(currentResult.chapters) : ''}
            ${currentResult.description ? `<p class="ct-description">${currentResult.description}</p>` : ''}
          </div>
        `;
      } else {
        content.appendChild(createEmptyState('No transcript lines found'));
      }
      return;
    }

    // Filter lines by search query
    let linesToRender = currentLines;
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      linesToRender = currentLines.filter((line) =>
        line.text.toLowerCase().includes(queryLower)
      );
    }

    if (linesToRender.length === 0) {
      content.appendChild(
        createEmptyState(
          searchQuery ? 'No matches found' : 'No transcript lines'
        )
      );
      return;
    }

    // Create line elements
    const fragment = document.createDocumentFragment();
    linesToRender.forEach((line, i) => {
      const originalIndex = currentLines.indexOf(line);
      const element = createTranscriptLine({
        line,
        index: originalIndex,
        isActive: originalIndex === activeLineIndex,
        isSelected: originalIndex === selectedLineIndex,
        searchQuery,
        onClick: handleLineClick,
      });

      lineElements[originalIndex] = element;
      fragment.appendChild(element);
    });

    content.appendChild(fragment);
  }

  function renderChapters(chapters: { title: string; start: number }[]): string {
    return `
      <div class="ct-chapters">
        <h3 class="ct-chapters-title">Chapters</h3>
        ${chapters
          .map(
            (ch) => `
          <div class="ct-chapter" data-start="${ch.start}">
            <span class="ct-chapter-time">${formatTime(ch.start)}</span>
            <span class="ct-chapter-title">${ch.title}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Controller
  const controller: TranscriptPanelController = {
    setTranscript(result: TranscriptResult) {
      currentResult = result;
      currentLines =
        result.tier === 'A' || result.tier === 'C' ? result.transcript : [];
      activeLineIndex = -1;
      selectedLineIndex = -1;

      sourceIndicator.update(result);
      renderLines();
      setupTimeSync();
    },

    setLoading(loading: boolean) {
      if (loading) {
        content.innerHTML = '';
        content.appendChild(createLoadingState());
      }
    },

    setError(message: string) {
      content.innerHTML = '';
      content.appendChild(
        createErrorState(message, () => {
          // Retry logic would go here
        })
      );
    },

    focusSearch() {
      searchBar.focus();
    },

    async copyTranscript() {
      if (currentLines.length === 0) return;
      const text = toPlainText(currentLines);
      const success = await copyToClipboard(text);
      if (success) {
        toolbar.showCopySuccess();
      }
    },

    downloadTranscript(format: 'srt' | 'vtt' | 'txt') {
      if (currentLines.length === 0) return;
      const title = getVideoTitle() || 'transcript';
      downloadTranscript(currentLines, title, format);
    },

    navigateLines(delta: number) {
      if (currentLines.length === 0) return;

      // Update selection
      if (selectedLineIndex >= 0 && lineElements[selectedLineIndex]) {
        updateLineState(
          lineElements[selectedLineIndex],
          selectedLineIndex === activeLineIndex,
          false
        );
      }

      selectedLineIndex = Math.max(
        0,
        Math.min(currentLines.length - 1, selectedLineIndex + delta)
      );

      if (lineElements[selectedLineIndex]) {
        updateLineState(
          lineElements[selectedLineIndex],
          selectedLineIndex === activeLineIndex,
          true
        );
        scrollIntoViewIfNeeded(lineElements[selectedLineIndex], content);
      }
    },

    seekToSelectedLine() {
      if (selectedLineIndex >= 0 && currentLines[selectedLineIndex]) {
        seekTo(currentLines[selectedLineIndex].start);
      }
    },

    getSelectedLineIndex() {
      return selectedLineIndex;
    },

    destroy() {
      unsubscribeTimeUpdate?.();
      panel.remove();
    },
  };

  return controller;
}

/**
 * Inject panel styles
 */
function injectPanelStyles(container: HTMLElement): void {
  const style = document.createElement('style');
  style.textContent = `
    ${getToolbarStyles()}
    ${getSearchBarStyles()}
    ${getSourceIndicatorStyles()}
    ${getTranscriptLineStyles()}
    ${getStateStyles()}

    .ct-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ct-bg);
      border-radius: var(--ct-radius);
      overflow: hidden;
    }

    .ct-panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }

    .ct-fallback-content {
      padding: 16px;
    }

    .ct-chapters {
      margin-bottom: 16px;
    }

    .ct-chapters-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--ct-text);
    }

    .ct-chapter {
      display: flex;
      gap: 12px;
      padding: 8px 0;
      cursor: pointer;
      border-bottom: 1px solid var(--ct-border);
    }

    .ct-chapter:hover {
      background: var(--ct-bg-secondary);
    }

    .ct-chapter-time {
      color: var(--ct-accent);
      font-family: monospace;
      font-size: 12px;
    }

    .ct-chapter-title {
      color: var(--ct-text);
    }

    .ct-description {
      color: var(--ct-text-secondary);
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  `;

  container.appendChild(style);
}

export { TranscriptPanelController };
