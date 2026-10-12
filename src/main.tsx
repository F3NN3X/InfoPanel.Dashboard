import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ?ui-preview: a gallery of the studio chrome primitives (a lazy chunk, never linked).
const UiPreview = lazy(() => import("@/components/ui/ui-preview"));
const preview = new URLSearchParams(window.location.search).has("ui-preview");
// ?widget-qa: every module at a set of spans from fixture sensors, with an overflow probe (a lazy chunk, never linked).
const WidgetQa = lazy(() => import("@/widgets/widget-qa"));
const widgetQa = new URLSearchParams(window.location.search).has("widget-qa");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {preview ? (
      <Suspense fallback={null}>
        <UiPreview />
      </Suspense>
    ) : widgetQa ? (
      <Suspense fallback={null}>
        <WidgetQa />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
