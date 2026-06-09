import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  // Evitar que Vite oscurezca los errores de Rust en el terminal
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Tauri espera esta lista para no hacer hot-reload innecesario
      ignored: ["**/src-tauri/**"],
    },
  },
  // Variable de entorno para detectar Tauri en el frontend
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // Tauri soporta ES2021
    target: process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
    // No minificar en debug builds
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
