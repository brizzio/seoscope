import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      electron: false,
      bufferutil: false,
      "utf-8-validate": false,
    };

    const empty = path.resolve("lib/empty.js");
    const emptyLoader = require.resolve("next/dist/build/webpack/loaders/empty-loader");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "playwright-core/lib/server/recorder/recorderApp": empty,
      "playwright-core/lib/server/recorder/recorderApp.js": empty,
      "playwright-core/lib/vite/recorder": empty,
      "playwright-core/lib/vite/recorder/index.html": empty,
      "playwright-core/lib/vite/recorder/assets": empty,
    };

    config.module.rules.unshift({
      test: /playwright-core[\\/]lib[\\/]vite[\\/]recorder[\\/].*/,
      use: [{ loader: emptyLoader }],
    });

    return config;
  },
};

export default nextConfig;
