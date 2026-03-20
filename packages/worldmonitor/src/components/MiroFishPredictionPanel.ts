import { Panel } from './Panel';
import { h, replaceChildren } from '@/utils/dom-utils';
import { escapeHtml } from '@/utils/sanitize';

interface Prediction {
  statement: string;
  confidence: number;
  supportingAgents: number;
  opposingAgents: number;
  timeframe?: string;
}

interface PredictionData {
  simulationId: string;
  topic: string;
  domain: string;
  predictions: Prediction[];
  agentConsensus: number;
  sentimentTrend: string;
  summary: string;
  generatedAt: string;
}

export class MiroFishPredictionPanel extends Panel {
  private listEl: HTMLElement;
  private emptyEl: HTMLElement;
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor() {
    super({
      id: 'mirofish-predictions',
      title: 'MiroFish Predictions',
      infoTooltip: 'AI agent swarm predictions powered by MiroFish simulation engine.',
    });

    this.emptyEl = h('div', { className: 'mf-prediction-empty' },
      h('p', {}, 'No active predictions.'),
      h('p', { className: 'mf-prediction-hint' }, 'Trigger a simulation from the Swarm Intelligence panel to generate predictions.'),
    );

    this.listEl = h('div', { className: 'mf-prediction-list' });

    const container = h('div', { className: 'mf-prediction-panel-content' },
      this.emptyEl,
      this.listEl,
    );

    replaceChildren(this.content, container);
  }

  override onAttach(): void {
    this.loadPredictions();
    this.pollTimer = setInterval(() => this.loadPredictions(), 60_000);
  }

  override onDetach(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async loadPredictions(): Promise<void> {
    try {
      const resp = await fetch('/api/integration/results/predictions');
      if (!resp.ok) return;
      const data = await resp.json();
      if (data?.predictions?.length) {
        this.renderPredictions(data as PredictionData);
      }
    } catch {
      // Silently fail — panel will show empty state
    }
  }

  private renderPredictions(data: PredictionData): void {
    this.emptyEl.style.display = 'none';
    this.listEl.innerHTML = '';

    const header = h('div', { className: 'mf-prediction-header' },
      h('span', { className: 'mf-prediction-topic' }, escapeHtml(data.topic)),
      h('span', { className: `mf-prediction-sentiment mf-prediction-sentiment--${data.sentimentTrend}` },
        this.getSentimentIcon(data.sentimentTrend) + ' ' + data.sentimentTrend,
      ),
    );
    this.listEl.appendChild(header);

    const consensusPercent = Math.round(data.agentConsensus * 100);
    const consensusBar = h('div', { className: 'mf-prediction-consensus' },
      h('div', { className: 'mf-prediction-consensus-label' }, `Agent Consensus: ${consensusPercent}%`),
      h('div', { className: 'mf-prediction-consensus-bar' },
        h('div', {
          className: 'mf-prediction-consensus-fill',
          style: `width: ${consensusPercent}%`,
        }),
      ),
    );
    this.listEl.appendChild(consensusBar);

    if (data.summary) {
      this.listEl.appendChild(h('p', { className: 'mf-prediction-summary' }, escapeHtml(data.summary)));
    }

    for (const pred of data.predictions.slice(0, 10)) {
      const confidenceClass = pred.confidence >= 0.7 ? 'high' : pred.confidence >= 0.4 ? 'medium' : 'low';
      const total = pred.supportingAgents + pred.opposingAgents;
      const supportPct = total > 0 ? Math.round((pred.supportingAgents / total) * 100) : 50;

      const predEl = h('div', { className: 'mf-prediction-item' },
        h('div', { className: 'mf-prediction-statement' }, escapeHtml(pred.statement)),
        h('div', { className: 'mf-prediction-meta' },
          h('span', { className: `mf-prediction-confidence mf-prediction-confidence--${confidenceClass}` },
            `${Math.round(pred.confidence * 100)}% confidence`,
          ),
          h('span', { className: 'mf-prediction-agents' },
            `${supportPct}% support (${pred.supportingAgents}/${total} agents)`,
          ),
          pred.timeframe
            ? h('span', { className: 'mf-prediction-timeframe' }, escapeHtml(pred.timeframe))
            : null,
        ),
      );
      this.listEl.appendChild(predEl);
    }

    this.listEl.appendChild(h('div', { className: 'mf-prediction-time' },
      `Generated: ${new Date(data.generatedAt).toLocaleString()}`,
    ));

    this.setCount(data.predictions.length);
  }

  private getSentimentIcon(trend: string): string {
    switch (trend) {
      case 'positive': return '\u25B2';
      case 'negative': return '\u25BC';
      case 'mixed': return '\u25C6';
      default: return '\u25CF';
    }
  }
}
