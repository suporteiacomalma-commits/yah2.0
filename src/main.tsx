// Visual debugging - confirm bundle loaded
// if (typeof document !== 'undefined') {
//     const debugBanner = document.createElement('div');
//     debugBanner.id = 'js-loaded-marker';
//     debugBanner.style.cssText = "position:fixed; top:0; left:0; width:10px; height:10px; background:#0f0; z-index:99999;";
//     document.body.appendChild(debugBanner);
//     console.log("JS Bundle Executing...");
// }

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ui/error-boundary";

// Global error handler for module-level crashes
window.onerror = function (message, source, lineno, colno, error) {
    // Pass to existing handler in index.html if possible or handle here
    console.error("Main.tsx Global Error", message, error);
};

try {
    const rootElement = document.getElementById("root");
    if (!rootElement) throw new Error("Root element not found");

    // Remove the loader
    rootElement.innerHTML = '';

    createRoot(rootElement).render(
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
} catch (e) {
    console.error("Failed to render app:", e);
    const errDiv = document.createElement('div');
    errDiv.innerText = `Render fail: ${e}`;
    errDiv.style.color = 'red';
    document.body.appendChild(errDiv);
}
