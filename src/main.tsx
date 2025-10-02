import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initServiceWorker } from "./utils/serviceWorker";

// Инициализируем Service Worker
initServiceWorker().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
