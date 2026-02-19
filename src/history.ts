import fs from 'fs';
import path from 'path';

const HISTORY_DIR = path.join(process.cwd(), '.history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'posted.json');

interface PostedArticle {
    url: string;
    titleNorm: string; // Normalized title for better dedup
    type: 'card' | 'reel';
    timestamp: number;
}

function normalize(text: string): string {
    return text.toLowerCase()
        .replace(/[^\w\s]/gi, '') // Remove punctuation
        .split(/\s+/)
        .slice(0, 8) // Compare first 8 words
        .join(' ');
}

export function getPostedUrls(): Set<string> {
    const history = loadHistory();
    return new Set(history.map(item => item.url));
}

export function isAlreadyPosted(url: string, title: string): boolean {
    const history = loadHistory();
    const normTitle = normalize(title);

    return history.some(item =>
        item.url === url ||
        (item.titleNorm === normTitle && normTitle.length > 10)
    );
}

function loadHistory(): PostedArticle[] {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    try {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const data = JSON.parse(raw) as PostedArticle[];

        // Purge items older than 12 hours
        const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
        return data.filter(item => item.timestamp > twelveHoursAgo);
    } catch (e) {
        return [];
    }
}

export function recordPosted(url: string, title: string, type: 'card' | 'reel') {
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

    const history = loadHistory();
    history.push({
        url,
        titleNorm: normalize(title),
        type,
        timestamp: Date.now()
    });

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`📝 Recorded [${type}] → ${url}`);
}
