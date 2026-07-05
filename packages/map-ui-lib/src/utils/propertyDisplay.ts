import type { PropertyDisplayConfigInput } from '../types';

export function resolvePropertyDisplay(
  propertyDisplay: PropertyDisplayConfigInput | undefined,
): { fields: string[]; labels: Record<string, string> } | undefined {
  if (!propertyDisplay) return undefined;
  const fields: string[] = [];
  const labels: Record<string, string> = {};
  // Sort by explicit `order`; entries without it keep key order at the end
  // (stable sort), matching pre-`order` behavior for legacy configs.
  const entries = Object.entries(propertyDisplay).sort(
    (a, b) =>
      (a[1].order ?? Number.MAX_SAFE_INTEGER) - (b[1].order ?? Number.MAX_SAFE_INTEGER),
  );
  for (const [key, config] of entries) {
    if (config.visible === false) continue;
    fields.push(key);
    if (config.label) labels[key] = config.label;
  }
  return { fields, labels };
}
