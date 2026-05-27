import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './hooks/AuthContext';
import { SettingsProvider } from './hooks/SettingsContext';
import { AutoDetectTipg } from './components/AutoDetectTipg';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SettingsProvider>
        <AuthProvider>
          <AutoDetectTipg />
          <App />
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>
);
