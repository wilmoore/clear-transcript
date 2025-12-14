import type { TranscriptResult, ExtensionSettings } from '@/types';
import { createTranscriptPanel, TranscriptPanelController } from '@/ui/components/TranscriptPanel';
import { injectStyles } from '@/utils/dom-utils';

export interface SidePanelController {
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setTranscript: (result: TranscriptResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string) => void;
  focusSearch: () => void;
  copyTranscript: () => Promise<void>;
  downloadTranscript: (format: 'srt' | 'vtt' | 'txt') => void;
  navigateLines: (delta: number) => void;
  seekToSelectedLine: () => void;
}

interface CreateSidePanelResult {
  controller: SidePanelController;
  cleanup: () => void;
}

/**
 * Create side panel layout for default/theater mode
 *
 * Features:
 * - Collapsed: thin vertical tab on right edge
 * - Expanded: 320px panel overlaying video
 * - Smooth slide animation
 * - Does not reflow page layout
 */
export function createSidePanel(
  shadow: ShadowRoot,
  settings: ExtensionSettings
): CreateSidePanelResult {
  // Inject styles
  injectStyles(shadow, getSidePanelStyles());

  // Create container
  const container = document.createElement('div');
  container.className = 'ct-side-panel ct-container';

  // Create collapsed tab
  const tab = document.createElement('button');
  tab.className = 'ct-side-panel-tab';
  tab.innerHTML = `
    <span class="ct-tab-text">Transcript</span>
    <svg class="ct-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  `;

  // Create expanded panel
  const panel = document.createElement('div');
  panel.className = 'ct-side-panel-content';

  container.appendChild(tab);
  container.appendChild(panel);
  shadow.appendChild(container);

  // Create transcript panel
  let panelController: TranscriptPanelController | null = null;
  let isExpanded = false;

  function initPanel(): void {
    if (panelController) return;

    panelController = createTranscriptPanel(panel, {
      settings,
      onLanguageChange: (languageCode) => {
        // This will be connected to the content script
        const event = new CustomEvent('ct-language-change', {
          detail: { languageCode },
        });
        shadow.dispatchEvent(event);
      },
      onClose: () => controller.close(),
    });
  }

  // Tab click handler
  tab.addEventListener('click', () => {
    controller.toggle();
  });

  // Controller
  const controller: SidePanelController = {
    isOpen() {
      return isExpanded;
    },

    open() {
      if (isExpanded) return;
      isExpanded = true;
      container.classList.add('ct-side-panel-expanded');
      initPanel();
    },

    close() {
      if (!isExpanded) return;
      isExpanded = false;
      container.classList.remove('ct-side-panel-expanded');
    },

    toggle() {
      if (isExpanded) {
        controller.close();
      } else {
        controller.open();
      }
    },

    setTranscript(result: TranscriptResult) {
      initPanel();
      panelController?.setTranscript(result);
    },

    setLoading(loading: boolean) {
      initPanel();
      panelController?.setLoading(loading);
    },

    setError(message: string) {
      initPanel();
      panelController?.setError(message);
    },

    focusSearch() {
      panelController?.focusSearch();
    },

    async copyTranscript() {
      await panelController?.copyTranscript();
    },

    downloadTranscript(format: 'srt' | 'vtt' | 'txt') {
      panelController?.downloadTranscript(format);
    },

    navigateLines(delta: number) {
      panelController?.navigateLines(delta);
    },

    seekToSelectedLine() {
      panelController?.seekToSelectedLine();
    },
  };

  // Cleanup
  const cleanup = () => {
    panelController?.destroy();
    container.remove();
  };

  return { controller, cleanup };
}

/**
 * Get side panel styles
 */
function getSidePanelStyles(): string {
  return `
    .ct-side-panel {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      display: flex;
      pointer-events: auto;
    }

    .ct-side-panel-tab {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 8px;
      background: var(--ct-bg);
      border: 1px solid var(--ct-border);
      border-right: none;
      border-radius: var(--ct-radius) 0 0 var(--ct-radius);
      color: var(--ct-text);
      cursor: pointer;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 12px;
      font-weight: 500;
      box-shadow: var(--ct-shadow);
      transition: all var(--ct-transition);
      z-index: 1;
    }

    .ct-side-panel-tab:hover {
      padding-right: 12px;
      background: var(--ct-bg-secondary);
    }

    .ct-tab-icon {
      transform: rotate(90deg);
      transition: transform var(--ct-transition);
    }

    .ct-side-panel-expanded .ct-tab-icon {
      transform: rotate(-90deg);
    }

    .ct-side-panel-content {
      width: 0;
      height: 100%;
      background: var(--ct-bg);
      border-left: 1px solid var(--ct-border);
      box-shadow: var(--ct-shadow);
      overflow: hidden;
      transition: width 0.3s ease;
    }

    .ct-side-panel-expanded .ct-side-panel-content {
      width: 360px;
    }

    .ct-side-panel-expanded .ct-side-panel-tab {
      right: 360px;
    }

    /* Responsive adjustments */
    @media (max-width: 800px) {
      .ct-side-panel-expanded .ct-side-panel-content {
        width: 300px;
      }

      .ct-side-panel-expanded .ct-side-panel-tab {
        right: 300px;
      }
    }
  `;
}
