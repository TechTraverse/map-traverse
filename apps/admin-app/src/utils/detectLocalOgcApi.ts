/**
 * Runs entirely from the browser: the admin server has no env var for its own
 * external origin and (for localhost deployments) can't reach itself across
 * docker networking — but the browser always can.
 */

import { inspectSourceClientSide } from './inspectSource';

export type DetectResult =
  | 'added'
  | 'skipped-existing-url'
  | 'skipped-no-ogc'
  | 'skipped-conflict'
  | 'skipped-error';

interface Deps {
  fetch: typeof fetch;
  origin: string;
}

interface SourceSummary {
  url: string;
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  try {
    const u = new URL(trimmed);
    // Preserve path case — tipg collection ids are case-sensitive.
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${u.pathname}${u.search}`;
  } catch {
    return trimmed;
  }
}

export async function detectLocalOgcApi({ fetch, origin }: Deps): Promise<DetectResult> {
  const candidateUrl = `${origin}/ogc/`;
  const normalizedCandidate = normalizeUrl(candidateUrl);

  try {
    const [probe, sourcesRes] = await Promise.all([
      fetch(`${candidateUrl}?f=json`),
      fetch('/api/sources', { credentials: 'include' }),
    ]);

    if (!probe.ok) return 'skipped-no-ogc';
    let landing: unknown;
    try {
      landing = await probe.json();
    } catch {
      return 'skipped-no-ogc';
    }
    if (
      !landing ||
      typeof landing !== 'object' ||
      typeof (landing as { title?: unknown }).title !== 'string'
    ) {
      return 'skipped-no-ogc';
    }

    if (!sourcesRes.ok) return 'skipped-error';
    const sources = (await sourcesRes.json()) as SourceSummary[];
    if (sources.some((s) => normalizeUrl(s.url ?? '') === normalizedCandidate)) {
      return 'skipped-existing-url';
    }

    const metadata = await inspectSourceClientSide(candidateUrl);

    const postRes = await fetch('/api/sources', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_id: 'tipg-local',
        url: candidateUrl,
        label: 'Local OGC API',
        source_type: 'features',
        proxy: false,
        metadata,
      }),
    });
    if (postRes.status === 409) return 'skipped-conflict';
    if (!postRes.ok) return 'skipped-error';
    return 'added';
  } catch {
    return 'skipped-error';
  }
}
