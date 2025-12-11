/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      electron: false,
    };
    config.externals = config.externals || [];
    config.externals.push("playwright-core", "@sparticuz/chromium");

    config.module.rules.push({
      test: /playwright-core[\\/]lib[\\/]vite[\\/]recorder[\\/].*\\.(html|ttf|woff2?)$/,
      type: "asset/source",
    });

    config.module.rules.push({
      test: /\.ttf$/i,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
