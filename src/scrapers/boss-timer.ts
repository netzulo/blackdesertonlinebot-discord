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

    // Wait for the page to load
    await browser.pause(2000);

    // Scrape central section for current boss info
    let previousBoss: BossInfo | null = null;
    let nextBoss: BossInfo | null = null;
    const followedBy: BossInfo[] = [];

    // Try to get previous boss
    try {
      const prevElement = await browser.$('[class*="previous"], [class*="prev"]');
      if (prevElement) {
        const text = await prevElement.getText();
        if (text) {
          previousBoss = parseBossInfo(text);
        }
      }
    } catch (err) {
      console.error('Error getting previous boss:', err);
    }

    // Try to get next boss
    try {
      const nextElement = await browser.$('[class*="next"], [class*="upcoming"]');
      if (nextElement) {
        const text = await nextElement.getText();
        if (text) {
          nextBoss = parseBossInfo(text);
        }
      }
    } catch (err) {
      console.error('Error getting next boss:', err);
    }

    // Try to get followed by bosses
    try {
      const followedElements = await browser.$$('[class*="followed"], [class*="upcoming-list"] li');
      for (const element of followedElements) {
        const text = await element.getText();
        if (text) {
          const bossInfo = parseBossInfo(text);
          if (bossInfo) {
            followedBy.push(bossInfo);
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

  // Try to extract boss name and time
  // Format might be like "Kzarka - 12:00" or "Kzarka 12:00" etc.
  const parts = text.split(/[-–:|]/);

  if (parts.length >= 2) {
    return {
      name: parts[0].trim(),
      time: parts.slice(1).join(':').trim(),
    };
  }

  // If no clear separator, just return the text as name
  return {
    name: text.trim(),
    time: '',
  };
}
