import { execSync } from 'child_process';

/**
 * Send a JSON payload to a Make.com webhook via curl.
 * Uses application/json (not form-data) which is required by Make.com.
 */
export async function sendToWebhook(
    videoUrl: string,
    metadata: { headline: string; subHeadline: string; category: string }
) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('Warning: MAKE_WEBHOOK_URL is not set. Skipping auto-post.');
        return;
    }

    try {
        console.log(`Sending video URL to webhook via CURL: ${webhookUrl}`);

        const payload = JSON.stringify({
            videoUrl,
            headline: metadata.headline,
            description: metadata.subHeadline,
            category: metadata.category,
            timestamp: new Date().toISOString()
        });

        // Use JSON body — Make.com webhooks expect application/json
        const curlCommand = `curl -s -X POST "${webhookUrl}" ` +
            `-H "Content-Type: application/json" ` +
            `-d '${payload.replace(/'/g, "'\\''")}'`;

        const response = execSync(curlCommand, { encoding: 'utf-8' });
        console.log(`Webhook response: ${response}`);
        console.log('Webhook notification successful! 🚀');
    } catch (error: any) {
        console.error('Failed to send webhook notification:', error.message);
    }
}

/**
 * Send a JSON payload to the News Card webhook via curl.
 */
export async function sendCardToWebhook(
    imageUrl: string,
    metadata: { headline: string; facebookDescription: string; category: string },
    webhookUrl: string
) {
    if (!webhookUrl) {
        console.warn('Warning: webhook URL not provided. Skipping.');
        return;
    }

    try {
        console.log(`Sending News Card URL to webhook via CURL: ${webhookUrl}`);

        const payload = JSON.stringify({
            imageUrl,
            headline: metadata.headline,
            description: metadata.facebookDescription,
            category: metadata.category,
            timestamp: new Date().toISOString()
        });

        const curlCommand = `curl -s -X POST "${webhookUrl}" ` +
            `-H "Content-Type: application/json" ` +
            `-d '${payload.replace(/'/g, "'\\''")}'`;

        const response = execSync(curlCommand, { encoding: 'utf-8' });
        console.log(`Webhook response: ${response}`);
        console.log('News Card webhook notification successful! 🚀');
    } catch (error: any) {
        console.error('Failed to send card webhook:', error.message);
    }
}
