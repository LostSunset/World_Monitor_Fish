/**
 * Data Bridge Service
 * Transforms WorldMonitor real-time data formats into MiroFish-compatible input.
 */

export interface WMEvent {
  id: string;
  domain: string;
  title: string;
  description: string;
  timestamp: string;
  source: string;
  location?: { lat: number; lng: number; country?: string };
  entities?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface MFDocumentInput {
  text_content: string;
  requirement: string;
  metadata?: Record<string, string>;
}

const DOMAIN_TEMPLATES: Record<string, string> = {
  conflict: 'Analyze the geopolitical conflict events and predict how social media narratives will evolve, including public sentiment, misinformation spread, and international response.',
  finance: 'Analyze the financial market events and predict social media reactions, investor sentiment trends, and potential market narrative shifts.',
  climate: 'Analyze the climate/environmental events and predict social media discourse patterns, public awareness shifts, and policy discussion trends.',
  cyber: 'Analyze the cybersecurity events and predict social media reactions, public concern levels, and discourse around digital security.',
  maritime: 'Analyze the maritime/shipping events and predict their social media impact on supply chain concerns and geopolitical narratives.',
};

/**
 * Convert a batch of WorldMonitor events into a MiroFish document input.
 */
export function convertWMEventsToMFInput(domain: string, topic: string, events: WMEvent[]): MFDocumentInput {
  const lines: string[] = [
    `# ${formatDomainTitle(domain)} Intelligence Briefing: ${topic}`,
    `Report generated: ${new Date().toISOString()}`,
    `Source: WorldMonitor Real-time Intelligence Platform`,
    `Events analyzed: ${events.length}`,
    '',
  ];

  // Group events by severity if available
  const critical = events.filter(e => e.severity === 'critical');
  const high = events.filter(e => e.severity === 'high');
  const rest = events.filter(e => !e.severity || e.severity === 'medium' || e.severity === 'low');

  if (critical.length > 0) {
    lines.push('## Critical Events', '');
    for (const event of critical) lines.push(...formatEvent(event));
  }

  if (high.length > 0) {
    lines.push('## High Priority Events', '');
    for (const event of high) lines.push(...formatEvent(event));
  }

  if (rest.length > 0) {
    lines.push('## Events', '');
    for (const event of rest) lines.push(...formatEvent(event));
  }

  // Extract all unique entities for context
  const allEntities = [...new Set(events.flatMap(e => e.entities || []))];
  if (allEntities.length > 0) {
    lines.push('## Key Entities', '');
    lines.push(allEntities.map(e => `- ${e}`).join('\n'));
    lines.push('');
  }

  return {
    text_content: lines.join('\n'),
    requirement: DOMAIN_TEMPLATES[domain] || `Analyze ${domain} events about "${topic}" and predict social media reactions and public discourse evolution.`,
    metadata: {
      source: 'worldmonitor',
      domain,
      topic,
      event_count: String(events.length),
    },
  };
}

function formatEvent(event: WMEvent): string[] {
  const lines: string[] = [];
  lines.push(`### ${event.title}`);
  lines.push(`- **Time**: ${event.timestamp}`);
  lines.push(`- **Source**: ${event.source}`);
  if (event.location) {
    const loc = event.location;
    lines.push(`- **Location**: ${loc.country || `${loc.lat}, ${loc.lng}`}`);
  }
  if (event.entities?.length) {
    lines.push(`- **Entities**: ${event.entities.join(', ')}`);
  }
  lines.push('');
  lines.push(event.description);
  lines.push('');
  return lines;
}

function formatDomainTitle(domain: string): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}
