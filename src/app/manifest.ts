import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" install mymind like an app, with its own icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mymind",
    short_name: "mymind",
    description: "Your saved TikToks, pins, posts and images, organised by AI.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#f6f4ef",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
