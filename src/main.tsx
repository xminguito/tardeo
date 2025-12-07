import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import './lib/i18n';

// 🚨 FORCE CLEANUP: Kill any lingering Service Workers
// Runs IMMEDIATELY (sync) + on LOAD (async) for maximum effectiveness
const killZombieSW = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        console.log('🧹 Killing Zombie SW:', registration.scope);
        registration.unregister();
      }
      if (registrations.length > 0) {
        console.log('✅ Killed', registrations.length, 'Service Worker(s)');
      }
    }).catch((error) => {
      console.error('❌ Error killing Service Workers:', error);
    });
  }
};

// Run immediately when script loads
killZombieSW();

// Also run on window load (catches late-registering SWs)
window.addEventListener('load', killZombieSW);

createRoot(document.getElementById("root")!).render(<App />);
