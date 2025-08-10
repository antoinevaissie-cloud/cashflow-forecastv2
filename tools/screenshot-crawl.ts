#!/usr/bin/env tsx
import { chromium, Browser } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { URL } from 'url';
import path from 'path';

type QueueItem = { url: string };

const START_URL = process.env.START_URL || 'http://localhost:3000';
const OUT_DIR = process.env.OUT_DIR || 'screenshots';
const MAX_PAGES = Number(process.env.MAX_PAGES || 200);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const POLITE_DELAY_MS = Number(process.env.POLITE_DELAY_MS || 150);

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function safeName(u: string): string {
  const { host, pathname, search } = new URL(u);
  const slug = (pathname === '/' ? 'home' : pathname.replace(/[^a-zA-Z0-9-_]/g, '_'));
  const hash = createHash('sha1').update(u).digest('hex').slice(0, 10);
  return `${host}${slug ? '_' + slug : ''}_${hash}.png`;
}

async function fetchSitemap(startUrl: string): Promise<string[]> {
  try {
    const u = new URL('/sitemap.xml', startUrl).toString();
    const res = await fetch(u);
    if (!res.ok) return [];
    const xml = await res.text();
    const urls: string[] = [];
    const re = /<loc>(.*?)<\/loc>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) urls.push(m[1]);
    return urls.filter((x) => x.startsWith(new URL(startUrl).origin));
  } catch {
    return [];
  }
}

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function screenshotUrl(browser: Browser, url: string, outPath: string): Promise<void> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await context.newPage();
  // Block analytics
  await context.route('**/*', (route) => {
    const reqUrl = route.request().url();
    if (/google-analytics|gtag|segment|mixpanel|hotjar/i.test(reqUrl)) return route.abort();
    route.continue();
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.evaluate(async () => {
    // @ts-ignore
    await (document as any).fonts?.ready?.catch?.(() => {});
  });
  await page.screenshot({ path: outPath, fullPage: true });
  await context.close();
}

function isSameOrigin(base: string, candidate: string): boolean {
  try {
    const b = new URL(base);
    const c = new URL(candidate, b);
    return c.origin === b.origin;
  } catch {
    return false;
  }
}

function normalizeLink(base: string, href: string): string | null {
  if (!href) return null;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return null;
  try {
    const u = new URL(href, base);
    return isSameOrigin(base, u.toString()) ? u.toString() : null;
  } catch {
    return null;
  }
}

async function crawl(): Promise<void> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const indexPath = path.join(OUT_DIR, 'index.json');
  const visited = new Set<string>();
  const toVisit: QueueItem[] = [{ url: START_URL }];
  const index: Record<string, string> = {};

  // seed with sitemap
  for (const u of await fetchSitemap(START_URL)) {
    toVisit.push({ url: u });
  }

  const browser = await launchBrowser();
  try {
    const active = new Set<Promise<void>>();

    async function worker(item: QueueItem) {
      const { url } = item;
      if (visited.has(url) || visited.size >= MAX_PAGES) return;
      visited.add(url);
      const file = safeName(url);
      const outPath = path.join(OUT_DIR, file);
      try {
        await screenshotUrl(browser, url, outPath);
        index[url] = outPath;
        // Extract links from the page by fetching HTML quickly
        const res = await fetch(url).catch(() => null);
        const html = await res?.text().catch(() => '') ?? '';
        const links = Array.from(html.matchAll(/href\s*=\s*"([^"]+)"/g)).map((m) => m[1]);
        for (const href of links) {
          const n = normalizeLink(url, href);
          if (n && !visited.has(n) && toVisit.length + visited.size < MAX_PAGES) {
            toVisit.push({ url: n });
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed', url, e);
      }
      await sleep(POLITE_DELAY_MS);
    }

    while (toVisit.length && visited.size < MAX_PAGES) {
      while (active.size < CONCURRENCY && toVisit.length) {
        const item = toVisit.shift()!;
        const p = worker(item).finally(() => active.delete(p));
        active.add(p);
      }
      await Promise.race(active);
    }

    await Promise.all([...active]);
  } finally {
    await browser.close();
  }

  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  // eslint-disable-next-line no-console
  console.log('Wrote', indexPath);
}

crawl().catch((err) => {
  console.error(err);
  process.exit(1);
});
