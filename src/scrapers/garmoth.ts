import { remote } from 'webdriverio';

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
  const browser = await remote({
    logLevel: 'error',
    capabilities: {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: [
          '--headless',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
        ],
      },
    },
  });

  try {
    await browser.url(profileUrl);

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
        console.error('Error processing gear element:', err);
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
        console.error('Error processing stat element:', err);
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
