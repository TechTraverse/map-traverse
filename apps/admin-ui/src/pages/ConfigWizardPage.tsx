import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  SourceList,
  LayerList,
  CollectionBrowser,
  BasemapList,
  UIConfigEditor,
  ViewEditor,
  ConfigPreview,
  detectStyleTypeForCollection,
  defaultFill,
  defaultLine,
  defaultCircle,
} from '@ogc-maps/storybook-components';
import { safeValidateMapConfig } from '@ogc-maps/storybook-components/schemas';
import type {
  OgcApiSource,
  LayerConfig,
  BasemapConfig,
  UIConfig,
  ViewConfig,
  MapConfig,
} from '@ogc-maps/storybook-components';
import { MapPreview } from '../components/MapPreview';

type WizardStep = 'metadata' | 'sources' | 'layer-select' | 'layer-config' | 'basemaps' | 'ui' | 'view' | 'review';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'metadata', label: 'Metadata' },
  { key: 'sources', label: 'Sources' },
  { key: 'layer-select', label: 'Layers' },
  { key: 'layer-config', label: 'Config' },
  { key: 'basemaps', label: 'Basemaps' },
  { key: 'ui', label: 'UI' },
  { key: 'view', label: 'View' },
  { key: 'review', label: 'Review' },
];

const DEFAULT_UI_CONFIG: UIConfig = {
  showLayerPanel: true,
  showLegend: true,
  showBasemapSwitcher: true,
  showSearchPanel: false,
  showCoordinateDisplay: true,
  showFeatureDetail: true,
  showFeatureTooltip: true,
  showExportButton: true,
};

