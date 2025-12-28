import type { Browser } from 'webdriverio';
import { logger } from '../utils/logger';
import { createBrowser, tryDismissConsent } from './common';
import { getProxyUrl } from '../utils/config';

export interface BossInfo {
  name: string;
  time: string;
  imageUrl?: string;
}

export interface BossTimerData {
  previousBoss: BossInfo | null;
  nextBoss: BossInfo | null;
  followedBy: BossInfo[];
  weeklySchedule: Record<string, BossInfo[]>; // day -> boss times
}

export async function scrapeBossTimer(region?: string): Promise<BossTimerData> {
  const browser = await createBrowser();

  try {
    await browser.url(`${getProxyUrl()}/boss-timer`);
    logger.debug('Navigated to boss timer page');

    // Window sizing handled in createBrowser

    // Attempt to dismiss privacy/cookie consent overlays if present
    await tryDismissConsent(browser);
    logger.debug('Consent dialog handling attempted');

    // Optional: select region from dropdown if provided
    if (region && region.trim()) {
      const ok = await selectRegion(browser, region.trim());
      logger.debug('Region selection attempted', { region, ok });
      // brief pause to allow content refresh after region change
      await browser.pause(1000);
    }

    // Wait for headings via XPath (more stable across layouts)
    try {
      await browser.waitUntil(
        async () => {
          const prevH = await browser.$(
            "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'previous boss')]"
          );
          const nextH = await browser.$(
            "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'next boss')]"
          );
          const folH = await browser.$(
            "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'followed by')]"
          );
          return (
            (await prevH.isExisting()) || (await nextH.isExisting()) || (await folH.isExisting())
          );
        },
        { timeout: 20000, timeoutMsg: 'Boss timer headings not found' }
      );
    } catch (e) {
      logger.warn('Boss timer heading wait timed out, proceeding with fallbacks');
    }

    // Scrape central section for current boss info
    let previousBoss: BossInfo | null = null;
    let nextBoss: BossInfo | null = null;
    const followedBy: BossInfo[] = [];

    // Helper: get timed text right after a given heading using XPath
    const getTimedTextAfterHeading = async (headingText: string): Promise<string | undefined> => {
      const timedEl = await browser.$(
        `//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${headingText.toLowerCase()}')]/following::*[contains(normalize-space(.), ':')][1]`
      );
      if (await timedEl.isExisting()) {
        return await timedEl.getText();
      }
      return undefined;
    };

    // Helper: robustly extract time after a heading
    const extractTimeAfterHeading = async (headingText: string): Promise<string | undefined> => {
      const candidates = await browser.$$(
        `//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${headingText.toLowerCase()}')]/following::*[self::div or self::p or self::span or self::li][position()<=10]`
      );
      for (const el of candidates) {
        const text = (await el.getText()).trim();
        const m = text.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
        if (m) return m[1];
      }
      // fallback to previous method
      const prevText = await getTimedTextAfterHeading(headingText);
      const m2 = prevText?.match(/\b(\d{2}:\d{2}(?::\d{2})?)\b/);
      return m2?.[1];
    };

    // Helper: extract boss names after a heading (prefer textual names, then image alt/title)
    const extractNamesAfterHeading = async (headingText: string): Promise<string | undefined> => {
      // Try textual names containing '|'
      const namesEl = await browser.$(
        `//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${headingText.toLowerCase()}')]/following::*[contains(normalize-space(.), '|')][1]`
      );
      if (await namesEl.isExisting()) {
        const txt = (await namesEl.getText()).replace(/\s+/g, ' ').trim();
        if (txt) return txt;
      }

      // Otherwise, collect alt/title from nearby boss images
      const imgEls = await browser.$$(
        `//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${headingText.toLowerCase()}')]/following::img[position()<=5]`
      );
      const names: string[] = [];
      for (const img of imgEls) {
        const src = (await img.getAttribute('src')) || '';
        if (!/boss|garmoth|cdn|images/i.test(src)) continue;
        const alt = (await img.getAttribute('alt')) || '';
        const title = (await img.getAttribute('title')) || '';
        const n = (alt || title).trim();
        if (n) names.push(n);
      }
      if (names.length) return names.join(' | ');
      return undefined;
    };

    // Try to get previous boss
    try {
      const prevTime = await extractTimeAfterHeading('previous boss');
      const prevNames = await extractNamesAfterHeading('previous boss');
      if (prevTime || prevNames) {
        previousBoss = {
          name: prevNames || 'Unknown',
          time: prevTime || '',
          imageUrl: await findImageAfterHeading(browser, 'previous boss'),
        };
      } else {
        // Global fallback: first timed text on page
        const candidates = await browser.$$('div, p, span');
        for (const el of candidates) {
          const text = await el.getText();
          if (/\b\d{2}:\d{2}(?::\d{2})?\b/.test(text)) {
            const info = parseBossInfo(text);
            if (info) {
              previousBoss = info;
              break;
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error getting previous boss:', err as Error);
    }

    // Try to get next boss
    try {
      const nextTime = await extractTimeAfterHeading('next boss');
      const nextNames = await extractNamesAfterHeading('next boss');
      if (nextTime || nextNames) {
        nextBoss = {
          name: nextNames || 'Unknown',
          time: nextTime || '',
          imageUrl: await findImageAfterHeading(browser, 'next boss'),
        };
      } else {
        // Global fallback: second distinct timed text on page
        const candidates = await browser.$$('div, p, span');
        let count = 0;
        for (const el of candidates) {
          const text = await el.getText();
          if (/\b\d{2}:\d{2}(?::\d{2})?\b/.test(text)) {
            count += 1;
            if (count === 2) {
              const info = parseBossInfo(text);
              if (info) {
                nextBoss = info;
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error getting next boss:', err as Error);
    }

    // Try to get followed by bosses
    try {
      const container = await browser.$(
        "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'followed by')]/following::*[self::div or self::ul or self::p][1]"
      );
      if (await container.isExisting()) {
        const items = await container.$$('div, li, p, span');
        for (const el of items) {
          const text = await el.getText();
          if (text) {
            const info = parseBossInfo(text);
            if (info && (info.name || info.time)) {
              followedBy.push(info);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error getting followed by bosses:', err as Error);
    }

    // Scrape weekly schedule table
    const weeklySchedule: Record<string, BossInfo[]> = {};
    const daysOfWeek = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    try {
      // Try to find the schedule table
      const tableRows = await browser.$$('table tr, [class*="schedule"] tr, [class*="table"] tr');

      for (const row of tableRows) {
        try {
          const cells = await row.$$('td');
          const cellCount = await Promise.resolve(cells.length);

          if (cellCount > 0) {
            const dayText = await cells[0].getText();
            const day = daysOfWeek.find((d) => dayText.toLowerCase().includes(d.toLowerCase()));

            if (day) {
              weeklySchedule[day] = [];
              for (let i = 1; i < cellCount; i++) {
                const cellText = await cells[i].getText();
                if (cellText && cellText.trim()) {
                  const bossInfo = parseBossInfo(cellText);
                  if (bossInfo) {
                    weeklySchedule[day].push(bossInfo);
                  }
                }
              }
            }
          }
        } catch (err) {
          // Skip rows that can't be processed
          logger.error('Error processing schedule row:', err as Error);
        }
      }
    } catch (err) {
      logger.error('Error getting weekly schedule:', err as Error);
    }

    return {
      previousBoss,
      nextBoss,
      followedBy,
      weeklySchedule,
    };
  } finally {
    await browser.deleteSession();
  }
}

function parseBossInfo(text: string): BossInfo | null {
  if (!text || !text.trim()) {
    return null;
  }

  const cleaned = text.replace(/\s+/g, ' ').trim();

  // Pattern 1: Time first, then one or more boss names separated by |
  // Example: "02:21:54 Uturi|Offin" or "07:38:05 Golden Pig King|Nouver"
  const timeFirstMatch = cleaned.match(
    /^(\d{2}:\d{2}(?::\d{2})?)\s*([A-Za-z ]+(?:\|[A-Za-z ]+)*)$/
  );
  if (timeFirstMatch) {
    const time = timeFirstMatch[1];
    const names = timeFirstMatch[2]
      .split('|')
      .map((n) => n.trim())
      .filter(Boolean);
    return {
      name: names.join(' & '),
      time,
    };
  }

  // Pattern 2: Name(s) first, then time (with optional separators like -, :, |)
  // Examples: "Kzarka - 12:00", "Garmoth 14:00", "Kzarka|Nouver 19:00"
  const nameFirstMatch = cleaned.match(
    /^([A-Za-z ]+(?:\|[A-Za-z ]+)*)\s*(?:[-–:|])?\s*(\d{2}:\d{2}(?::\d{2})?)$/
  );
  if (nameFirstMatch) {
    const names = nameFirstMatch[1]
      .split('|')
      .map((n) => n.trim())
      .filter(Boolean);
    const time = nameFirstMatch[2];
    return {
      name: names.join(' & '),
      time,
    };
  }

  // Fallback: if contains a time anywhere, extract the first HH:MM(:SS)? and use remaining as name
  const timeAnyMatch = cleaned.match(/(\d{2}:\d{2}(?::\d{2})?)/);
  if (timeAnyMatch) {
    const time = timeAnyMatch[1];
    const name = cleaned.replace(time, '').replace(/[-–|]/g, ' ').trim();
    return {
      name: name || cleaned,
      time,
    };
  }

  // If no clear pattern, just return the text as name
  return {
    name: cleaned,
    time: '',
  };
}

// Try to find an image URL near a heading by scanning following nodes
async function findImageAfterHeading(
  browser: Browser,
  headingText: string
): Promise<string | undefined> {
  try {
    const imgEl = await browser.$(
      `//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${headingText.toLowerCase()}')]/following::*[self::img or self::figure or self::div or self::span][1]//img[1] | //h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${headingText.toLowerCase()}')]/following::img[1]`
    );
    if (await imgEl.isExisting()) {
      const src = await imgEl.getAttribute('src');
      if (src && /boss|garmoth|cdn|images/i.test(src)) {
        return src;
      }
    }
  } catch (e) {
    logger.warn(`Image search failed for heading '${headingText}'`, e as Error);
  }
  return undefined;
}


// Select a region from the top-right dropdown (e.g., EU, NA, SA)
async function selectRegion(browser: Browser, regionName: string): Promise<boolean> {
  const target = regionName.trim();
  const lower = target.toLowerCase();
  try {
    // Find a toggle/button containing the current or any region label
    const toggle = await browser.$(
      "//nav//*[self::button or self::a or self::div or self::span][contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'eu') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'na') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sa') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'sea') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'kr') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'jp') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'ru') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'mena')][1]"
    );
    if (await toggle.isExisting()) {
      await toggle.click();
      logger.debug('Region dropdown opened');
      await browser.pause(300);
    }

    // Try to find a menu item with the requested region text
    const option = await browser.$(
      `//*[self::a or self::button or self::li or self::div][contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${lower}')][1]`
    );
    if (await option.isExisting()) {
      const label = (await option.getText()).trim();
      logger.debug('Region option found', { label });
      await option.click();
      await browser.pause(500);
      return true;
    }

    logger.debug('Region option not found', { region: target });
    return false;
  } catch (err) {
    logger.warn('Region selection failed', err as Error);
    return false;
  }
}
