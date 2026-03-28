import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "scripts/**/*.py",
      "scripts/__pycache__/**",
      "models/**",
      "data/raw/**",
      "data/processed/**",
    ],
  },
};

export default nextConfig;
