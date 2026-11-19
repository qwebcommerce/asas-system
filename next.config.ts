import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Hosts allowed to call Server Actions besides the app's own host.
 * Needed when the app runs behind a proxy, load balancer or custom domain that does not
 * forward the public host: Next.js then rejects every save with a 500 ("Invalid Server
 * Actions request"). Set SERVER_ACTIONS_ALLOWED_ORIGINS (comma-separated, e.g.
 * "asasqa.com,www.asasqa.com") before building; the host of NEXT_PUBLIC_SITE_URL is added too.
 */
function allowedOrigins() {
  const hosts = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) hosts.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
  } catch {
    // ignore a malformed NEXT_PUBLIC_SITE_URL
  }
  return [...new Set(hosts)];
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["firebase-admin"],
  experimental: {
    serverActions: {
      allowedOrigins: allowedOrigins(),
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/en/overview", permanent: false },
      { source: "/users", destination: "/en/users", permanent: false },
    ];
  },
};

export default withNextIntl(nextConfig);
