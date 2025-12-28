import type { Browser } from 'webdriverio';
import { createBrowser, tryDismissConsent } from './common';
import { getProxyUrl } from '../utils/config';
import { logger } from '../utils/logger';

export interface GearItem {
  gear_type: string;
  item_name: string;
  enhancement_level: number;
  stats?: Record<string, string | number>;
}

export interface GarmothProfile {
  gear: GearItem[];
  stats: Record<string, string | number>;
}

export async function scrapeGarmothProfile(profileUrl: string): Promise<GarmothProfile> {
  const browser = (await createBrowser()) as Browser;

  try {
    const proxied = toProxiedProfileUrl(profileUrl);
    await browser.url(proxied);
    logger.debug('Navigated to garmoth profile via proxy', { proxied });

    // Attempt to dismiss privacy/cookie consent overlays if present
    await tryDismissConsent(browser);

    // Wait for the page to load
    await browser.pause(2000);

    // Scrape gear section
    const gear: GearItem[] = [];

    // Try to get gear information from the page
    // Note: This is a simplified implementation - actual selectors need to be adjusted based on Garmoth's HTML structure
    const gearElements = await browser.$$('.gear-item, [class*="gear"], [class*="equipment"]');

    for (const element of gearElements) {
      try {
        const itemName = await element.getText();
        if (itemName && itemName.trim()) {
          // Extract enhancement level from item name (e.g., "[V] Blackstar Weapon" -> 5)
          const enhancementMatch = itemName.match(/\[([IVX]+)\]/);
          const enhancement = enhancementMatch ? romanToInt(enhancementMatch[1]) : 0;

          gear.push({
            gear_type: 'equipment',
            item_name: itemName.replace(/\[([IVX]+)\]\s*/, '').trim(),
            enhancement_level: enhancement,
          });
        }
      } catch (err) {
        // Skip elements that can't be processed
        logger.warn('Error processing gear element:', err as Error);
      }
    }

    // Scrape stats section
    const stats: Record<string, string | number> = {};

    // Try to get stats from the page
    const statElements = await browser.$$('.stat-item, [class*="stat"]');

    for (const element of statElements) {
      try {
        const text = await element.getText();
        if (text && text.includes(':')) {
          const [key, value] = text.split(':').map((s) => s.trim());
          stats[key] = value;
        }
      } catch (err) {
        // Skip elements that can't be processed
        logger.warn('Error processing stat element:', err as Error);
      }
    }

    return { gear, stats };
  } finally {
    await browser.deleteSession();
  }
}

// Helper function to convert Roman numerals to integers
function romanToInt(roman: string): number {
  const romanMap: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = romanMap[roman[i]];
    const next = romanMap[roman[i + 1]];

    if (next && current < next) {
      result -= current;
    } else {
      result += current;
    }
  }

  return result;
}

/**
 * Map a Garmoth character URL to the proxied endpoint.
 * Example: https://garmoth.com/character/UoLalCoMhf -> {PROXY_URL}/character/UoLalCoMhf
 */
function toProxiedProfileUrl(url: string): string {
  try {
    const u = new URL(url);
    // Expect paths like /character/<id>
    const match = u.pathname.match(/^\/character\/([^\/?#]+)(?:[\/?#].*)?$/);
    const path = match ? `/character/${match[1]}` : u.pathname;
    return `${getProxyUrl()}${path}`;
  } catch {
    // Fallback: if not a valid URL, treat as already-path
    const trimmed = url.trim();
    const path = trimmed.startsWith('/character/') ? trimmed : `/character/${trimmed}`;
    return `${getProxyUrl()}${path}`;
  }
}
