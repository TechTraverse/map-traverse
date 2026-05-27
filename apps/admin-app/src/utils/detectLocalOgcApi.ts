/**
 * Best-effort auto-detect of a co-deployed OGC API at `${origin}/ogc/` and
 * register it as an admin source, but only if no source already points there.
 *
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

/** Strip trailing slashes and lowercase scheme+host for URL equality checks. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  try {
    const u = new URL(trimmed);
    // Lowercase scheme+host; preserve path case (tipg collection ids are case-sensitive)
    return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${u.pathname}${u.search}`;
  } catch {
    return trimmed;
  }
}

export async function detectLocalOgcApi({ fetch, origin }: Deps): Promise<DetectResult> {
  const candidateUrl = `${origin}/ogc/`;
  const normalizedCandidate = normalizeUrl(candidateUrl);

  // 1. Probe for an OGC landing page
  let probe: Response;
  try {
    probe = await fetch(`${candidateUrl}?f=json`);
  } catch {
    return 'skipped-error';
  }
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

  // 2. Idempotency: skip if any existing source uses this URL
  let sourcesRes: Response;
  try {
    sourcesRes = await fetch('/api/sources', { credentials: 'include' });
  } catch {
    return 'skipped-error';
  }
  if (!sourcesRes.ok) return 'skipped-error';
  let sources: SourceSummary[];
  try {
    sources = (await sourcesRes.json()) as SourceSummary[];
  } catch {
    return 'skipped-error';
  }
  if (sources.some((s) => normalizeUrl(s.url ?? '') === normalizedCandidate)) {
    return 'skipped-existing-url';
  }

  // 3. Client-side inspection (the browser can reach its own origin reliably)
  let metadata;
  try {
    metadata = await inspectSourceClientSide(candidateUrl);
  } catch {
    return 'skipped-error';
  }

  // 4. Create the source
  let postRes: Response;
  try {
    postRes = await fetch('/api/sources', {
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
  } catch {
    return 'skipped-error';
  }
  if (postRes.status === 409) return 'skipped-conflict';
  if (!postRes.ok) return 'skipped-error';
  return 'added';
}
