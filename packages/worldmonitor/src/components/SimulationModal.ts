import { h } from '@/utils/dom-utils';
import { escapeHtml } from '@/utils/sanitize';

const MF_FRONTEND_URL = 'http://localhost:3001';

/**
 * SimulationModal - Opens MiroFish workflow in a modal overlay.
 * Supports both iframe (full MiroFish UI) and API-driven lightweight mode.
 */
export class SimulationModal {
  private overlay: HTMLElement;
  private modal: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private isOpen = false;

  constructor() {
    this.overlay = h('div', { className: 'sim-modal-overlay' });
    this.overlay.style.display = 'none';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    const closeBtn = h('button', { className: 'sim-modal-close' }, '\u00D7');
    closeBtn.addEventListener('click', () => this.close());

    const header = h('div', { className: 'sim-modal-header' },
      h('span', { className: 'sim-modal-title' }, 'MiroFish Simulation'),
      closeBtn,
    );

    const body = h('div', { className: 'sim-modal-body' });

    this.modal = h('div', { className: 'sim-modal' },
      header,
      body,
    );

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
  }

  /**
   * Open the modal with MiroFish frontend embedded as iframe.
   */
  open(options?: { projectId?: string; simulationId?: string }): void {
    if (this.isOpen) return;

    let url = MF_FRONTEND_URL;
    if (options?.simulationId) {
      url += `/simulation/${encodeURIComponent(options.simulationId)}`;
    } else if (options?.projectId) {
      url += `/process/${encodeURIComponent(options.projectId)}`;
    }

    const body = this.modal.querySelector('.sim-modal-body');
    if (body) {
      this.iframe = h('iframe', {
        className: 'sim-modal-iframe',
        src: url,
        style: 'width:100%;height:100%;border:none;',
      }) as HTMLIFrameElement;

      body.innerHTML = '';
      body.appendChild(this.iframe);
    }

    this.overlay.style.display = 'flex';
    this.isOpen = true;

    // Close on Escape
    document.addEventListener('keydown', this.handleKeydown);
  }

  close(): void {
    if (!this.isOpen) return;

    this.overlay.style.display = 'none';
    this.isOpen = false;

    // Clean up iframe
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe.remove();
      this.iframe = null;
    }

    document.removeEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.close();
  };

  destroy(): void {
    this.close();
    this.overlay.remove();
  }
}
