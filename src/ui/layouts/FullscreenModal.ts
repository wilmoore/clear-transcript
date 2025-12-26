import type { TranscriptResult, ExtensionSettings } from '@/types';
import { createTranscriptPanel, TranscriptPanelController } from '@/ui/components/TranscriptPanel';
import { injectStyles } from '@/utils/dom-utils';

export interface FullscreenModalController {
  isModal: true;
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

interface CreateFullscreenModalResult {
  controller: FullscreenModalController;
  cleanup: () => void;
}

/**
 * Create fullscreen modal layout
 *
 * Features:
 * - Small floating button in bottom-right
 * - Centered modal overlay on click
 * - Esc to close
 * - Semi-transparent backdrop
 */
export function createFullscreenModal(
  shadow: ShadowRoot,
  settings: ExtensionSettings
): CreateFullscreenModalResult {
  // Inject styles
  injectStyles(shadow, getFullscreenModalStyles());

  // Create floating trigger button
  const trigger = document.createElement('button');
  trigger.className = 'ct-modal-trigger ct-container';
  trigger.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6m-6 4h4"/>
    </svg>
  `;
  trigger.title = 'Open transcript (T)';

  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.className = 'ct-modal-container ct-container';

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'ct-modal-backdrop';

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'ct-modal';

  // Create content container
  const content = document.createElement('div');
  content.className = 'ct-modal-content';

  modal.appendChild(content);
  modalContainer.appendChild(backdrop);
  modalContainer.appendChild(modal);

  shadow.appendChild(trigger);
  shadow.appendChild(modalContainer);

  // State
  let panelController: TranscriptPanelController | null = null;
  let isModalOpen = false;

  function initPanel(): void {
    if (panelController) return;

    panelController = createTranscriptPanel(content, {
      settings,
      onLanguageChange: (languageCode) => {
        // Dispatch event with bubbles and composed to cross shadow DOM boundary
        const event = new CustomEvent('ct-language-change', {
          detail: { languageCode },
          bubbles: true,
          composed: true,
        });
        shadow.dispatchEvent(event);
      },
      onClose: () => controller.close(),
    });
  }

  // Trigger click
  trigger.addEventListener('click', () => {
    controller.open();
  });

  // Backdrop click
  backdrop.addEventListener('click', () => {
    controller.close();
  });

  // Escape key handler
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isModalOpen) {
      e.preventDefault();
      e.stopPropagation();
      controller.close();
    }
  };

  document.addEventListener('keydown', handleEscape, true);

  // Controller
  const controller: FullscreenModalController = {
    isModal: true,

    isOpen() {
      return isModalOpen;
    },

    open() {
      if (isModalOpen) return;
      isModalOpen = true;
      initPanel();
      modalContainer.classList.add('ct-modal-open');
      trigger.classList.add('ct-trigger-hidden');
    },

    close() {
      if (!isModalOpen) return;
      isModalOpen = false;
      modalContainer.classList.remove('ct-modal-open');
      trigger.classList.remove('ct-trigger-hidden');
    },

    toggle() {
      if (isModalOpen) {
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
    document.removeEventListener('keydown', handleEscape, true);
    panelController?.destroy();
    trigger.remove();
    modalContainer.remove();
  };

  return { controller, cleanup };
}

/**
 * Get fullscreen modal styles
 */
function getFullscreenModalStyles(): string {
  return `
    .ct-modal-trigger {
      position: absolute;
      right: 16px;
      bottom: 60px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.7);
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all var(--ct-transition);
      z-index: 10;
    }

    .ct-modal-trigger:hover {
      transform: scale(1.1);
      background: rgba(0, 0, 0, 0.85);
    }

    .ct-trigger-hidden {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.8);
    }

    .ct-modal-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      z-index: 1000;
    }

    .ct-modal-open {
      opacity: 1;
      visibility: visible;
    }

    .ct-modal-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
    }

    .ct-modal {
      position: relative;
      width: 90%;
      max-width: 600px;
      height: 70%;
      max-height: 600px;
      background: var(--ct-bg);
      border-radius: var(--ct-radius);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(20px);
      transition: transform 0.2s ease;
    }

    .ct-modal-open .ct-modal {
      transform: translateY(0);
    }

    .ct-modal-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `;
}
