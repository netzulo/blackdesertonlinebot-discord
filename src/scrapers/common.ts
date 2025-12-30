import { remote, type Browser } from 'webdriverio';
import { logger } from '../utils/logger';

/**
 * Create a configured WebDriverIO browser instance using environment variables.
 */
export async function createBrowser(): Promise<Browser> {
  const name = (process.env.BROWSER_NAME || 'chrome').toLowerCase();
  const headlessEnv = process.env.BROWSER_HEADLESS;
  const headless = headlessEnv ? /^(true|1|yes)$/i.test(headlessEnv) : true;
  const width = parseInt(process.env.BROWSER_WIDTH || '1920', 10);
  const height = parseInt(process.env.BROWSER_HEIGHT || '1080', 10);

  const commonArgs = [
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
  ];
  const chromeArgs = headless
    ? ['--headless=new', `--window-size=${width},${height}`, ...commonArgs]
    : [`--window-size=${width},${height}`, ...commonArgs];
  const firefoxArgs = headless ? ['-headless'] : [];

  const capabilities: Record<string, unknown> = { browserName: name };
  if (name === 'chrome' || name === 'chromium') {
    capabilities['goog:chromeOptions'] = { args: chromeArgs };
  } else if (name === 'firefox') {
    capabilities['moz:firefoxOptions'] = { args: firefoxArgs };
  }

  const browser = await remote({
    logLevel: 'error',
    capabilities,
  });

  try {
    // Keep element queries snappy to avoid long hangs
    try {
      await browser.setTimeout({ implicit: 500, pageLoad: 10000, script: 5000 });
    } catch (err) {
      logger.warn('Failed to set browser timeouts', err as Error);
    }
    await browser.setWindowSize(width, height);
    if (!headless) {
      await browser.maximizeWindow();
    }
  } catch (err) {
    logger.warn('Failed to set or maximize browser window', err as Error);
  }

  return browser as Browser;
}

/**
 * Attempt to dismiss cookie/privacy consent overlays if present.
 */
export async function tryDismissConsent(browser: Browser): Promise<void> {
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidates = await browser.$$(['button', '[role="button"]', 'a'].join(','));
      const phrases = ['accept', 'aceptar', 'agree', 'consent', 'continuar', 'ok'];

      for (const el of candidates) {
        const txt = (await el.getText()).toLowerCase().trim();
        if (phrases.some((p) => txt.includes(p))) {
          try {
            if (await el.isDisplayed()) {
              await el.click();
              await browser.pause(500);
              return;
            }
          } catch {
            // ignore and continue
          }
        }
      }
      await browser.pause(500);
    }
  } catch {
    // Ignore consent handling failures
  }
}
