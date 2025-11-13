// main.tsx

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAuth } from "./lib/auth";

// Initialize auth and then render app
initAuth()
  .then(() => {
    console.log('✅ Starting app with authenticated session');
    createRoot(document.getElementById("root")!).render(<App />);
  })
  .catch(() => {
    console.warn('⚠️ Starting app without authenticated session - user will need to login');
    // Still render app, but user will be redirected to login page
    createRoot(document.getElementById("root")!).render(<App />);
  });