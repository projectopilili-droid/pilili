import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/layout/AppShell";
import appCss from "../styles.css?url";

const OPENING_BOOT = `(function(){
  try {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var motion = true, low = false;
    var raw = localStorage.getItem("pilili.v1");
    if (raw) {
      var state = JSON.parse(raw).state || {};
      if (state.openingMotion === false) motion = false;
      if (state.lowData === true) low = true;
    }
    if (reduce || !motion || low) return;
    var style = document.createElement("style");
    style.id = "pilili-opening-gate";
    style.textContent = "html,body{background:#000!important}body *{visibility:hidden!important}#pilili-splash,#pilili-splash *{visibility:visible!important}";
    document.head.appendChild(style);
    window.setTimeout(function(){ var el = document.getElementById("pilili-opening-gate"); if (el) el.remove(); }, 8000);
  } catch (e) {}
})();`;

const APP_NAME = "PILILÍ";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#17191d" },
      {
        name: "description",
        content: "Tu pedes. O PILILÍ executa. Diz-me o que precisas. O PILILÍ trata do resto.",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: Root,
});

function Root() {
  const [qc] = useState(() => new QueryClient());
  return (
    <html lang="pt" className="dark antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: OPENING_BOOT }} />
        <HeadContent />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@500;600;700&display=swap"
          media="print"
          onLoad={(e) => {
            e.currentTarget.media = "all";
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@500;600;700&display=swap"
          />
        </noscript>
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <QueryClientProvider client={qc}>
            <AppShell>
              <Outlet />
            </AppShell>
            <Toaster
              theme="dark"
              toastOptions={{
                style: {
                  background: "#24272d",
                  color: "#f7f4ed",
                  border: "1px solid rgb(247 244 237 / 0.12)",
                },
              }}
            />
          </QueryClientProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
