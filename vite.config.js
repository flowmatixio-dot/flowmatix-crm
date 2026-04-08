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
//
// The fix: split fullcalendar via a function-form manualChunks that
// EXPLICITLY excludes @fullcalendar/react (and react/react-dom). The
// non-React calendar packages are huge and worth splitting.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep React + react-dom + react-router in one stable chunk so
          // there is exactly one copy of the React runtime.
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@remix-run/router')
          ) {
            return 'vendor-react';
          }
          // Zustand standalone — no React deps, very small.
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
          // FullCalendar non-react packages only. @fullcalendar/react
          // stays in the main bundle so the React runtime is shared.
          if (
            id.includes('node_modules/@fullcalendar/') &&
            !id.includes('node_modules/@fullcalendar/react')
          ) {
            return 'vendor-fullcalendar';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
});
