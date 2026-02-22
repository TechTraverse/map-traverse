import type { StyleConfig, FillStyle, LineStyle, CircleStyle } from '../../types';
import { ColorPicker } from '../admin/ColorPicker';
import { FormField } from '../admin/FormField';

export interface StyleEditorProps {
  value: StyleConfig;
  onChange: (style: StyleConfig) => void;
}

const defaultFill: FillStyle = {
  type: 'fill',
  paint: { 'fill-color': '#4a90d9', 'fill-opacity': 0.6 },
};

const defaultLine: LineStyle = {
  type: 'line',
  paint: { 'line-color': '#2980b9', 'line-width': 2, 'line-opacity': 1 },
};

const defaultCircle: CircleStyle = {
  type: 'circle',
  paint: { 'circle-color': '#e74c3c', 'circle-radius': 5, 'circle-opacity': 0.9 },
};

const inputClass =
  'mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

function StylePreview({ style }: { style: StyleConfig }) {
  if (style.type === 'fill') {
    return (
      <div
        className="mapui:h-8 mapui:w-full mapui:rounded mapui:border mapui:border-gray-200"
        style={{
          backgroundColor: style.paint['fill-color'],
          opacity: style.paint['fill-opacity'],
          outline: style.paint['fill-outline-color']
            ? `2px solid ${style.paint['fill-outline-color']}`
            : undefined,
        }}
        aria-label="Style preview"
      />
    );
  }
  if (style.type === 'line') {
    return (
      <div
        className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:rounded mapui:border mapui:border-gray-200 mapui:px-2"
        aria-label="Style preview"
      >
        <div
          style={{
            width: '100%',
            height: style.paint['line-width'],
            backgroundColor: style.paint['line-color'],
            opacity: style.paint['line-opacity'],
          }}
        />
      </div>
    );
  }
  // circle
  return (
    <div
      className="mapui:flex mapui:h-8 mapui:w-full mapui:items-center mapui:justify-center mapui:rounded mapui:border mapui:border-gray-200"
      aria-label="Style preview"
    >
      <div
        style={{
          width: style.paint['circle-radius'] * 2,
          height: style.paint['circle-radius'] * 2,
          backgroundColor: style.paint['circle-color'],
          opacity: style.paint['circle-opacity'],
          borderRadius: '50%',
          border: style.paint['circle-stroke-color']
            ? `${style.paint['circle-stroke-width'] ?? 1}px solid ${style.paint['circle-stroke-color']}`
            : undefined,
        }}
      />
    </div>
  );
}

