/** Mode for selecting features on the map. */
export type SelectionMode = 'click' | 'box';

/** A feature selected on the map. */
export interface SelectedFeature {
  id: string | number | undefined;
  layerId: string;
  properties: Record<string, unknown>;
  geometry: Record<string, unknown>;
}

/** Build a unique key for a selected feature for deduplication. */
export function selectedFeatureKey(feature: SelectedFeature): string {
  if (feature.id != null) return `${feature.layerId}:${feature.id}`;
  return `${feature.layerId}:${JSON.stringify(feature.properties)}`;
}
