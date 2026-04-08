import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// NOTE on manualChunks: previously we split out vendor-calendar with
// @fullcalendar/* into its own chunk. That caused Rollup to also pull
// the React internals (renderWithHooks, scheduleUpdate, etc.) into
// the calendar chunk because @fullcalendar/react depends on react.
// Result: two React copies in the bundle, and any component reached
// after the calendar chunk loaded crashed with
//   TypeError: t is not a function
// (where `t` is the minified hook dispatcher) when it tried to render.
// Removing the calendar split fixes the duplicate-React issue.
//
// vendor-react still gets its own chunk so the React runtime is
// loaded once and reused for everything.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
