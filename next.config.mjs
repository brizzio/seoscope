import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const emptyLoader = require.resolve("next/dist/build/webpack/loaders/empty-loader");
const emptyStub = path.resolve("lib/empty.js");

const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      electron: false,
      bufferutil: false,
      "utf-8-validate": false,
    };

    // Ensure recorder bundle is not parsed
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "playwright-core/lib/vite/recorder": emptyStub,
      "playwright-core/lib/vite/recorder/index.html": emptyStub,
      "playwright-core/lib/vite/recorder/assets": emptyStub,
      "playwright-core/lib/server/recorder": emptyStub,
    };

    config.module.rules.unshift({
      test: /playwright-core[\\/]lib[\\/]vite[\\/]recorder[\\/].*/,
      use: [{ loader: emptyLoader }],
    });

    return config;
  },
};

export default nextConfig;
