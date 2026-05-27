/**
 * Pure orchestration helpers for the global search feature.
 *
 * No React, no Zustand. Consumes the lib's `fetchFeatures` / `fetchDistinctValuesMulti`
 * and the CQL2 `like` / `or` builders to fan a single user query out across
 * multiple layers, one request per layer.
 */
import { fetchFeatures, fetchDistinctValuesMulti } from './ogcApi';
import { like, or, inList, type CQL2Expression } from './cql2';
import type {
  GlobalSearchConfig,
  LayerConfig,
  OgcApiSource,
  SourceAuth,
} from '../types';
import type {
  FeatureMatch as GlobalSearchFeatureMatch,
  GroupedResults as GlobalSearchGroupedResults,
} from '../components/GlobalSearchBar/GlobalSearchBar';

export interface GlobalSearchContext {
  config: GlobalSearchConfig;
  layers: LayerConfig[];
  sources: OgcApiSource[];
  prefetchedValues: Record<string, string[]>;
}

/** Distinct-value cache key: `${layerId}:${property}`. */
export const prefetchKey = (layerId: string, property: string): string =>
  `${layerId}:${property}`;

/**
 * Cap on values fed into a single prefetch-driven `IN (...)` filter, to keep
 * the resulting OGC API URL bounded. The downstream fetch is still bounded by
 * `maxResultsPerLayer`, so truncating the IN list only affects very high-cardinality
 * queries that would otherwise hit URL-length limits.
 */
const MAX_PREFETCH_MATCHES = 500;

function resolveLayerSource(
  ctx: GlobalSearchContext,
  layerId: string,
): { layer: LayerConfig; source: OgcApiSource; auth?: SourceAuth } | null {
  const layer = ctx.layers.find((l) => l.id === layerId);
  if (!layer) return null;
  const source = ctx.sources.find((s) => s.id === layer.sourceId);
  if (!source) return null;
  return { layer, source, auth: source.auth };
}

/**
 * Per-layer cap on features walked to populate the distinct-value cache. The cache
 * is an *acceleration*, not a gate: when a user's substring is absent from the
 * cache, `buildLayerExpression` falls back to a server-side multi-case `like`, so a
 * modest cap is safe and keeps mount-time bandwidth bounded.
 */
const PREFETCH_MAX_FEATURES_PER_LAYER = 2000;

/**
 * At mount time, fetch distinct values for every property with `prefetch: true`.
 * One paginated walk per layer (all configured properties pulled in the same pages).
 * Uses `Promise.allSettled` so a single failure never aborts the full sweep.
 * Results are keyed by `${layerId}:${property}`.
 */
export async function prefetchAllDistinctValues(
  ctx: GlobalSearchContext,
  signal: AbortSignal,
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};

  const tasks: Array<Promise<void>> = [];
  for (const layerCfg of ctx.config.layers) {
    const resolved = resolveLayerSource(ctx, layerCfg.layerId);
    if (!resolved) continue;
    const properties = layerCfg.properties
      .filter((p) => p.prefetch)
      .map((p) => p.property);
    if (properties.length === 0) continue;

    const task = fetchDistinctValuesMulti(
      resolved.source.url,
      resolved.layer.collection,
      properties,
      { maxFeatures: PREFETCH_MAX_FEATURES_PER_LAYER },
      resolved.auth,
      signal,
    )
      .then((perProperty) => {
        for (const property of properties) {
          out[prefetchKey(layerCfg.layerId, property)] = perProperty[property] ?? [];
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        console.warn(
          `[globalSearchFetcher] Prefetch failed for layer "${layerCfg.layerId}":`,
          err,
        );
      });
    tasks.push(task);
  }

  await Promise.allSettled(tasks);
  return out;
}

/**
 * Build a case-insensitive substring filter as an OR of `like` patterns covering
 * common casings (original, UPPER, lower, Title). tipg/pygeofilter `LIKE` is
 * case-sensitive and the CQL2 `casei()` function is not supported there, so we
 * emit multiple casings server-side instead. Duplicates are deduped.
 */
function caseInsensitiveLikeFallback(property: string, query: string): CQL2Expression {
  const variants = Array.from(
    new Set([
      query,
      query.toUpperCase(),
      query.toLowerCase(),
      query.charAt(0).toUpperCase() + query.slice(1).toLowerCase(),
    ]),
  );
  const exprs = variants.map((v) => like(property, `%${v}%`));
  if (exprs.length === 1) return exprs[0];
  return or(...exprs)!;
}

