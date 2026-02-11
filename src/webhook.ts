import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function sendToWebhook(videoPath: string, metadata: { headline: string, subHeadline: string, category: string }) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('Warning: MAKE_WEBHOOK_URL is not set. Skipping auto-post.');
        return;
    }

    try {
        console.log(`Sending video to webhook: ${webhookUrl}`);

        // Read video as Buffer
        const videoBuffer = fs.readFileSync(videoPath);

        // Use a simpler JSON-based or direct binary delivery if preferred, 
        // but for Make, we'll send it as a base64 encoded string with metadata
        // to avoid complexity with multipart in this environment.
        const payload = {
            ...metadata,
            videoFileName: path.basename(videoPath),
            videoBase64: videoBuffer.toString('base64'),
            timestamp: new Date().toISOString()
        };

        const response = await axios.post(webhookUrl, payload, {
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log(`Webhook responded with status: ${response.status}`);
        console.log('Video delivery successful! 🚀');
    } catch (error) {
        console.error('Failed to send video to webhook:', error.message);
    }
}
