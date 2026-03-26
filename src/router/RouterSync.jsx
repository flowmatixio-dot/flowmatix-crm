import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUiStore } from "../stores/uiStore";
import { pathToView, viewToPath, DEFAULT_VIEW, DEFAULT_PATH } from "./routeConfig";

/**
 * RouterSync — keeps the zustand `view` state and the browser URL in sync.
 *
 * Two-way sync:
 * 1. URL changes (back/forward, direct URL entry) → update zustand view
 * 2. setView() calls (sidebar clicks, programmatic navigation) → update URL
 *
 * This component renders nothing — it only runs side effects.
 */
export default function RouterSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const view = useUiStore((s) => s.view);
  const suppressUrlSync = useRef(false);
  const suppressViewSync = useRef(false);

  // 1. URL → view: when location changes (browser back/forward, direct URL)
  useEffect(() => {
    if (suppressViewSync.current) {
      suppressViewSync.current = false;
      return;
    }

    const pathname = location.pathname;
    const targetView = pathToView[pathname];

    if (targetView && targetView !== useUiStore.getState().view) {
      suppressUrlSync.current = true;
      useUiStore.getState().setView(targetView);
    } else if (!targetView && pathname === "/") {
      // Redirect root to default view
      suppressViewSync.current = true;
      navigate(DEFAULT_PATH, { replace: true });
      suppressUrlSync.current = true;
      useUiStore.getState().setView(DEFAULT_VIEW);
    }
    // Unknown paths: leave view as-is (could be a deep link handled elsewhere)
  }, [location.pathname, navigate]);

  // 2. View → URL: when zustand view changes (via setView calls)
  useEffect(() => {
    if (suppressUrlSync.current) {
      suppressUrlSync.current = false;
      return;
    }

    const targetPath = viewToPath[view];
    if (targetPath && targetPath !== location.pathname) {
      suppressViewSync.current = true;
      navigate(targetPath);
    }
  }, [view, navigate, location.pathname]);

  return null;
}
