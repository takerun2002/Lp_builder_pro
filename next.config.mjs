/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node.jsネイティブモジュールを外部化
  webpack: (config, { isServer }) => {
    if (isServer) {
      // サーバーサイドでのみネイティブモジュールを外部化
      config.externals = config.externals || [];
      config.externals.push({
        canvas: "commonjs canvas",
        "better-sqlite3": "commonjs better-sqlite3",
      });
    }

    // クライアント側でfsを無視
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }

    return config;
  },
  // 実験的機能
  experimental: {
    serverComponentsExternalPackages: ["canvas", "pdfjs-dist", "better-sqlite3"],
  },
};

export default nextConfig;
