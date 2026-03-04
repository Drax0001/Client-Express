import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["chromadb", "@chroma-core/default-embed"],
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      "@chroma-core/default-embed": "@chroma-core/default-embed/dist/default-embed.mjs",
    },
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
