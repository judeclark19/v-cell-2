import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "V-Cell",
    short_name: "V-Cell",
    description: "A solitaire game with a twist on freecell",
    start_url: "/game",
    display: "standalone",
    background_color: "#35654d",
    theme_color: "#35654d",
    icons: [
      {
        src: "/images/V.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/images/V.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon"
      }
    ]
  };
}
