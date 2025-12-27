import { remote } from 'webdriverio';

export interface BossInfo {
  name: string;
  time: string;
}

export interface BossTimerData {
  previousBoss: BossInfo | null;
  nextBoss: BossInfo | null;
  followedBy: BossInfo[];
  weeklySchedule: Record<string, BossInfo[]>; // day -> boss times
}

export async function scrapeBossTimer(): Promise<BossTimerData> {
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
    await browser.url('https://garmoth.com/boss-timer');

    // Wait for the page to load dynamic content
    await browser.waitUntil(
      async () => {
        const headings = await browser.$$("//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'boss')]");
        return headings.length > 0;
      },
      { timeout: 15000, timeoutMsg: 'Boss timer headings not found' }
    );

    // Scrape central section for current boss info
    let previousBoss: BossInfo | null = null;
    let nextBoss: BossInfo | null = null;
    const followedBy: BossInfo[] = [];

    // Try to get previous boss
    try {
      const prevTextEl = await browser.$(
        "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'previous boss')]/following::*[self::div or self::p or self::span][contains(.,':')][1]"
      );
      if (await prevTextEl.isExisting()) {
        const text = await prevTextEl.getText();
        const info = parseBossInfo(text);
        if (info) previousBoss = info;
      } else {
        // Fallback: look for any element containing a time near the heading
        const prevFallback = await browser.$(
          "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'previous boss')]/following::*[contains(.,':')][1]"
        );
        if (await prevFallback.isExisting()) {
          const text = await prevFallback.getText();
          const info = parseBossInfo(text);
          if (info) previousBoss = info;
        }
      }
    } catch (err) {
      console.error('Error getting previous boss:', err);
    }

    // Try to get next boss
    try {
      const nextTextEl = await browser.$(
        "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'next boss')]/following::*[self::div or self::p or self::span][contains(.,':')][1]"
      );
      if (await nextTextEl.isExisting()) {
        const text = await nextTextEl.getText();
        const info = parseBossInfo(text);
        if (info) nextBoss = info;
      } else {
        const nextFallback = await browser.$(
          "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'next boss')]/following::*[contains(.,':')][1]"
        );
        if (await nextFallback.isExisting()) {
          const text = await nextFallback.getText();
          const info = parseBossInfo(text);
          if (info) nextBoss = info;
        }
      }
    } catch (err) {
      console.error('Error getting next boss:', err);
    }

    // Try to get followed by bosses
    try {
      const container = await browser.$(
        "//h3[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'followed by')]/following::*[self::div or self::ul or self::p][1]"
      );
      if (await container.isExisting()) {
        const items = await container.$$('*');
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
      console.error('Error getting followed by bosses:', err);
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
          console.error('Error processing schedule row:', err);
        }
      }
    } catch (err) {
      console.error('Error getting weekly schedule:', err);
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
  const timeFirstMatch = cleaned.match(/^(\d{2}:\d{2}(?::\d{2})?)\s*([A-Za-z ]+(?:\|[A-Za-z ]+)*)$/);
  if (timeFirstMatch) {
    const time = timeFirstMatch[1];
    const names = timeFirstMatch[2].split('|').map((n) => n.trim()).filter(Boolean);
    return {
      name: names.join(' & '),
      time,
    };
  }

  // Pattern 2: Name(s) first, then time (with optional separators like -, :, |)
  // Examples: "Kzarka - 12:00", "Garmoth 14:00", "Kzarka|Nouver 19:00"
  const nameFirstMatch = cleaned.match(/^([A-Za-z ]+(?:\|[A-Za-z ]+)*)\s*(?:[-–:|])?\s*(\d{2}:\d{2}(?::\d{2})?)$/);
  if (nameFirstMatch) {
    const names = nameFirstMatch[1].split('|').map((n) => n.trim()).filter(Boolean);
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
