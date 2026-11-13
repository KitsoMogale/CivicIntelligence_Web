import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.CIVIC_DIST_DIR || ".next",
  outputFileTracingRoot: process.cwd(),
  experimental: { cpus: 2, webpackMemoryOptimizations: true },
  async headers(){return [{source:"/:path*",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
    {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
    {key:"Content-Security-Policy",value:"base-uri 'self'; object-src 'none'; frame-ancestors 'self'"},
  ]}];},
};
export default config;
