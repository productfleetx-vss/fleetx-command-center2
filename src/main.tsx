import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import '@/styles/app.css';

// Order matters: the engine defines window.FX and window.FX_CONFIG, the screens read them,
// and the legacy layer hands the trip feed and case model to FX.boot.
import '@/fx/engine.js';
import '@/fx/screens.js';
import { fxInternals, LegacyLayer, SessionContext, previewSession } from '@/legacy/command-center.js';

declare global {
  interface Window {
    FX: { boot: (internals: unknown) => Promise<void> };
    FXUI?: { start: () => void };
  }
}

window.FX.boot(fxInternals).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SessionContext.Provider value={previewSession}>
        <LegacyLayer />
      </SessionContext.Provider>
    </StrictMode>,
  );
  window.FXUI?.start();
});
