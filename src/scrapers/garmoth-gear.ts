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

    // Target gear items inside the equipment section and extract slot, image and enhancement level
    const gearElements = await browser.$$('.equipment .gear');

    for (const element of gearElements) {
      try {
        const classAttr = (await element.getAttribute('class')) || '';
        const gearSlot = parseGearSlot(classAttr);

        const imgEl = await element.$('img');
        const imageUrl = imgEl ? await imgEl.getAttribute('src') : undefined;
        const alt = imgEl ? await imgEl.getAttribute('alt') : undefined;

        const enhanceEl = await element.$('p.enhance-level');
        const enhanceText = enhanceEl ? (await enhanceEl.getText()).trim() : '';
        const enhancement = parseEnhancement(enhanceText);

        const rarity = parseRarity(classAttr);
        const itemName = deriveItemName(gearSlot, alt, imageUrl);

        gear.push({
          gear_type: gearSlot,
          item_name: itemName,
          enhancement_level: enhancement,
          stats: {
            image_url: imageUrl || '',
            rarity,
          },
        });
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
    const match = u.pathname.match(/^\/character\/([^/?#]+)(?:[/?#].*)?$/);
    const path = match ? `/character/${match[1]}` : u.pathname;
    return `${getProxyUrl()}${path}`;
  } catch {
    // Fallback: if not a valid URL, treat as already-path
    const trimmed = url.trim();
    const path = trimmed.startsWith('/character/') ? trimmed : `/character/${trimmed}`;
    return `${getProxyUrl()}${path}`;
  }
}

// Extract gear slot from class list (e.g., "gear-main_weapon" -> "main_weapon")
function parseGearSlot(classAttr: string): string {
  const classes = classAttr.split(/\s+/);
  const gearClass = classes.find((c) => c.startsWith('gear-') && c !== 'gear');
  return gearClass ? gearClass.replace('gear-', '') : 'equipment';
}

// Parse rarity number from class like "border-rarity-6" -> 6
function parseRarity(classAttr: string): number {
  const m = classAttr.match(/border-rarity-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// Convert enhancement label to number (roman numerals like IV/VII/X or "+10")
function parseEnhancement(text: string): number {
  if (!text) return 0;
  const plus = text.match(/^\+(\d{1,2})$/);
  if (plus) return parseInt(plus[1], 10);
  const roman = text.replace(/[^IVXLCDM]/gi, '').toUpperCase();
  return roman ? romanToInt(roman) : 0;
}

// Derive item name from slot, alt or image src filename
function deriveItemName(slot: string, alt?: string | null, src?: string | null): string {
  if (alt && alt.trim()) return alt.trim();
  if (src) {
    try {
      const url = new URL(src);
      const parts = url.pathname.split('/');
      const file = parts[parts.length - 1] || '';
      const base = file.replace(/\.(webp|png|jpg|jpeg)$/i, '');
      return base.replace(/[_-]+/g, ' ').trim() || slot;
    } catch {
      const base = src.split('/').pop() || '';
      return (
        base
          .replace(/\.(webp|png|jpg|jpeg)$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim() || slot
      );
    }
  }
  return slot;
}
