import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "@/lib/analytics";

// Initialize Google Analytics as early as possible.
initAnalytics();

const container = document.getElementById("root")!;

try {
  createRoot(container).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (err) {
  console.error("Failed to start app:", err);
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#07080d;color:#e6f1ff;font-family:system-ui,sans-serif;padding:24px;text-align:center">
      <div>
        <h1 style="font-size:20px;margin-bottom:8px">Unable to load Edunova</h1>
        <p style="opacity:.7;font-size:14px;max-width:340px">Your browser blocked local storage or an old cached version is loaded. Please reload the page or disable private/incognito restrictions.</p>
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 18px;border-radius:10px;border:0;background:#00d4aa;color:#02120e;font-weight:600;cursor:pointer">Reload</button>
      </div>
    </div>`;
}
