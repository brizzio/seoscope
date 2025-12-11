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
    const emptyLoader = require.resolve("next/dist/build/webpack/loaders/empty-loader");
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "playwright-core/lib/server/recorder/recorderApp": emptyLoader,
      "playwright-core/lib/server/recorder/recorderApp.js": emptyLoader,
      "playwright-core/lib/vite/recorder": emptyLoader,
      "playwright-core/lib/vite/recorder/index.html": emptyLoader,
    };
    config.module.rules.unshift(
      {
        test: /playwright-core[\\/]lib[\\/]vite[\\/]recorder[\\/].*/,
        use: [{ loader: emptyLoader }],
      },
      {
        test: /playwright-core[\\/]lib[\\/]server[\\/]recorder[\\/].*/,
        use: [{ loader: emptyLoader }],
      }
    );
    return config;
  },
};

export default nextConfig;
