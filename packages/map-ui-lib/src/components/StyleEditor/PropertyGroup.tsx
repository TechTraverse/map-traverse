import type { PropertyDefinition } from './propertyMetadata';
import type { AvailableProperty, FetchDistinctValuesFn } from '../../types';
import { PropertyField } from './PropertyField';
import { CollapsibleSection } from '../admin/CollapsibleSection';
import type { ColorThemeId } from '../../utils/colorThemes';

interface PropertyGroupProps {
  title: string;
  properties: PropertyDefinition[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  defaultOpen?: boolean;
  availableIcons?: string[];
  availableProperties?: AvailableProperty[];
  onFetchDistinctValues?: FetchDistinctValuesFn;
  colorTheme?: ColorThemeId;
  onColorThemeChange?: (theme: ColorThemeId) => void;
}

export function PropertyGroup({
  title,
  properties,
  values,
  onChange,
  defaultOpen = false,
  availableIcons,
  availableProperties,
  onFetchDistinctValues,
  colorTheme,
  onColorThemeChange,
}: PropertyGroupProps) {
  const enabledCount = properties.filter(
    (p) => p.enableDefault !== undefined && values[p.key] !== undefined,
  ).length;

  return (
    <CollapsibleSection title={title} defaultOpen={defaultOpen} badge={enabledCount || undefined}>
      <div className="mapui:flex mapui:flex-col mapui:gap-2">
        {properties.map((def) => (
          <PropertyField
            key={def.key}
            def={def}
            value={values[def.key]}
            onChange={onChange}
            availableIcons={availableIcons}
            availableProperties={availableProperties}
            onFetchDistinctValues={onFetchDistinctValues}
            colorTheme={colorTheme}
            onColorThemeChange={onColorThemeChange}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}
