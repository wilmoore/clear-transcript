import type { TranscriptResult, ExtensionSettings } from '@/types';
import { createTranscriptPanel, TranscriptPanelController } from '@/ui/components/TranscriptPanel';
import { injectStyles, clamp } from '@/utils/dom-utils';

export type SheetPosition = 'hidden' | 'peek' | 'half' | 'full';

export interface BottomSheetController {
  isBottomSheet: true;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setPosition: (position: SheetPosition) => void;
  setTranscript: (result: TranscriptResult) => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string) => void;
  focusSearch: () => void;
  copyTranscript: () => Promise<void>;
  downloadTranscript: (format: 'srt' | 'vtt' | 'txt') => void;
  navigateLines: (delta: number) => void;
  seekToSelectedLine: () => void;
}

interface CreateBottomSheetResult {
  controller: BottomSheetController;
  cleanup: () => void;
}

// Sheet snap positions (percentage of container height)
const SNAP_POSITIONS: Record<SheetPosition, number> = {
  hidden: 0,
  peek: 15,
  half: 50,
  full: 85,
};

/**
 * Create bottom sheet layout for Shorts
 *
 * Features:
 * - Floating trigger button
 * - Draggable sheet with snap points
 * - Peek, half, and full positions
 * - Touch gesture support
 */
export function createBottomSheet(
  shadow: ShadowRoot,
  settings: ExtensionSettings
): CreateBottomSheetResult {
  // Inject styles
  injectStyles(shadow, getBottomSheetStyles());

  // Create floating button
  const trigger = document.createElement('button');
  trigger.className = 'ct-sheet-trigger ct-container';
  trigger.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6m-6 4h4"/>
    </svg>
  `;
  trigger.title = 'Open transcript';

  // Create sheet container
  const container = document.createElement('div');
  container.className = 'ct-bottom-sheet ct-container';

  // Create handle
  const handle = document.createElement('div');
  handle.className = 'ct-sheet-handle';
  handle.innerHTML = '<div class="ct-sheet-handle-bar"></div>';

  // Create content container
  const content = document.createElement('div');
  content.className = 'ct-sheet-content';

  container.appendChild(handle);
  container.appendChild(content);

  shadow.appendChild(trigger);
  shadow.appendChild(container);

  // State
  let panelController: TranscriptPanelController | null = null;
  let currentPosition: SheetPosition = 'hidden';
  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

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

  function setSheetHeight(percentage: number): void {
    container.style.height = `${percentage}%`;
  }

  function snapToPosition(position: SheetPosition): void {
    currentPosition = position;
    setSheetHeight(SNAP_POSITIONS[position]);

    if (position === 'hidden') {
      container.classList.remove('ct-sheet-open');
      trigger.classList.remove('ct-trigger-hidden');
    } else {
      container.classList.add('ct-sheet-open');
      trigger.classList.add('ct-trigger-hidden');
    }
  }

  function findNearestSnap(percentage: number): SheetPosition {
    const positions: SheetPosition[] = ['hidden', 'peek', 'half', 'full'];
    let nearest: SheetPosition = 'hidden';
    let minDistance = Infinity;

    for (const pos of positions) {
      const distance = Math.abs(SNAP_POSITIONS[pos] - percentage);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = pos;
      }
    }

    return nearest;
  }

  // Trigger click
  trigger.addEventListener('click', () => {
    controller.open();
  });

  // Handle drag
  function handleDragStart(e: MouseEvent | TouchEvent): void {
    isDragging = true;
    startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startHeight = container.offsetHeight;
    container.classList.add('ct-sheet-dragging');
  }

  function handleDragMove(e: MouseEvent | TouchEvent): void {
    if (!isDragging) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = startY - clientY;
    const containerHeight = container.parentElement?.clientHeight || window.innerHeight;
    const newHeight = startHeight + deltaY;
    const percentage = clamp((newHeight / containerHeight) * 100, 0, 90);

    setSheetHeight(percentage);
  }

  function handleDragEnd(): void {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove('ct-sheet-dragging');

    // Snap to nearest position
    const containerHeight = container.parentElement?.clientHeight || window.innerHeight;
    const currentPercentage = (container.offsetHeight / containerHeight) * 100;
    const nearestPosition = findNearestSnap(currentPercentage);
    snapToPosition(nearestPosition);
  }

  // Mouse events
  handle.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);

  // Touch events
  handle.addEventListener('touchstart', handleDragStart, { passive: true });
  document.addEventListener('touchmove', handleDragMove, { passive: true });
  document.addEventListener('touchend', handleDragEnd);

  // Controller
  const controller: BottomSheetController = {
    isBottomSheet: true,

    isOpen() {
      return currentPosition !== 'hidden';
    },

    open() {
      initPanel();
      snapToPosition('half');
    },

    close() {
      snapToPosition('hidden');
    },

    toggle() {
      if (currentPosition === 'hidden') {
        controller.open();
      } else {
        controller.close();
      }
    },

    setPosition(position: SheetPosition) {
      snapToPosition(position);
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
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    panelController?.destroy();
    trigger.remove();
    container.remove();
  };

  return { controller, cleanup };
}

/**
 * Get bottom sheet styles
 */
function getBottomSheetStyles(): string {
  return `
    .ct-sheet-trigger {
      position: absolute;
      right: 12px;
      bottom: 100px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--ct-bg);
      border: 1px solid var(--ct-border);
      box-shadow: var(--ct-shadow);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ct-text);
      transition: all var(--ct-transition);
      z-index: 10;
    }

    .ct-sheet-trigger:hover {
      transform: scale(1.05);
      background: var(--ct-bg-secondary);
    }

    .ct-trigger-hidden {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.8);
    }

    .ct-bottom-sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 0;
      background: var(--ct-bg);
      border-radius: var(--ct-radius) var(--ct-radius) 0 0;
      box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      transition: height 0.3s ease;
      overflow: hidden;
      z-index: 100;
    }

    .ct-sheet-open {
      pointer-events: auto;
    }

    .ct-sheet-dragging {
      transition: none;
    }

    .ct-sheet-handle {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      cursor: grab;
    }

    .ct-sheet-handle:active {
      cursor: grabbing;
    }

    .ct-sheet-handle-bar {
      width: 40px;
      height: 4px;
      background: var(--ct-border);
      border-radius: 2px;
    }

    .ct-sheet-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `;
}
