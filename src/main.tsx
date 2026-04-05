import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

function Root() {
  if (!convexUrl) {
    return (
      <main style={{ padding: "1.5rem", fontFamily: "system-ui", maxWidth: 520 }}>
        <h1>m-othello</h1>
        <p>
          Add <code>VITE_CONVEX_URL</code> to <code>.env.local</code> (your Convex deployment URL
          from the terminal after you run <code>npx convex dev</code>).
        </p>
      </main>
    );
  }

  const convex = new ConvexReactClient(convexUrl);
  return (
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
