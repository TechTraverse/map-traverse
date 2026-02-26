import type { PropertyDisplayConfigInput } from '../types';

export function resolvePropertyDisplay(
  propertyDisplay: PropertyDisplayConfigInput | undefined,
): { fields: string[]; labels: Record<string, string> } | undefined {
  if (!propertyDisplay) return undefined;
  const fields: string[] = [];
  const labels: Record<string, string> = {};
  for (const [key, config] of Object.entries(propertyDisplay)) {
    if (config.visible === false) continue;
    fields.push(key);
    if (config.label) labels[key] = config.label;
  }
  return { fields, labels };
}
