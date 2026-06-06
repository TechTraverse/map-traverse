/**
 * Client for the admin "My Data" endpoints (server/dataRoutes.ts). Uploads use
 * XMLHttpRequest so we can surface progress; the rest use fetch with session
 * cookies.
 */

export interface UploadedDataset {
  id: string;
  table_name: string;
  label: string | null;
  original_filename: string;
  format: string;
  geometry_type: string | null;
  srid: number | null;
  feature_count: number | null;
  bbox: [number, number, number, number] | null;
  crs_assumed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadOptions {
  format?: string;
  label?: string;
  srs?: string;
  geomField?: string;
  layer?: string;
  replace?: boolean;
}

export interface LayerInfo {
  name: string;
  geometryType?: string;
  featureCount?: number;
}

export interface UploadResult extends UploadedDataset {
  sourceId: string;
  collection: string;
  tipgRefreshed: boolean;
}

/** A structured error carrying the HTTP status and the server's JSON body. */
export class DataApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(typeof body.error === 'string' ? body.error : `Request failed (${status})`);
    this.name = 'DataApiError';
  }
}

export async function listDatasets(): Promise<UploadedDataset[]> {
  const res = await fetch('/api/data', { credentials: 'include' });
  if (!res.ok) throw new DataApiError(res.status, await res.json().catch(() => ({})));
  return res.json();
}

export async function deleteDataset(id: string): Promise<void> {
  const res = await fetch(`/api/data/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new DataApiError(res.status, await res.json().catch(() => ({})));
}

/** Build the multipart body for an upload — exported for unit testing. */
export function buildUploadForm(file: File, opts: UploadOptions): FormData {
  const form = new FormData();
  form.append('file', file);
  if (opts.format) form.append('format', opts.format);
  if (opts.label) form.append('label', opts.label);
  if (opts.srs) form.append('srs', opts.srs);
  if (opts.geomField) form.append('geomField', opts.geomField);
  if (opts.layer) form.append('layer', opts.layer);
  if (opts.replace) form.append('replace', 'true');
  return form;
}

/**
 * Upload a file with progress. Resolves with the created dataset, or rejects
 * with a `DataApiError` (status + body) — e.g. 409 conflict, or a 400 carrying
 * `needsLayer` + `layers` that the caller can use to re-prompt.
 */
export function uploadDataset(
  file: File,
  opts: UploadOptions,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/data/upload');
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as unknown as UploadResult);
      } else {
        reject(new DataApiError(xhr.status, body));
      }
    };
    xhr.onerror = () => reject(new DataApiError(0, { error: 'Network error' }));

    xhr.send(buildUploadForm(file, opts));
  });
}
