import { execSync } from 'child_process';
import path from 'path';

export async function sendToWebhook(videoUrl: string, metadata: { headline: string, subHeadline: string, category: string }) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('Warning: MAKE_WEBHOOK_URL is not set. Skipping auto-post.');
        return;
    }

    try {
        console.log(`Sending video URL to webhook via CURL: ${webhookUrl}`);

        const timestamp = new Date().toISOString();

        // Using curl to send just the URL and metadata
        const curlCommand = `curl -X POST "${webhookUrl}" ` +
            `-F "videoUrl=${videoUrl}" ` +
            `-F "headline=${metadata.headline.replace(/"/g, '\\"')}" ` +
            `-F "subHeadline=${metadata.subHeadline.replace(/"/g, '\\"')}" ` +
            `-F "category=${metadata.category.replace(/"/g, '\\"')}" ` +
            `-F "timestamp=${timestamp}"`;

        execSync(curlCommand, { stdio: 'inherit' });

        console.log('Webhook notification successful! 🚀');
    } catch (error) {
        console.error('Failed to send webhook notification:', error.message);
    }
}
