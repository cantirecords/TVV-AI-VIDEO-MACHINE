import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Define the interface for a single history item
interface HistoryItem {
    public_id: string;
    url: string;
    type: 'video' | 'image';
    timestamp: string; // ISO string
}

const HISTORY_FILE = path.join(process.cwd(), 'cloudinary_history.json');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Loads the history from the JSON file.
 */
function loadHistory(): HistoryItem[] {
    if (!fs.existsSync(HISTORY_FILE)) {
        return [];
    }
    try {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse history file:', e);
        return [];
    }
}

/**
 * Saves the history to the JSON file.
 */
function saveHistory(history: HistoryItem[]) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * 1. Clean up old assets (older than 24 hours).
 */
export async function cleanupOldAssets() {
    console.log('🧹 Starting Smart Buffer Cleanup...');
    let history = loadHistory();
    const now = new Date();
    const retentionPeriodMs = 24 * 60 * 60 * 1000; // 24 hours

    const activeAssets: HistoryItem[] = [];
    const assetsToDelete: string[] = [];

    for (const item of history) {
        const itemTime = new Date(item.timestamp).getTime();
        const age = now.getTime() - itemTime;

        if (age > retentionPeriodMs) {
            assetsToDelete.push(item.public_id);
        } else {
            activeAssets.push(item);
        }
    }

    if (assetsToDelete.length > 0) {
        console.log(`Found ${assetsToDelete.length} old assets to delete.`);

        // Cloudinary API supports bulk deletion (up to 100 at a time usually)
        // We'll delete them one by one or in batches if needed, but for simplicity here:
        // Note: resources can be mixed types, but usually we just delete by public_id
        // We need to specify resource_type if it's 'video' vs 'image', but usually 'video' is safer to specify if mixed.
        // Let's iterate and delete individually to be safe with types.

        for (const publicId of assetsToDelete) {
            // We try both or check type if we saved it correctly. 
            // Ideally we saved the type. Let's look up the item to see type.
            const itemToDelete = history.find(h => h.public_id === publicId);
            const resourceType = itemToDelete?.type || 'video';

            try {
                await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                console.log(`Deleted old asset: ${publicId}`);
            } catch (err) {
                console.error(`Failed to delete asset ${publicId}:`, err);
            }
        }
    } else {
        console.log('No old assets to clean up.');
    }

    // Save the filtered list back
    saveHistory(activeAssets);
    console.log('✅ Smart Buffer Cleanup Complete.');
}

/**
 * 2. Upload a video to Cloudinary and record it in history.
 */
export async function uploadVideo(filePath: string): Promise<string> {
    console.log(`Uploading video to Cloudinary: ${filePath}`);

    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'video',
            folder: 'tvv_news_videos',
            use_filename: true,
            unique_filename: true
        });

        let videoUrl = result.secure_url;
        // Ensure URL ends with .mp4 for better Facebook/Make compatibility
        if (!videoUrl.toLowerCase().endsWith('.mp4')) {
            videoUrl += '.mp4';
        }

        console.log(`Upload successful! URL: ${videoUrl}`);

        // Update History
        const history = loadHistory();
        history.push({
            public_id: result.public_id,
            url: videoUrl,
            type: 'video',
            timestamp: new Date().toISOString()
        });
        saveHistory(history);

        return videoUrl;

    } catch (error) {
        console.error('Cloudinary upload failed:', error);
        throw error;
    }
}

/**
 * 3. Upload a static image (News Card) to Cloudinary.
 */
export async function uploadImage(filePath: string): Promise<string> {
    console.log(`Uploading image to Cloudinary: ${filePath}`);

    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'image',
            folder: 'tvv_news_cards',
            use_filename: true,
            unique_filename: true
        });

        console.log(`Image Upload successful! URL: ${result.secure_url}`);

        // Update History
        const history = loadHistory();
        history.push({
            public_id: result.public_id,
            url: result.secure_url,
            type: 'image',
            timestamp: new Date().toISOString()
        });
        saveHistory(history);

        return result.secure_url;

    } catch (error) {
        console.error('Cloudinary image upload failed:', error);
        throw error;
    }
}
