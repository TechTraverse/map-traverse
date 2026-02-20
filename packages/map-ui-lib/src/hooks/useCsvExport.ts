import { useState, useCallback } from 'react';
import { fetchFeatures, type GeoJsonFeature } from '../utils/ogcApi';
import { featuresToCsv, downloadCsv, type CsvExportOptions } from '../utils/csvExport';

export interface UseCsvExportOptions {
  baseUrl: string;
  limit?: number;
  csvOptions?: CsvExportOptions;
}

export interface UseCsvExportResult {
  exportCsv: (collectionId: string, filename?: string) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export function useCsvExport({
  baseUrl,
  limit = 1000,
  csvOptions,
}: UseCsvExportOptions): UseCsvExportResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportCsv = useCallback(
    async (collectionId: string, filename = `${collectionId}.csv`) => {
      setLoading(true);
      setError(null);

      const features: GeoJsonFeature[] = [];
      const pageSize = Math.min(limit, 1000);
      let offset = 0;

      try {
        while (features.length < limit) {
          const remaining = limit - features.length;
          const batchSize = Math.min(pageSize, remaining);
          const page = await fetchFeatures(baseUrl, collectionId, {
            limit: batchSize,
            offset,
          });

          features.push(...page.features);
          offset += page.features.length;

          const done =
            page.features.length < batchSize ||
            (page.numberMatched != null && offset >= page.numberMatched);
          if (done) break;
        }

        const csv = featuresToCsv(features, csvOptions);
        downloadCsv(csv, filename);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, limit, csvOptions],
  );

  return { exportCsv, loading, error };
}
