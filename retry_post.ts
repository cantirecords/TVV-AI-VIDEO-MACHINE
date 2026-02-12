import { sendToWebhook } from './src/webhook.js';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function retry() {
    const videoPath = path.join(process.cwd(), 'out/video.mp4');
    const metadata = {
        headline: "RETRY: FATAL FAMILY FEUD",
        subHeadline: "Retrying the real video delivery with compressed file (2.3MB).",
        category: "NEWS"
    };
    await sendToWebhook(videoPath, metadata);
}

retry();
