import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Send a JSON payload to a Make.com webhook via curl using a temp file.
 * This is the ROBUST way to handle newlines, quotes and special characters.
 */
export async function sendToWebhook(
    videoUrl: string,
    metadata: { headline: string; subHeadline: string; category: string }
) {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        throw new Error('CRITICAL: MAKE_WEBHOOK_URL is not set.');
    }

    const tempFile = path.join(os.tmpdir(), `payload_${Date.now()}.json`);
    try {
        console.log(`Sending video URL to webhook: ${webhookUrl}`);

        const payload = JSON.stringify({
            videoUrl,
            headline: metadata.headline.trim(),
            subHeadline: metadata.subHeadline.trim(), // Old name for compatibility
            description: metadata.subHeadline.trim(), // New name
            category: metadata.category.trim(),
            timestamp: new Date().toISOString()
        });

        fs.writeFileSync(tempFile, payload);

        // Send using @ file to be 100% safe from shell escaping issues
        const curlCommand = `curl -i -s -X POST "${webhookUrl}" ` +
            `-H "Content-Type: application/json" ` +
            `-d @"${tempFile}"`;

        const response = execSync(curlCommand, { encoding: 'utf-8' });
        console.log(`Webhook response detail:\n${response}`);

        if (!response.toLowerCase().includes('200') && !response.toLowerCase().includes('accepted')) {
            console.warn('Warning: Webhook might have failed (no 200/Accepted in response)');
        }

        console.log('Webhook notification successful! 🚀');
    } catch (error: any) {
        console.error('Failed to send webhook notification:', error.message);
        throw error; // Propagate error to fail the pipeline
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

/**
 * Send a JSON payload to the News Card webhook via temp file.
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

    const tempFile = path.join(os.tmpdir(), `card_payload_${Date.now()}.json`);
    try {
        console.log(`Sending News Card to webhook: ${webhookUrl}`);

        const payload = JSON.stringify({
            imageUrl,
            headline: metadata.headline.trim(),
            description: metadata.facebookDescription.trim(),
            subHeadline: metadata.facebookDescription.trim(), // Safety fallback
            category: metadata.category.trim(),
            timestamp: new Date().toISOString()
        });

        fs.writeFileSync(tempFile, payload);

        const curlCommand = `curl -i -s -X POST "${webhookUrl}" ` +
            `-H "Content-Type: application/json" ` +
            `-d @"${tempFile}"`;

        const response = execSync(curlCommand, { encoding: 'utf-8' });
        console.log(`Webhook response detail:\n${response}`);
        console.log('News Card webhook notification successful! 🚀');
    } catch (error: any) {
        console.error('Failed to send card webhook:', error.message);
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}
