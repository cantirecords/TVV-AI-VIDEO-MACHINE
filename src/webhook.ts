import { execSync } from 'child_process';
import path from 'path';

export async function sendToWebhook(videoPath: string, metadata: { headline: string, subHeadline: string, category: string }) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('Warning: MAKE_WEBHOOK_URL is not set. Skipping auto-post.');
        return;
    }

    try {
        console.log(`Sending video to webhook via CURL: ${webhookUrl}`);

        const absPath = path.resolve(videoPath);
        const timestamp = new Date().toISOString();

        // Using curl for maximum stability with binary multipart over SSL
        const curlCommand = `curl -X POST "${webhookUrl}" ` +
            `-F "file=@${absPath}" ` +
            `-F "headline=${metadata.headline.replace(/"/g, '\\"')}" ` +
            `-F "subHeadline=${metadata.subHeadline.replace(/"/g, '\\"')}" ` +
            `-F "category=${metadata.category.replace(/"/g, '\\"')}" ` +
            `-F "timestamp=${timestamp}"`;

        execSync(curlCommand, { stdio: 'inherit' });

        console.log('Video delivery successful! 🚀');
    } catch (error) {
        console.error('Failed to send video to webhook via curl:', error.message);
    }
}
