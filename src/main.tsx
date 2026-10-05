// Safe patch for Performance.measure & Performance.mark to prevent React 19 DataCloneError
if (typeof window !== 'undefined' && window.performance) {
  if (typeof window.performance.measure === 'function') {
    const originalMeasure = window.performance.measure;
    window.performance.measure = function (measureName: string, ...args: any[]) {
      try {
        return originalMeasure.call(window.performance, measureName, ...args);
      } catch {
        try {
          if (typeof args[0] === 'string') {
            return originalMeasure.call(window.performance, measureName, args[0]);
          }
          return originalMeasure.call(window.performance, measureName);
        } catch {
          return null as any;
        }
      }
    };
  }

  if (typeof window.performance.mark === 'function') {
    const originalMark = window.performance.mark;
    window.performance.mark = function (markName: string, ...args: any[]) {
      try {
        return originalMark.call(window.performance, markName, ...args);
      } catch {
        try {
          return originalMark.call(window.performance, markName);
        } catch {
          return null as any;
        }
      }
    };
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { I18nProvider } from './i18n/context';
import { NeuralCrashReporter } from './components/NeuralCrashReporter';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NeuralCrashReporter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </NeuralCrashReporter>
  </StrictMode>,
);

// Register Service Worker for PWA (Web environment only)
if ('serviceWorker' in navigator && !('__TAURI_INTERNALS__' in window)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}
