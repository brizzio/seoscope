import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const emptyLoader = require.resolve("next/dist/build/webpack/loaders/empty-loader");

const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      electron: false,
      bufferutil: false,
      "utf-8-validate": false,
    };

    // Stub Playwright recorder bundle to avoid pulling fonts/html
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "playwright-core/lib/vite/recorder": emptyLoader,
      "playwright-core/lib/vite/recorder/index.html": emptyLoader,
      "playwright-core/lib/vite/recorder/assets": emptyLoader,
      "playwright-core/lib/server/recorder": emptyLoader,
    };
    config.module.rules.unshift({
      test: /playwright-core[\\/]lib[\\/]vite[\\/]recorder[\\/].*/,
      use: [{ loader: emptyLoader }],
    });

    // Do not externalize Playwright/Chromium; bundle them into the function.
    config.externals = config.externals || [];

    return config;
  },
};

export default nextConfig;