/**
 * Build a single CQL2 expression for a layer by OR-ing per-property matchers.
 *
 * `autocomplete` is the master switch: properties without it are skipped.
 * For autocomplete properties:
 * - `prefetch` true + cache loaded with substring matches: emit `IN (...)` against
 *   the cached distinct values (the IN list is computed case-insensitively client-side).
 * - `prefetch` true + cache not yet loaded OR no substring matches in cache: fall back
 *   to a multi-case `like` OR. The cache is an *acceleration*, not a gate — an
 *   empty match against the (potentially truncated) cache must never short-circuit
 *   the server query, or genuinely-present features become unreachable.
 * - `prefetch` false: multi-case `like` OR (server-side, no cache).
 *
 * Returns `null` only when every property is gated by `autocomplete: false`.
 */
function buildLayerExpression(
  ctx: GlobalSearchContext,
  layerId: string,
  properties: GlobalSearchConfig['layers'][number]['properties'],
  query: string,
): CQL2Expression | null {
  const q = query.toLowerCase();
  const expressions: CQL2Expression[] = [];

  for (const prop of properties) {
    if (!prop.autocomplete) continue;

    if (prop.prefetch) {
      const cached = ctx.prefetchedValues[prefetchKey(layerId, prop.property)];
      const matched = cached?.filter((v) => v.toLowerCase().includes(q));
      if (matched && matched.length > 0) {
        expressions.push(
          inList(prop.property, matched.slice(0, MAX_PREFETCH_MATCHES)),
        );
        continue;
      }
      expressions.push(caseInsensitiveLikeFallback(prop.property, query));
      continue;
    }

    expressions.push(caseInsensitiveLikeFallback(prop.property, query));
  }

  if (expressions.length === 0) return null;
  if (expressions.length === 1) return expressions[0];
  return or(...expressions);
}

/** Pick the best label for a feature by finding the first configured property whose stringified value contains the query. */
function pickLabelAndProperty(
  props: Record<string, unknown> | null | undefined,
  configured: GlobalSearchConfig['layers'][number]['properties'],
  query: string,
  featureId: string | number | undefined,
): { label: string; matchedProperty: string } {
  const q = query.toLowerCase();
  if (props) {
    for (const p of configured) {
      const v = props[p.property];
      if (v == null) continue;
      const s = String(v);
      if (s.toLowerCase().includes(q)) {
        return { label: s, matchedProperty: p.property };
      }
    }
  }
  const fallback =
    props && typeof props.name === 'string' ? props.name : String(featureId ?? '');
  return { label: fallback, matchedProperty: configured[0]?.property ?? '' };
}

/**
 * Run a global-search query against every configured layer in parallel.
 *
 * Behavior:
 * - One `fetchFeatures` call per layer (properties collapsed into a single OR expression).
 * - Per-layer failures are logged and dropped; layers with no matches are absent from the result.
 * - Features are deduped within a layer by `${layerId}:${featureId}`.
 * - On `AbortError` the promise rejects so the caller can ignore in-flight stale results.
 */
export async function runGlobalSearch(
  ctx: GlobalSearchContext,
  query: string,
  signal: AbortSignal,
): Promise<GlobalSearchGroupedResults> {
  const perLayer = ctx.config.layers.map(async (layerCfg) => {
    const resolved = resolveLayerSource(ctx, layerCfg.layerId);
    if (!resolved) return null;

    const expression = buildLayerExpression(
      ctx,
      layerCfg.layerId,
      layerCfg.properties,
      query,
    );
    if (!expression) return null;

    const featureCollection = await fetchFeatures(
      resolved.source.url,
      resolved.layer.collection,
      { cql2Filter: expression, limit: ctx.config.maxResultsPerLayer },
      resolved.auth,
      signal,
    );

    const seen = new Set<string>();
    const matches: GlobalSearchFeatureMatch[] = [];

    for (const feature of featureCollection.features) {
      const featureId = feature.id ?? '';
      const dedupeKey = `${layerCfg.layerId}:${String(featureId)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const properties =
        (feature.properties as Record<string, unknown> | null | undefined) ?? undefined;
      const { label, matchedProperty } = pickLabelAndProperty(
        properties,
        layerCfg.properties,
        query,
        feature.id,
      );

      matches.push({
        id: (feature.id ?? dedupeKey) as string | number,
        label,
        matchedProperty,
        geometry: feature.geometry as unknown as GeoJSON.Geometry,
        properties,
      });
    }

    return { layerId: layerCfg.layerId, layer: resolved.layer, matches };
  });

  const settled = await Promise.allSettled(perLayer);

  const out: GlobalSearchGroupedResults = {};
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === 'rejected') {
      const err = result.reason as { name?: string } | undefined;
      if (err?.name === 'AbortError') {
        throw result.reason;
      }
      console.warn(
        `[globalSearchFetcher] Layer "${ctx.config.layers[i]?.layerId}" search failed:`,
        result.reason,
      );
      continue;
    }
    const value = result.value;
    if (!value || value.matches.length === 0) continue;
    out[value.layerId] = { layer: value.layer, matches: value.matches };
  }

  return out;
}
