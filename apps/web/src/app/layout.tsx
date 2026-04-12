import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/ui/Navbar";
import { Providers } from "./Providers";
import { OfflineBanner } from "@/ui/OfflineBanner";
import { ServiceWorkerRegistration } from "@/ui/ServiceWorkerRegistration";
import { InstallPrompt } from "@/ui/InstallPrompt";

export const metadata: Metadata = {
  title: "V-Cell (alpha)",
  applicationName: "V-Cell",
  description: "A solitaire game with a twist on freecell",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "V-Cell"
  },
  icons: {
    icon: [
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" }
    ],
    apple: [
      {
        url: "/images/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
    other: [
      {
        rel: "mask-icon",
        url: "/images/icon-maskable-192.png"
      }
    ]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="poker"
      data-reduced-motion="false"
    >
      <head>
        <script
          id="app-init"
          // Inline script runs as soon as the parser reaches it.
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var stored =
      localStorage.getItem("vcell-theme") ||
      localStorage.getItem("vc2-theme") ||
      localStorage.getItem("theme");

    var theme = stored;

    if (!theme) {
      var prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      // Match your CSS defaulting behavior: dark -> times-dark; light -> poker.
      theme = prefersDark ? "times-dark" : "poker";
    }

    document.documentElement.dataset.theme = theme;

    var motionPreference = localStorage.getItem("vcell:motionPreference");
    var shouldReduceMotion;

    if (motionPreference === "reduce") {
      shouldReduceMotion = true;
    } else if (motionPreference === "full") {
      shouldReduceMotion = false;
    } else {
      shouldReduceMotion = !!(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }

    document.documentElement.dataset.reducedMotion = String(shouldReduceMotion);
  } catch (e) {
    // no-op
  }
})();`
          }}
        />
      </head>
      <body
      >
        <Providers>
          <ServiceWorkerRegistration />
          <NavBar />
          <OfflineBanner />
          <InstallPrompt />
          <div className="max-width-container">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
