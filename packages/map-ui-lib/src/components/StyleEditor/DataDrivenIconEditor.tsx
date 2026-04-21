import type { AvailableProperty, FetchDistinctValuesFn } from '../../types';
import { IconImagePicker } from './IconImagePicker';
import { DataDrivenExpressionEditor } from './DataDrivenExpressionEditor';

export interface DataDrivenIconEditorProps {
  value: unknown[];
  onChange: (expr: unknown[]) => void;
  availableProperties?: AvailableProperty[];
  onFetchDistinctValues?: FetchDistinctValuesFn;
  availableIcons?: string[];
}

export function DataDrivenIconEditor({
  value,
  onChange,
  availableProperties = [],
  onFetchDistinctValues,
  availableIcons,
}: DataDrivenIconEditorProps) {
  return (
    <DataDrivenExpressionEditor<string>
      value={value}
      onChange={onChange}
      availableProperties={availableProperties}
      supportedModes={['match']}
      parseOutput={(raw) => (typeof raw === 'string' ? raw : '')}
      serializeOutput={(v) => v}
      defaultOutput={() => ''}
      renderOutputCell={({ value: icon, onChange: setIcon }) => (
        <IconImagePicker
          value={icon}
          onChange={(v) => setIcon(v ?? '')}
          availableIcons={availableIcons}
        />
      )}
      onFetchDistinctValues={onFetchDistinctValues}
      autoPopulateOutputs={(values) => values.map(() => '')}
    />
  );
}
