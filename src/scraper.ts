import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export interface Article {
  title: string;
  url: string;
  source: string;
}

const FEEDS = [
  // High-reliability news outlets with specific US/World latest feeds
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=when:24h+allinurl:apnews.com&hl=en-US&gl=US&ceid=US:en' },
  { name: 'CNN US', url: 'http://rss.cnn.com/rss/cnn_us.rss' },
  { name: 'Fox News US', url: 'http://feeds.foxnews.com/foxnews/national' },
  { name: 'NBC News US', url: 'https://feeds.nbcnews.com/nbcnews/public/news' },
  { name: 'ABC News US', url: 'https://abcnews.go.com/abcnews/usheadlines' },
  { name: 'USA Today', url: 'https://rssfeeds.usatoday.com/usatoday-newstopstories&x=1' },
  { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' },
  { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }
];

/**
 * Scrape news articles from all feeds.
 */
export async function scrapeNews(
  limit: number = 1,
  isAlreadyPosted: (url: string, title: string) => boolean
): Promise<Article[]> {
  const allScrapedArticles: Article[] = [];

  for (const feed of FEEDS) {
    try {
      console.log(`Scraping: ${feed.name}...`);
      const response = await axios.get(feed.url, { timeout: 15000 });
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
      });
      const jsonObj = parser.parse(response.data);

      let entries: any[] = [];
      if (jsonObj.feed && jsonObj.feed.entry) {
        entries = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];
      } else if (jsonObj.rss && jsonObj.rss.channel && jsonObj.rss.channel.item) {
        entries = Array.isArray(jsonObj.rss.channel.item) ? jsonObj.rss.channel.item : [jsonObj.rss.channel.item];
      }

      for (const entry of entries) {
        const titleContent = entry.title?.['#text'] || entry.title || '';
        const title = String(titleContent).trim();

        let url = entry.link?.['@_href'] || entry.link || entry.id;
        if (typeof url !== 'string') {
          url = entry.link?.['@_href'] || entry.guid || '';
        }
        url = String(url).trim();

        // VALIDATION: Skip generic titles or extremely short ones
        const skipKeywords = ['subscribe', 'world news', 'top stories', 'latest updates', 'newsletter', 'breaking news'];
        const isGeneric = skipKeywords.some(k => title.toLowerCase() === k);
        const isTooShort = title.split(' ').length < 4;

        if (title && url && !isGeneric && !isTooShort) {
          allScrapedArticles.push({
            title,
            url,
            source: feed.name,
          });
        }
      }
    } catch (e: any) {
      console.error(`Failed to scrape ${feed.name}:`, e.message);
    }
  }

  console.log(`Scraping finished. Found ${allScrapedArticles.length} valid articles.`);

  // --- Smart Deduplication ---
  const fresh = allScrapedArticles.filter(a => !isAlreadyPosted(a.url, a.title));
  console.log(`After smart dedup: ${fresh.length} fresh articles available.`);

  if (fresh.length === 0) {
    console.warn('⚠️ No truly fresh articles found. Waiting for new updates...');
    return [];
  }

  // Filter for high-impact keywords
  const impactKeywords = [
    'breaking', 'trump', 'biden', 'politics', 'arrest', 'shooting',
    'dead', 'killed', 'dies', 'crash', 'fire', 'murder', 'attack',
    'court', 'verdict', 'hurricane', 'earthquake', 'war', 'ukraine',
    'russia', 'china', 'crisis', 'emergency', 'scandal', 'exclusive'
  ];

  const highImpact = fresh.filter(a =>
    impactKeywords.some(k => a.title.toLowerCase().includes(k))
  );

  const finalArticles = highImpact.length > 0 ? highImpact : fresh;

  // Shuffle for variety and return
  return finalArticles.sort(() => Math.random() - 0.5).slice(0, limit);
}
