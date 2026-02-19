import { scrapeNews } from './scraper.js';
import { generateScript } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { isAlreadyPosted, recordPosted } from './history.js';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { sendToWebhook } from './webhook.js';
import { cleanupOldAssets, uploadVideo } from './cloudinaryService.js';
import { detectSubjectFocus } from './vision.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVV AI VIDEO MACHINE (V5 SMART FOCUS) ---');

        await cleanupOldAssets();

        // 1. Scrape News — using smart dedup
        const articles = await scrapeNews(1, isAlreadyPosted);
        if (articles.length === 0) {
            console.log('No fresh articles found. Terminating to avoid duplication.');
            return;
        }
        const article = articles[0]!;
        console.log(`Using article from ${article.source}: ${article.title}`);

        // 2. Extract detailed data
        const detailedData = await extractArticleData(article.url);

        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        // Image Handling
        let bgImage = 'background.png';
        const imageUrl = detailedData.images[0];
        let focusPoint = 'center';

        if (imageUrl) {
            try {
                const imgRes = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                fs.writeFileSync(path.join(publicDir, 'background_video.png'), Buffer.from(imgRes.data));
                bgImage = 'background_video.png';
                focusPoint = await detectSubjectFocus(imageUrl);
            } catch (e) {
                bgImage = 'background.png';
            }
        }

        // 3. Generate Script
        const scriptData = await generateScript(detailedData.content || article.title);

        // 4. Render Video
        const compositionId = 'NewsVideo';
        const entryPath = path.join(process.cwd(), 'remotion/index.ts');
        const bundleLocation = await bundle({ entryPoint: entryPath });

        const inputProps = {
            title: scriptData.headline,
            subHeadline: scriptData.subHeadline,
            slides: scriptData.slides,
            category: scriptData.category,
            backgroundImage: bgImage,
            focusPoint,
            durationInFrames: (scriptData.slides.length * 6 * 30) + (30 * 2.5),
            hasMusic: fs.existsSync(path.join(publicDir, 'music.mp3'))
        };

        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: compositionId,
            inputProps,
        });

        const outputLocation = path.join(process.cwd(), 'out/video.mp4');
        if (!fs.existsSync(path.join(process.cwd(), 'out'))) fs.mkdirSync(path.join(process.cwd(), 'out'));

        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            outputLocation,
            codec: 'h264',
            crf: 32,
            pixelFormat: 'yuv420p',
            inputProps, // Use the stored variable directly
        });

        // 5. Upload & Webhook
        const videoUrl = await uploadVideo(outputLocation);
        await sendToWebhook(videoUrl, {
            headline: scriptData.headline,
            subHeadline: scriptData.facebookDescription,
            category: scriptData.category
        });

        // 6. Record as posted
        recordPosted(article.url, article.title, 'reel');

    } catch (error) {
        console.error('Pipeline failed:', error);
        process.exit(1);
    }
}

main();
