import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initServiceWorker } from "./utils/serviceWorker";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  const configuredSampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
  const tracesSampleRate = Number.isFinite(configuredSampleRate)
    ? Math.min(Math.max(configuredSampleRate, 0), 1)
    : 0.1;

  Sentry.init({
    dsn: sentryDsn,
    integrations: [new BrowserTracing()],
    tracesSampleRate,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
  });
}

// Инициализируем Service Worker
initServiceWorker().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
