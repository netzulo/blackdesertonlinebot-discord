import { config as loadEnv } from 'dotenv';

// Ensure environment variables are loaded
loadEnv();

/**
 * Returns the base Proxy URL to use for scraping.
 * Defaults to http://localhost:9432/proxy
 */
export function getProxyUrl(): string {
  const raw = process.env.PROXY_URL;
  const url = raw && raw !== 'undefined' && raw.trim() !== '' ? raw : 'http://localhost:9432/proxy';
  // Normalize: strip trailing slash
  return url.replace(/\/$/, '');
}
