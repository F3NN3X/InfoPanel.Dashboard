import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ?ui-preview: a gallery of the studio chrome primitives (a lazy chunk, never linked).
const UiPreview = lazy(() => import("@/components/ui/ui-preview"));
const preview = new URLSearchParams(window.location.search).has("ui-preview");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {preview ? (
      <Suspense fallback={null}>
        <UiPreview />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
