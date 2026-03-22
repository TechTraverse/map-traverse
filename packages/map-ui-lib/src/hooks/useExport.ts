import { useState, useCallback } from 'react';
import { fetchFeatures, type GeoJsonFeature } from '../utils/ogcApi';
import { downloadBlob } from '../utils/download';
import type { CQL2Expression } from '../utils/cql2';

export type FormatConverter = (
  features: GeoJsonFeature[],
  collectionId: string,
) => Promise<{ blob: Blob; filename: string }> | { blob: Blob; filename: string };

export interface UseExportOptions {
  /** Default base URL. Can be overridden per-call via runExport's baseUrl parameter. */
  baseUrl?: string;
  limit?: number;
  converters: Record<string, FormatConverter>;
}

export interface UseExportResult {
  runExport: (
    collectionId: string,
    formatId: string,
    filename: string,
    cql2Filter?: CQL2Expression,
    baseUrl?: string,
  ) => Promise<void>;
  loading: boolean;
  progress: string | null;
  error: Error | null;
}

export function useExport({
  baseUrl: defaultBaseUrl = '',
  limit = 100_000,
  converters,
}: UseExportOptions): UseExportResult {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const runExport = useCallback(
    async (
      collectionId: string,
      formatId: string,
      filename: string,
      cql2Filter?: CQL2Expression,
      baseUrl?: string,
    ) => {
      const resolvedBaseUrl = baseUrl ?? defaultBaseUrl;
      const converter = converters[formatId];
      if (!converter) {
        setError(new Error(`Unknown export format: ${formatId}`));
        return;
      }

      setLoading(true);
      setProgress('Fetching features...');
      setError(null);

      const features: GeoJsonFeature[] = [];
      const pageSize = Math.min(limit, 1000);
      let offset = 0;

      try {
        while (features.length < limit) {
          const remaining = limit - features.length;
          const batchSize = Math.min(pageSize, remaining);
          const page = await fetchFeatures(resolvedBaseUrl, collectionId, {
            limit: batchSize,
            offset,
            cql2Filter,
          });

          features.push(...page.features);
          offset += page.features.length;

          const total = page.numberMatched;
          if (total != null) {
            setProgress(`Fetching features... (${features.length} of ${total})`);
          } else {
            setProgress(`Fetching features... (${features.length})`);
          }

          const done =
            page.features.length < batchSize ||
            (total != null && offset >= total);
          if (done) break;
        }

        setProgress('Converting...');
        const result = await converter(features, collectionId);
        downloadBlob(result.blob, filename);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [defaultBaseUrl, limit, converters],
  );

  return { runExport, loading, progress, error };
}
