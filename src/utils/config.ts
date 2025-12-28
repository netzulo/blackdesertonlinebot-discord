import { config as loadEnv } from 'dotenv';

// Ensure environment variables are loaded
loadEnv();

/**
 * Returns the base Proxy URL to use for scraping.
 * Defaults to http://localhost:9432/proxy
 */
export function getProxyUrl(): string {
  const url = process.env.PROXY_URL || 'http://localhost:9432/proxy';
  // Normalize: strip trailing slash
  return url.replace(/\/$/, '');
}
