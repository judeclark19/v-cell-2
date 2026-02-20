import type { Metadata } from "next";
import { Questrial, Poppins, Luckiest_Guy } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/ui/Navbar";
import { Providers } from "./Providers";

const questrial = Questrial({
  variable: "--font-questrial",
  subsets: ["latin"],
  weight: ["400"]
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600"]
});

const luckiestGuy = Luckiest_Guy({
  variable: "--font-luckiest-guy",
  subsets: ["latin"],
  weight: ["400"]
});

export const metadata: Metadata = {
  title: "V-Cell (alpha)",
  description: "A solitaire game with a twist on freecell"
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
        className={`${questrial.variable} ${poppins.variable} ${luckiestGuy.variable}`}
      >
        <Providers>
          <NavBar />
          <div className="max-width-container">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
