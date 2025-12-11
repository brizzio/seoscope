import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      electron: false,
      bufferutil: false,
      "utf-8-validate": false,
    };

    // Keep heavy binaries external; they will be loaded from node_modules at runtime.
    config.externals = config.externals || [];
    config.externals.push("playwright", "@sparticuz/chromium", "chromium-bidi");

    return config;
  },
};

export default nextConfig;
