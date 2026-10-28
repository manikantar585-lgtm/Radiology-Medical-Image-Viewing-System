// Cornerstone3D's image codecs are Emscripten builds that reference
// Node-only modules; the browser bundle must stub them out.
module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        crypto: false,
        url: false,
      };

      // Cornerstone ships ESM without full file extensions in some
      // imports, which webpack 5 rejects in strict ESM mode.
      config.module.rules.push({
        test: /\.m?js$/,
        include: /node_modules[\\/]@cornerstonejs/,
        resolve: { fullySpecified: false },
      });

      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        /Failed to parse source map/,
      ];

      return config;
    },
  },
};
