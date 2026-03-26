import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import pRetry from 'p-retry';
import { createLogger } from '../logger';
import { config } from '../config';
import type { ScrapeJob, RawScrapedData } from '../types';

const log = createLogger('scraper');

// ─── Browser Pool ─────────────────────────────────────────────────────────────

class BrowserPool {
  private browser: Browser | null = null;

  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: config.SCRAPER_HEADLESS,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });
      log.info('Browser instance launched');
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      log.info('Browser instance closed');
    }
  }
}

export const browserPool = new BrowserPool();

// ─── Page Helpers ─────────────────────────────────────────────────────────────

async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });
}

// ─── Data Extractors ──────────────────────────────────────────────────────────

async function extractData(page: Page, url: string): Promise<Partial<RawScrapedData>> {
  return page.evaluate((pageUrl) => {
    const getText = (sel: string): string =>
      (document.querySelector(sel) as HTMLElement | null)?.innerText?.trim() ?? '';

    const getMeta = (name: string): string =>
      (document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement | null)
        ?.content?.trim() ?? '';

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const bodyText = document.body?.innerText ?? '';
    const hrefEmails = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
      .map((a) => (a as HTMLAnchorElement).href.replace('mailto:', '').split('?')[0]);
    const textEmails = bodyText.match(emailRegex) ?? [];
    const emails = [...new Set([...hrefEmails, ...textEmails])].slice(0, 10);

    // Extract phones
    const phoneRegex = /(\+?1?\s?)?(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/g;
    const phones = [...new Set(bodyText.match(phoneRegex) ?? [])].slice(0, 5);

    // Social links
    const socialDomains = ['linkedin.com', 'twitter.com', 'facebook.com', 'instagram.com'];
    const socialLinks = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((href) => socialDomains.some((d) => href.includes(d)))
      .filter((href) => href.startsWith('http'));

    const linkedinUrl = socialLinks.find((l) => l.includes('linkedin.com/company') || l.includes('linkedin.com/in'));

    return {
      url: pageUrl,
      title: document.title?.trim() || getText('h1'),
      description:
        getMeta('description') ||
        getMeta('og:description') ||
        getText('[class*="description"]').slice(0, 500),
      emails,
      phones,
      companyName:
        getMeta('og:site_name') ||
        getText('[class*="company-name"], [class*="org-name"], [itemprop="name"]') ||
        document.title?.split(/[-|–]/)[0]?.trim(),
      linkedinUrl,
      websiteUrl: pageUrl,
      socialLinks: [...new Set(socialLinks)].slice(0, 10),
    };
  }, url);
}

// ─── Core Scraper ─────────────────────────────────────────────────────────────

export async function scrapeUrl(job: ScrapeJob): Promise<RawScrapedData> {
  const startTime = Date.now();

  const result = await pRetry(
    async () => {
      const browser = await browserPool.getBrowser();
      const context = await createContext(browser);
      const page = await context.newPage();

      try {
        log.info('Scraping URL', { jobId: job.id, url: job.url });

        await page.goto(job.url, {
          waitUntil: 'networkidle',
          timeout: job.timeout,
        });

        // Wait for content to load
        await page.waitForLoadState('domcontentloaded');

        const rawHtml = await page.content();
        const extracted = await extractData(page, job.url);

        const durationMs = Date.now() - startTime;

        const data: RawScrapedData = {
          jobId: job.id,
          url: job.url,
          title: extracted.title,
          description: extracted.description,
          emails: extracted.emails ?? [],
          phones: extracted.phones ?? [],
          companyName: extracted.companyName,
          linkedinUrl: extracted.linkedinUrl,
          websiteUrl: extracted.websiteUrl,
          socialLinks: extracted.socialLinks ?? [],
          rawHtml: rawHtml.slice(0, 50000), // Cap at 50 KB
          scrapedAt: new Date(),
          durationMs,
          metadata: job.metadata,
        };

        log.info('Scrape successful', {
          jobId: job.id,
          url: job.url,
          durationMs,
          emailsFound: data.emails.length,
        });

        return data;
      } finally {
        await page.close();
        await context.close();
      }
    },
    {
      retries: job.maxRetries,
      minTimeout: 2000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        log.warn('Scrape attempt failed, retrying', {
          jobId: job.id,
          url: job.url,
          attempt: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          error: error.message,
        });
      },
    },
  );

  return result;
}
