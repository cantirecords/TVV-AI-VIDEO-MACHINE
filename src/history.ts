/**
 * history.ts — Shared deduplication store
 * 
 * Persists a list of article URLs that have already been posted
 * (either as a NewsCard or Reel) so no story appears twice.
 * 
 * Entries older than 12 hours are automatically purged because
 * all news is treated as "daily" — yesterday's stories are fair game again.
 * 
 * The history file lives at `.history/posted.json` in the repo root.
 * In GitHub Actions, this file is committed back to the repo after
 * each run so the state survives across workflow executions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_DIR = path.join(__dirname, '..', '.history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'posted.json');
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

interface HistoryEntry {
    url: string;
    type: 'card' | 'reel';
    postedAt: string; // ISO timestamp
}

/**
 * Load current history, purging entries older than 12 hours.
 */
export function loadHistory(): HistoryEntry[] {
    try {
        if (!fs.existsSync(HISTORY_FILE)) return [];

        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const all: HistoryEntry[] = JSON.parse(raw);

        const now = Date.now();
        const fresh = all.filter(e => now - new Date(e.postedAt).getTime() < MAX_AGE_MS);
        return fresh;
    } catch {
        return [];
    }
}

/**
 * Save an article URL as posted. Merges with existing history.
 */
export function recordPosted(url: string, type: 'card' | 'reel'): void {
    const history = loadHistory();

    // Don't add duplicates
    if (history.some(e => e.url === url)) return;

    history.push({ url, type, postedAt: new Date().toISOString() });

    if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`📝 Recorded [${type}] → ${url.substring(0, 80)}...`);
}

/**
 * Returns true if the given article URL has already been posted
 * (as any type) within the last 12 hours.
 */
export function alreadyPosted(url: string): boolean {
    const history = loadHistory();
    return history.some(e => e.url === url);
}

/**
 * Returns all posted URLs as a Set for fast lookup.
 */
export function getPostedUrls(): Set<string> {
    return new Set(loadHistory().map(e => e.url));
}