export function StyleEditor({ value, onChange }: StyleEditorProps) {
  const handleTypeChange = (type: StyleConfig['type']) => {
    if (type === 'fill') onChange(defaultFill);
    else if (type === 'line') onChange(defaultLine);
    else onChange(defaultCircle);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <FormField label="Style Type">
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value as StyleConfig['type'])}
          className={inputClass}
        >
          <option value="fill">Fill</option>
          <option value="line">Line</option>
          <option value="circle">Circle</option>
        </select>
      </FormField>

      <div className="mapui:rounded mapui:border mapui:border-gray-100 mapui:p-2">
        <p className="mapui:m-0 mapui:mb-1 mapui:text-xs mapui:text-gray-500">Preview</p>
        <StylePreview style={value} />
      </div>

      {value.type === 'fill' && (
        <>
          <FormField label="Fill Color">
            <ColorPicker
              value={value.paint['fill-color']}
              onChange={(color) =>
                onChange({ ...value, paint: { ...value.paint, 'fill-color': color } })
              }
              label="Fill color"
            />
          </FormField>
          <FormField label="Fill Opacity">
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={value.paint['fill-opacity']}
                onChange={(e) =>
                  onChange({
                    ...value,
                    paint: { ...value.paint, 'fill-opacity': parseFloat(e.target.value) },
                  })
                }
                className="mapui:flex-1"
              />
              <span className="mapui:w-8 mapui:text-right mapui:text-xs mapui:text-gray-600">
                {value.paint['fill-opacity'].toFixed(2)}
              </span>
            </div>
          </FormField>
          <FormField label="Fill Outline Color (optional)">
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <input
                type="checkbox"
                checked={value.paint['fill-outline-color'] !== undefined}
                onChange={(e) =>
                  onChange({
                    ...value,
                    paint: {
                      ...value.paint,
                      'fill-outline-color': e.target.checked ? '#000000' : undefined,
                    },
                  })
                }
                className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
              />
              {value.paint['fill-outline-color'] !== undefined && (
                <ColorPicker
                  value={value.paint['fill-outline-color']}
                  onChange={(color) =>
                    onChange({
                      ...value,
                      paint: { ...value.paint, 'fill-outline-color': color },
                    })
                  }
                  label="Outline color"
                />
              )}
            </div>
          </FormField>
        </>
      )}

      {value.type === 'line' && (
        <>
          <FormField label="Line Color">
            <ColorPicker
              value={value.paint['line-color']}
              onChange={(color) =>
                onChange({ ...value, paint: { ...value.paint, 'line-color': color } })
              }
              label="Line color"
            />
          </FormField>
          <FormField label="Line Width">
            <input
              type="number"
              min={0}
              step={0.5}
              value={value.paint['line-width']}
              onChange={(e) =>
                onChange({
                  ...value,
                  paint: { ...value.paint, 'line-width': parseFloat(e.target.value) || 0 },
                })
              }
              className={inputClass}
            />
          </FormField>
          <FormField label="Line Opacity">
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={value.paint['line-opacity']}
                onChange={(e) =>
                  onChange({
                    ...value,
                    paint: { ...value.paint, 'line-opacity': parseFloat(e.target.value) },
                  })
                }
                className="mapui:flex-1"
              />
              <span className="mapui:w-8 mapui:text-right mapui:text-xs mapui:text-gray-600">
                {value.paint['line-opacity'].toFixed(2)}
              </span>
            </div>
          </FormField>
          <FormField label="Dash Array (optional, comma-separated)">
            <input
              type="text"
              value={value.paint['line-dasharray']?.join(', ') ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                const dasharray = raw
                  ? raw.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n))
                  : undefined;
                onChange({
                  ...value,
                  paint: { ...value.paint, 'line-dasharray': dasharray },
                });
              }}
              placeholder="e.g. 2, 4"
              className={inputClass}
            />
          </FormField>
        </>
      )}

      {value.type === 'circle' && (
        <>
          <FormField label="Circle Color">
            <ColorPicker
              value={value.paint['circle-color']}
              onChange={(color) =>
                onChange({ ...value, paint: { ...value.paint, 'circle-color': color } })
              }
              label="Circle color"
            />
          </FormField>
          <FormField label="Circle Radius">
            <input
              type="number"
              min={0}
              step={1}
              value={value.paint['circle-radius']}
              onChange={(e) =>
                onChange({
                  ...value,
                  paint: {
                    ...value.paint,
                    'circle-radius': parseFloat(e.target.value) || 0,
                  },
                })
              }
              className={inputClass}
            />
          </FormField>
          <FormField label="Circle Opacity">
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={value.paint['circle-opacity']}
                onChange={(e) =>
                  onChange({
                    ...value,
                    paint: {
                      ...value.paint,
                      'circle-opacity': parseFloat(e.target.value),
                    },
                  })
                }
                className="mapui:flex-1"
              />
              <span className="mapui:w-8 mapui:text-right mapui:text-xs mapui:text-gray-600">
                {value.paint['circle-opacity'].toFixed(2)}
              </span>
            </div>
          </FormField>
          <FormField label="Stroke Color (optional)">
            <div className="mapui:flex mapui:items-center mapui:gap-2">
              <input
                type="checkbox"
                checked={value.paint['circle-stroke-color'] !== undefined}
                onChange={(e) =>
                  onChange({
                    ...value,
                    paint: {
                      ...value.paint,
                      'circle-stroke-color': e.target.checked ? '#000000' : undefined,
                      'circle-stroke-width': e.target.checked ? 1 : undefined,
                    },
                  })
                }
                className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
              />
              {value.paint['circle-stroke-color'] !== undefined && (
                <ColorPicker
                  value={value.paint['circle-stroke-color']}
                  onChange={(color) =>
                    onChange({
                      ...value,
                      paint: { ...value.paint, 'circle-stroke-color': color },
                    })
                  }
                  label="Stroke color"
                />
              )}
            </div>
          </FormField>
          {value.paint['circle-stroke-color'] !== undefined && (
            <FormField label="Stroke Width">
              <input
                type="number"
                min={0}
                step={1}
                value={value.paint['circle-stroke-width'] ?? 1}
                onChange={(e) =>
                  onChange({
                    ...value,
                    paint: {
                      ...value.paint,
                      'circle-stroke-width': parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className={inputClass}
              />
            </FormField>
          )}
        </>
      )}
    </div>
  );
}
