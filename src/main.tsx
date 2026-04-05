import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import { parseConvexUrl } from "./convexUrl";
import "./index.css";

const parsed = parseConvexUrl(import.meta.env.VITE_CONVEX_URL);

function BadConvexUrl({ reason }: { reason: string }) {
  const siteHint =
    reason === "site_not_cloud" ? (
      <p>
        You may have set <code>VITE_CONVEX_URL</code> to a <strong>.convex.site</strong> address.
        The React client must use the <strong>.convex.cloud</strong> deployment URL from the Convex
        dashboard (same project, different suffix).
      </p>
    ) : null;

  return (
    <main style={{ padding: "1.5rem", fontFamily: "system-ui", maxWidth: 560 }}>
      <h1>m-othello</h1>
      {siteHint}
      {reason === "missing" || reason === "literal" ? (
        <p>
          Set <code>VITE_CONVEX_URL</code> to your Convex <strong>.convex.cloud</strong> URL. For
          GitHub Pages, add it as a repository secret and pass it into the build (see workflow).
        </p>
      ) : null}
      {reason === "parse" || reason === "https" || reason === "host" ? (
        <p>
          <code>VITE_CONVEX_URL</code> must be a full <code>https://…convex.cloud</code> URL with
          no extra spaces or quotes.
        </p>
      ) : null}
    </main>
  );
}

function Root() {
  if (!parsed.ok) {
    return <BadConvexUrl reason={parsed.reason} />;
  }

  const convex = new ConvexReactClient(parsed.url);
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
