import type { TranscriptLine } from '@/types';
import { copyToClipboard, downloadTranscript, toPlainText } from '@/utils/export';

export interface ToolbarProps {
  onCopy: () => void;
  onDownload: (format: 'srt' | 'vtt' | 'txt') => void;
  onClose: () => void;
}

/**
 * Create toolbar component
 */
export function createToolbar(props: ToolbarProps): {
  element: HTMLElement;
  showCopySuccess: () => void;
} {
  const { onCopy, onDownload, onClose } = props;

  const container = document.createElement('div');
  container.className = 'ct-toolbar';

  container.innerHTML = `
    <div class="ct-toolbar-left">
      <span class="ct-toolbar-title">Transcript</span>
    </div>
    <div class="ct-toolbar-right">
      <button class="ct-icon-button ct-copy-btn" title="Copy transcript (Ctrl+C)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <div class="ct-download-menu">
        <button class="ct-icon-button ct-download-btn" title="Download transcript (Ctrl+D)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <div class="ct-download-dropdown">
          <button class="ct-dropdown-item" data-format="srt">SRT (SubRip)</button>
          <button class="ct-dropdown-item" data-format="vtt">VTT (WebVTT)</button>
          <button class="ct-dropdown-item" data-format="txt">TXT (Plain text)</button>
        </div>
      </div>
      <button class="ct-icon-button ct-close-btn" title="Close (Esc)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;

  // Copy button
  const copyBtn = container.querySelector('.ct-copy-btn') as HTMLButtonElement;
  copyBtn.addEventListener('click', onCopy);

  // Download menu
  const downloadBtn = container.querySelector('.ct-download-btn') as HTMLButtonElement;
  const downloadMenu = container.querySelector('.ct-download-menu') as HTMLElement;
  const dropdown = container.querySelector('.ct-download-dropdown') as HTMLElement;

  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('ct-dropdown-open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('ct-dropdown-open');
  });

  // Download format buttons
  dropdown.querySelectorAll('.ct-dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = (item as HTMLElement).dataset.format as 'srt' | 'vtt' | 'txt';
      onDownload(format);
      dropdown.classList.remove('ct-dropdown-open');
    });
  });

  // Close button
  const closeBtn = container.querySelector('.ct-close-btn') as HTMLButtonElement;
  closeBtn.addEventListener('click', onClose);

  return {
    element: container,
    showCopySuccess: () => {
      copyBtn.classList.add('ct-copy-success');
      setTimeout(() => copyBtn.classList.remove('ct-copy-success'), 1500);
    },
  };
}

/**
 * Get toolbar styles
 */
export function getToolbarStyles(): string {
  return `
    .ct-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid var(--ct-border);
      background: var(--ct-bg);
    }

    .ct-toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ct-toolbar-title {
      font-weight: 500;
      font-size: 14px;
    }

    .ct-toolbar-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ct-download-menu {
      position: relative;
    }

    .ct-download-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: var(--ct-bg);
      border: 1px solid var(--ct-border);
      border-radius: var(--ct-radius);
      box-shadow: var(--ct-shadow);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all var(--ct-transition);
      z-index: 10;
    }

    .ct-download-dropdown.ct-dropdown-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .ct-dropdown-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--ct-text);
      text-align: left;
      cursor: pointer;
      white-space: nowrap;
      transition: background var(--ct-transition);
    }

    .ct-dropdown-item:first-child {
      border-radius: var(--ct-radius) var(--ct-radius) 0 0;
    }

    .ct-dropdown-item:last-child {
      border-radius: 0 0 var(--ct-radius) var(--ct-radius);
    }

    .ct-dropdown-item:hover {
      background: var(--ct-bg-secondary);
    }

    .ct-copy-btn.ct-copy-success {
      color: #4caf50;
    }

    .ct-copy-btn.ct-copy-success::after {
      content: 'Copied!';
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      background: var(--ct-bg);
      padding: 2px 8px;
      border-radius: 4px;
      box-shadow: var(--ct-shadow);
      white-space: nowrap;
    }
  `;
}
