import { useEffect, useState } from 'react';
import { safeValidateMapConfig } from '@ogc-maps/storybook-components/schemas';
import { mapConfig } from './config/map-config';
import { useMapStore } from './stores/mapStore';
import { useMapSync } from './hooks/useMapSync';
import { Layout } from './components/Layout';

function App() {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const hydrate = useMapStore((s) => s.hydrate);

  useEffect(() => {
    // Validate config
    const result = safeValidateMapConfig(mapConfig);

    if (!result.success) {
      setValidationError(
        `Config validation failed: ${result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
      return;
    }

    // Hydrate stores with validated config
    hydrate(result.data);
    setIsReady(true);
  }, [hydrate]);

  if (validationError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-red-50">
        <div className="max-w-2xl rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-600">Configuration Error</h1>
          <p className="mt-4 text-gray-700">{validationError}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading map configuration...</div>
        </div>
      </div>
    );
  }

  return <AppContent />;
}

function AppContent() {
  // Enable URL state sync after hydration is complete
  useMapSync();

  return <Layout uiConfig={mapConfig.ui} />;
}

export default App;
