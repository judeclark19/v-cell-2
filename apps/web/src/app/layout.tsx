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
      { url: "/favicon.ico" },
      { url: "/images/V.png", type: "image/png" }
    ],
    apple: [{ url: "/images/V.png", type: "image/png" }]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="poker">
      <head>
        <script
          id="theme-init"
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
