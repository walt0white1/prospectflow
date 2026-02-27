import type { NextConfig } from "next";
import path from 'path'

const nextConfig: NextConfig = {
  // Exclure Playwright du bundle Turbopack/webpack (requis pour l'audit)
  serverExternalPackages: ['playwright', 'playwright-core'],

  // Pointer vers les browsers installés dans le projet (accessibles depuis tous les contextes)
  env: {
    PLAYWRIGHT_BROWSERS_PATH: path.join(process.cwd(), 'playwright-browsers'),
  },
};

export default nextConfig;
