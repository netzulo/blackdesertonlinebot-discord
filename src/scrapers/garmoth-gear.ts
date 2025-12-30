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
  const SCRAPER_TIMEOUT_MS = parseInt(process.env.SCRAPER_TIMEOUT_MS || '12000', 10);

  try {
    const proxied = toProxiedProfileUrl(profileUrl);
    await browser.url(proxied);
    logger.debug('Navigated to garmoth profile via proxy', { proxied });

    // Attempt to dismiss privacy/cookie consent overlays if present
    logger.debug('Trying to dismiss consent...');
    await withTimeout(tryDismissConsent(browser), SCRAPER_TIMEOUT_MS).catch(() => {
      logger.debug('Consent dismissal timed out, continuing without dismiss.');
    });

    // Wait for the page to load
    await browser.pause(2000);

    const start = Date.now();
    logger.debug('Begin gear scraping');

    // Scrape gear section
    const gear: GearItem[] = [];

    // Target gear items inside the equipment section and extract slot, image and enhancement level
    const gearElements = await browser.$$('.equipment .gear');
    logger.debug('Equipment gear elements found', { count: gearElements.length });

    for (const element of gearElements) {
      try {
        const classAttr = (await element.getAttribute('class')) || '';
        const gearSlot = parseGearSlot(classAttr);
        logger.debug('Processing gear element', { classAttr, gearSlot });

        const imgEl = await element.$('img');
        const imgExists = await imgEl.isExisting();
        const imageUrl = imgExists ? await imgEl.getAttribute('src') : undefined;
        const alt = imgExists ? await imgEl.getAttribute('alt') : undefined;

        const enhanceEl = await element.$('p.enhance-level');
        const hasEnhance = await enhanceEl.isExisting();
        const enhanceText = hasEnhance ? (await enhanceEl.getText()).trim() : '';
        const enhancement = parseEnhancement(enhanceText);
        const enhancementLabel = enhanceText ? enhanceText : 'base';

        const rarity = parseRarity(classAttr);
        const itemName = deriveItemName(gearSlot, alt, imageUrl);

        logger.debug('Parsed gear item', {
          gear_type: gearSlot,
          item_name: itemName,
          enhancement_level: enhancement,
          rarity,
          image_url: imageUrl,
          enhancement_label: enhancementLabel,
        });

        gear.push({
          gear_type: gearSlot,
          item_name: itemName,
          enhancement_level: enhancement,
          stats: {
            image_url: imageUrl || '',
            rarity,
            enhancement_label: enhancementLabel,
          },
        });
      } catch (err) {
        // Skip elements that can't be processed
        logger.warn('Error processing gear element:', err as Error);
      }
    }

    // Scrape stats section
    const stats: Record<string, string | number> = {};

    // Summary numbers: AP, AAP, DP, SCORE from the 4-column grid
    try {
      const grid = await browser.$('.grid.grid-cols-4.items-end.text-center');
      if (await grid.isExisting()) {
        const nums = await grid.$$('p.text-2xl.font-bold');
        const texts: string[] = [];
        for (const el of nums) {
          const t = await el.getText();
          texts.push(t);
        }
        if (texts.length >= 4) {
          const ap = parseInt(texts[0].trim(), 10);
          const aap = parseInt(texts[1].trim(), 10);
          const dp = parseInt(texts[2].trim(), 10);
          const score = parseInt(texts[3].trim(), 10);
          if (Number.isFinite(ap)) stats.AP = ap;
          if (Number.isFinite(aap)) stats.AAP = aap;
          if (Number.isFinite(dp)) stats.DP = dp;
          if (Number.isFinite(score)) stats.SCORE = score;
        }
      }
    } catch (err) {
      logger.debug('Failed to parse summary stats grid; continuing', err as Error);
    }

    const elapsed = Date.now() - start;
    logger.debug('Finished gear scraping', { items: gear.length, elapsed_ms: elapsed });
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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
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

// removed: previous regex-based summary parser
