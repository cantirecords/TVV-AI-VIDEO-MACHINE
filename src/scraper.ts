import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export interface Article {
  title: string;
  url: string;
  source: string;
}

const FEEDS = [
  { name: 'Reuters World', url: 'https://www.reutersagency.com/feed/?best-topics=world-news&post_type=best' },
  { name: 'AP News', url: 'https://news.google.com/rss/search?q=when:24h+allinurl:apnews.com&hl=en-US&gl=US&ceid=US:en' },
  { name: 'CNN Politics', url: 'http://rss.cnn.com/rss/cnn_politics.rss' },
  { name: 'Fox News US', url: 'http://feeds.foxnews.com/foxnews/national' },
  { name: 'NBC News US', url: 'https://feeds.nbcnews.com/nbcnews/public/news' },
  { name: 'ABC News US', url: 'https://abcnews.go.com/abcnews/usheadlines' },
  { name: 'USA Today', url: 'https://rssfeeds.usatoday.com/usatoday-newstopstories&x=1' },
  { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/main' }
];

/**
 * Scrape news articles from all feeds.
 * 
 * @param limit - How many articles to return
 * @param isAlreadyPosted - Function to check if an article has already been posted
 */
export async function scrapeNews(
  limit: number = 1,
  isAlreadyPosted: (url: string, title: string) => boolean
): Promise<Article[]> {
  const allScrapedArticles: Article[] = [];

  for (const feed of FEEDS) {
    try {
      console.log(`Scraping: ${feed.name}...`);
      const response = await axios.get(feed.url);
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
        const titleContent = entry.title?.['#text'] || entry.title || 'No Title';
        const title = String(titleContent).trim();
        let url = entry.link?.['@_href'] || entry.link || entry.id;
        if (typeof url !== 'string') {
          url = entry.link?.['@_href'] || entry.guid || '';
        }
        url = String(url).trim();

        if (title && url) {
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

  console.log(`Scraping finished. Found ${allScrapedArticles.length} total articles.`);

  // --- Smart Deduplication ---
  const fresh = allScrapedArticles.filter(a => !isAlreadyPosted(a.url, a.title));
  console.log(`After smart dedup: ${fresh.length} fresh articles available.`);

  if (fresh.length === 0) {
    console.warn('⚠️ All articles have been posted recently. Waiting for fresh news...');
    return []; // Return empty instead of duplicates
  }

  // Filter for high-impact keywords
  const impactKeywords = [
    'breaking', 'trump', 'biden', 'white house', 'alert', 'shooting',
    'dead', 'killed', 'dies', 'crash', 'fire', 'murder', 'attack',
    'court', 'verdict', 'arrest', 'hurricane', 'earthquake', 'explosion',
    'tsunami', 'war', 'russia', 'ukraine', 'crisis', 'border'
  ];

  const highImpact = fresh.filter(a =>
    impactKeywords.some(k => a.title.toLowerCase().includes(k))
  );

  const finalArticles = highImpact.length > 0 ? highImpact : fresh;

  // Shuffle for variety and return
  return finalArticles.sort(() => Math.random() - 0.5).slice(0, limit);
}
