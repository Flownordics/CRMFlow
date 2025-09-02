import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Development-only accessibility guard
if (import.meta.env.DEV) {
    import("./lib/dev/a11y-dialog-guard.ts");
}

createRoot(document.getElementById("root")!).render(<App />);
