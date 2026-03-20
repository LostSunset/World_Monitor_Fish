import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { escapeHtml } from '@/utils/sanitize';

interface SimulationSummary {
  simulationId: string;
  status: string;
  rounds: number;
  agents: number;
  platforms: string[];
  startedAt: string;
  topic: string;
}

const INTEGRATION_URL = '/api/integration';

export class SwarmIntelPanel extends Panel {
  private listEl: HTMLElement;
  private formEl: HTMLFormElement;
  private topicInput: HTMLInputElement;
  private domainSelect: HTMLSelectElement;
  private submitBtn: HTMLButtonElement;
  private statusEl: HTMLElement;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor() {
    super({
      id: 'swarm-intelligence',
      title: 'Swarm Intelligence',
      infoTooltip: 'Launch and manage MiroFish social media simulations to predict event outcomes.',
    });

    // Domain selector
    this.domainSelect = h('select', { className: 'swarm-domain-select' },
      h('option', { value: 'conflict' }, 'Conflict'),
      h('option', { value: 'finance' }, 'Finance'),
      h('option', { value: 'climate' }, 'Climate'),
      h('option', { value: 'cyber' }, 'Cyber'),
      h('option', { value: 'maritime' }, 'Maritime'),
    ) as HTMLSelectElement;

    // Topic input
    this.topicInput = h('input', {
      className: 'swarm-topic-input',
      type: 'text',
      placeholder: 'Simulation topic (e.g., "South China Sea tensions")',
      required: true,
    }) as HTMLInputElement;

    // Submit button
    this.submitBtn = h('button', {
      className: 'swarm-submit-btn',
      type: 'submit',
    }, 'Launch Simulation') as HTMLButtonElement;

    // Form
    this.formEl = h('form', { className: 'swarm-form' },
      h('div', { className: 'swarm-form-row' },
        this.domainSelect,
        this.topicInput,
      ),
      this.submitBtn,
    ) as HTMLFormElement;

    this.formEl.addEventListener('submit', this.handleSubmit.bind(this));

    // Status area
    this.statusEl = h('div', { className: 'swarm-status' });

    // Simulation list
    this.listEl = h('div', { className: 'swarm-list' });

    const container = h('div', { className: 'swarm-panel-content' },
      this.formEl,
      this.statusEl,
      this.listEl,
    );

    replaceChildren(this.content, container);
  }

  override onAttach(): void {
    this.pollTimer = setInterval(() => this.refreshSimulations(), 30_000);
  }

  override onDetach(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const topic = this.topicInput.value.trim();
    const domain = this.domainSelect.value;

    if (!topic) return;

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Launching...';
    this.statusEl.textContent = '';

    try {
      const resp = await fetch(`${INTEGRATION_URL}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          domain,
          topic,
          events: [], // Will be populated from current panel data in future
        }),
      });

      const data = await resp.json();
      if (data.success) {
        this.statusEl.innerHTML = `<span class="swarm-status-ok">Simulation triggered. Task ID: ${escapeHtml(data.task_id || 'pending')}</span>`;
        this.topicInput.value = '';
      } else {
        this.statusEl.innerHTML = `<span class="swarm-status-error">Error: ${escapeHtml(data.error || 'Unknown error')}</span>`;
      }
    } catch (err) {
      this.statusEl.innerHTML = '<span class="swarm-status-error">Failed to connect to integration service</span>';
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Launch Simulation';
    }
  }

  private async refreshSimulations(): Promise<void> {
    // Placeholder: fetch active simulations from integration service
    // Will be implemented when the full polling loop is wired up
  }

  private renderSimulation(sim: SimulationSummary): HTMLElement {
    const statusClass = sim.status === 'running' ? 'active' : sim.status === 'completed' ? 'done' : 'pending';

    return h('div', { className: `swarm-sim swarm-sim--${statusClass}` },
      h('div', { className: 'swarm-sim-header' },
        h('span', { className: 'swarm-sim-topic' }, escapeHtml(sim.topic)),
        h('span', { className: `swarm-sim-status swarm-sim-status--${statusClass}` }, sim.status),
      ),
      h('div', { className: 'swarm-sim-meta' },
        h('span', {}, `${sim.agents} agents`),
        h('span', {}, `${sim.rounds} rounds`),
        h('span', {}, sim.platforms.join(', ')),
      ),
      h('div', { className: 'swarm-sim-time' },
        `Started: ${new Date(sim.startedAt).toLocaleString()}`,
      ),
    );
  }
}
