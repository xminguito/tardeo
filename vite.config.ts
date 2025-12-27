import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Vite Configuration
 * Performance-focused and DDEV-compatible
 */
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    // Configuración del servidor de desarrollo (solo activa en local)
    server: isDev ? {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      allowedHosts: ["tardeo.ddev.local"],
      hmr: {
        clientPort: 443, // Forzar WebSocket a través del proxy HTTPS de DDEV
      },
    } : {},

    plugins: [
      react(),
      VitePWA({
        selfDestroying: true,
        registerType: "autoUpdate",
        injectRegister: 'auto',
        includeAssets: [
          "favicon.ico", 
          "apple-touch-icon.png", 
          "pwa-192x192.png", 
          "pwa-512x512.png", 
          "robots.txt"
        ],
        manifest: {
          name: "Tardeo",
          short_name: "Tardeo",
          description: "Encuentra actividades y amigos con tus mismos intereses.",
          theme_color: "#da2576",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { 
              src: "pwa-512x512.png", 
              sizes: "512x512", 
              type: "image/png", 
              purpose: "any maskable" 
            },
          ],
        },
        workbox: {
          globPatterns: [],
        },
      }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});