const DEFAULT_VIEW: ViewConfig = {
  latitude: 0,
  longitude: 0,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

export function ConfigWizardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('metadata');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [environments, setEnvironments] = useState<string[]>(['production']);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [previewLayout, setPreviewLayout] = useState<'horizontal' | 'vertical'>('vertical');

  // Config state
  const [sources, setSources] = useState<OgcApiSource[]>([]);
  const [layers, setLayers] = useState<LayerConfig[]>([]);
  const [basemaps, setBasemaps] = useState<BasemapConfig[]>([]);
  const [uiConfig, setUiConfig] = useState<UIConfig>(DEFAULT_UI_CONFIG);
  const [initialView, setInitialView] = useState<ViewConfig>(DEFAULT_VIEW);

  // CollectionBrowser source selector state
  const [browseSourceId, setBrowseSourceId] = useState('');

  // Load available environments
  useEffect(() => {
    fetch('/api/environments')
      .then(r => r.json())
      .then(data => setEnvironments(data as string[]))
      .catch(() => setEnvironments(['production']));
  }, []);

  const isEditing = !!id;
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  // Derived config object for save + preview
  const assembledConfig: MapConfig = { sources, layers, basemaps, ui: uiConfig, initialView };

  // Sync browseSourceId when sources change
  useEffect(() => {
    if (sources.length > 0 && !sources.find(s => s.id === browseSourceId)) {
      setBrowseSourceId(sources[0].id);
    }
  }, [sources, browseSourceId]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/configs/${id}`)
      .then(res => res.json())
      .then((data: { name?: string; description?: string; config?: MapConfig }) => {
        setName(data.name ?? '');
        setDescription(data.description ?? '');
        if ((data as { environment?: string }).environment) {
          setEnvironment((data as { environment: string }).environment);
        }
        if (data.config) {
          setSources(data.config.sources ?? []);
          setLayers(data.config.layers ?? []);
          setBasemaps(data.config.basemaps ?? []);
          setUiConfig(data.config.ui ?? DEFAULT_UI_CONFIG);
          setInitialView(data.config.initialView ?? DEFAULT_VIEW);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setValidationErrors([]);

    const validation = safeValidateMapConfig(assembledConfig);
    if (!validation.success) {
      setValidationErrors(validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
      setSaving(false);
      return;
    }

    try {
      const body = { name, description, config: assembledConfig, environment };
      const url = isEditing ? `/api/configs/${id}` : '/api/configs';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      navigate('/configs');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCollectionSelect = (collectionId: string) => {
    if (!browseSourceId) return;
    const source = sources.find(s => s.id === browseSourceId);
    if (!source) return;

    const layerId = `${browseSourceId}-${collectionId}`;
    const newLayer: LayerConfig = {
      id: layerId,
      sourceId: browseSourceId,
      collection: collectionId,
      label: collectionId,
      visible: true,
      dataMode: 'vector-tiles',
    };
    setLayers(prev => [...prev, newLayer]);

    detectStyleTypeForCollection(source.url, collectionId).then(styleType => {
      if (!styleType) return;
      const style = styleType === 'fill' ? defaultFill : styleType === 'line' ? defaultLine : defaultCircle;
      setLayers(prev => prev.map(l => l.id === layerId && !l.style ? { ...l, style } : l));
    });
  };

  const handleCollectionDeselect = (collectionId: string) => {
    setLayers(prev =>
      prev.filter(l => !(l.sourceId === browseSourceId && l.collection === collectionId)),
    );
  };

  const browseSource = sources.find(s => s.id === browseSourceId);
  const selectedCollectionIds = layers
    .filter(l => l.sourceId === browseSourceId)
    .map(l => l.collection);

  if (loading) {
    return (
      <div className="mapui:flex mapui:items-center mapui:justify-center mapui:p-16 mapui:text-gray-500">
        <span className="mapui:inline-block mapui:h-6 mapui:w-6 mapui:animate-spin mapui:rounded-full mapui:border-2 mapui:border-gray-300 mapui:border-t-blue-600 mapui:mr-3" />
        Loading configuration…
      </div>
    );
  }

  return (
    <div className={`mapui:flex ${previewLayout === 'vertical' ? 'mapui:flex-row' : 'mapui:flex-col'} mapui:h-[calc(100vh-4rem)]`}>
      {/* Left: wizard form (scrollable) */}
      <div className="mapui:flex-1 mapui:min-w-0 mapui:overflow-y-auto mapui:p-8">
        <div className="mapui:max-w-3xl mapui:mx-auto">
      <h1 className="mapui:text-2xl mapui:font-bold mapui:text-gray-900 mapui:mb-6">
        {isEditing ? 'Edit Configuration' : 'Create Configuration'}
      </h1>

      {/* Step progress */}
      <div className="mapui:flex mapui:gap-1 mapui:mb-8 mapui:overflow-x-auto">
        {STEPS.map((step, i) => (
          <button
            key={step.key}
            onClick={() => setCurrentStep(step.key)}
            className={`mapui:flex-1 mapui:py-2 mapui:px-3 mapui:text-sm mapui:rounded mapui:font-medium mapui:whitespace-nowrap ${
              step.key === currentStep
                ? 'mapui:bg-blue-600 mapui:text-white'
                : i < currentStepIndex
                ? 'mapui:bg-blue-100 mapui:text-blue-700'
                : 'mapui:bg-gray-100 mapui:text-gray-500'
            }`}
          >
            {i + 1}. {step.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="mapui:bg-white mapui:rounded-lg mapui:shadow mapui:p-6 mapui:mb-6">
        {currentStep === 'metadata' && (
          <div className="mapui:space-y-4">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">Configuration Metadata</h2>
            <div>
              <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700 mapui:mb-1">
                Name <span className="mapui:text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Map Configuration"
                className="mapui:w-full mapui:border mapui:border-gray-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700 mapui:mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what this configuration is for..."
                rows={3}
                className="mapui:w-full mapui:border mapui:border-gray-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
              />
            </div>
            {environments.length > 1 && (
              <div>
                <label className="mapui:block mapui:text-sm mapui:font-medium mapui:text-gray-700 mapui:mb-1">
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={e => setEnvironment(e.target.value)}
                  disabled={isEditing}
                  className="mapui:w-full mapui:border mapui:border-gray-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500 mapui:disabled:bg-gray-50 mapui:disabled:text-gray-500"
                >
                  {environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
                {isEditing && (
                  <p className="mapui:text-xs mapui:text-gray-400 mapui:mt-1">
                    Environment cannot be changed after creation.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 'sources' && (
          <div className="mapui:space-y-4">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">OGC API Sources</h2>
            <SourceList sources={sources} onChange={setSources} />
          </div>
        )}

        {currentStep === 'layer-select' && (
          <div className="mapui:space-y-6">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">Select Layers</h2>
            {sources.length === 0 ? (
              <div className="mapui:rounded mapui:bg-yellow-50 mapui:border mapui:border-yellow-200 mapui:p-4 mapui:text-sm mapui:text-yellow-800">
                No sources configured. Go back to the <strong>Sources</strong> step to add at least one OGC API source before adding layers.
              </div>
            ) : (
              <div className="mapui:space-y-4">
                {layers.length > 0 && (
                  <p className="mapui:text-sm mapui:text-gray-500">
                    {layers.length} layer{layers.length !== 1 ? 's' : ''} selected
                  </p>
                )}
                <div className="mapui:rounded mapui:border mapui:border-gray-200 mapui:p-4">
                  <h3 className="mapui:text-sm mapui:font-semibold mapui:text-gray-700 mapui:mb-3">Browse Collections</h3>
                  <div className="mapui:mb-3">
                    <label className="mapui:block mapui:text-xs mapui:font-medium mapui:text-gray-600 mapui:mb-1">
                      Source
                    </label>
                    <select
                      value={browseSourceId}
                      onChange={e => setBrowseSourceId(e.target.value)}
                      className="mapui:w-full mapui:border mapui:border-gray-300 mapui:rounded mapui:px-3 mapui:py-2 mapui:text-sm mapui:focus:outline-none mapui:focus:ring-2 mapui:focus:ring-blue-500"
                    >
                      {sources.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.label ?? s.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  {browseSource && (
                    <CollectionBrowser
                      sourceUrl={browseSource.url}
                      selectedCollectionIds={selectedCollectionIds}
                      onSelect={handleCollectionSelect}
                      onDeselect={handleCollectionDeselect}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 'layer-config' && (
          <div className="mapui:space-y-4">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">Configure Layers</h2>
            {layers.length === 0 ? (
              <div className="mapui:rounded mapui:bg-blue-50 mapui:border mapui:border-blue-200 mapui:p-4 mapui:text-sm mapui:text-blue-800">
                No layers selected yet. Go back to the <strong>Select Layers</strong> step to choose collections.
              </div>
            ) : (
              <LayerList layers={layers} onChange={setLayers} availableSources={sources} />
            )}
          </div>
        )}

        {currentStep === 'basemaps' && (
          <div className="mapui:space-y-4">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">Basemaps</h2>
            <BasemapList basemaps={basemaps} onChange={setBasemaps} />
          </div>
        )}

        {currentStep === 'ui' && (
          <div className="mapui:space-y-4">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">UI Options</h2>
            <UIConfigEditor value={uiConfig} onChange={setUiConfig} />
          </div>
        )}

        {currentStep === 'view' && (
          <div className="mapui:space-y-4">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">Initial View</h2>
            <ViewEditor value={initialView} onChange={setInitialView} />
          </div>
        )}

        {currentStep === 'review' && (
          <div className="mapui:space-y-4">
            <h2 className="mapui:text-lg mapui:font-semibold mapui:text-gray-800">Review & Save</h2>
            <div className="mapui:bg-gray-50 mapui:rounded mapui:p-4 mapui:text-sm mapui:text-gray-600">
              <p><strong>Name:</strong> {name || '(not set)'}</p>
              <p><strong>Description:</strong> {description || '(not set)'}</p>
            </div>
            <ConfigPreview config={assembledConfig} />
            {validationErrors.length > 0 && (
              <div className="mapui:rounded mapui:bg-red-50 mapui:border mapui:border-red-200 mapui:p-4">
                <p className="mapui:text-sm mapui:font-medium mapui:text-red-800 mapui:mb-2">Config validation failed:</p>
                <ul className="mapui:list-disc mapui:list-inside mapui:space-y-1">
                  {validationErrors.map((e, i) => (
                    <li key={i} className="mapui:text-sm mapui:text-red-700">{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p className="mapui:text-red-600 mapui:text-sm">{error}</p>}
            <button
              onClick={handleSave}
              disabled={saving || !name}
              className="mapui:bg-blue-600 mapui:text-white mapui:px-6 mapui:py-2 mapui:rounded mapui:hover:bg-blue-700 mapui:disabled:opacity-50 mapui:disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Configuration' : 'Create Configuration'}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mapui:flex mapui:justify-between mapui:items-center">
        <button
          onClick={() => setCurrentStep(STEPS[currentStepIndex - 1]?.key ?? 'metadata')}
          disabled={currentStepIndex === 0}
          className="mapui:px-4 mapui:py-2 mapui:border mapui:border-gray-300 mapui:rounded mapui:text-sm mapui:hover:bg-gray-50 mapui:disabled:opacity-50"
        >
          Previous
        </button>
        <div className="mapui:flex mapui:gap-2 mapui:items-center">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="mapui:px-3 mapui:py-2 mapui:border mapui:border-blue-300 mapui:rounded mapui:text-sm mapui:text-blue-600 mapui:hover:bg-blue-50"
          >
            {showPreview ? 'Hide Preview' : 'Show Map Preview'}
          </button>
          <div className={showPreview ? 'mapui:flex mapui:gap-1' : 'mapui:hidden'}>
            <button
              onClick={() => setPreviewLayout('vertical')}
              title="Side-by-side layout"
              className={`mapui:p-1.5 mapui:rounded mapui:border ${previewLayout === 'vertical' ? 'mapui:bg-blue-100 mapui:border-blue-400 mapui:text-blue-700' : 'mapui:border-gray-300 mapui:text-gray-500 mapui:hover:bg-gray-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="8" height="18" rx="1"/>
                <rect x="13" y="3" width="8" height="18" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => setPreviewLayout('horizontal')}
              title="Stacked layout"
              className={`mapui:p-1.5 mapui:rounded mapui:border ${previewLayout === 'horizontal' ? 'mapui:bg-blue-100 mapui:border-blue-400 mapui:text-blue-700' : 'mapui:border-gray-300 mapui:text-gray-500 mapui:hover:bg-gray-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="8" rx="1"/>
                <rect x="3" y="13" width="18" height="8" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
        {currentStepIndex < STEPS.length - 1 ? (
          <button
            onClick={() => setCurrentStep(STEPS[currentStepIndex + 1].key)}
            className="mapui:bg-blue-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:text-sm mapui:hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || !name}
            className="mapui:bg-green-600 mapui:text-white mapui:px-4 mapui:py-2 mapui:rounded mapui:text-sm mapui:hover:bg-green-700 mapui:disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        )}
      </div>
        </div>
      </div>

      {/* Right: map preview (always visible on ≥md, toggle on <md) */}
      <div className={`mapui:shrink-0 mapui:border-gray-200 ${previewLayout === 'vertical' ? 'mapui:w-[45%] mapui:h-auto mapui:border-l' : 'mapui:w-full mapui:h-[400px] mapui:border-t'} ${showPreview ? 'mapui:block' : 'mapui:hidden'}`}>
        <MapPreview
          sources={sources}
          layers={layers}
          basemaps={basemaps}
          viewState={initialView}
          onViewStateChange={currentStep === 'view' ? setInitialView : undefined}
          onLayersChange={setLayers}
          currentStep={currentStep}
          uiConfig={uiConfig}
        />
      </div>
    </div>
  );
}
