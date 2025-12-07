import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './lib/i18n';

// EMERGENCY: Unregister any existing service workers to fix loading issues
// This is needed to clean up "zombie" SWs from a previous PWA configuration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      console.log('🧹 Found', registrations.length, 'Service Worker(s) to unregister');
      registrations.forEach((registration) => {
        console.log('🧹 Unregistering Service Worker:', registration.scope);
        registration.unregister().then((success) => {
          if (success) {
            console.log('✅ Service Worker unregistered successfully');
          }
        });
      });
    }
  }).catch((error) => {
    console.error('❌ Error unregistering Service Workers:', error);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
