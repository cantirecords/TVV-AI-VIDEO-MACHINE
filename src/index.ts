import { scrapeNews } from './scraper.js';
import { generateScript } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { getPostedUrls, recordPosted } from './history.js';
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

        // 0. Smart Buffer Cleanup
        await cleanupOldAssets();

        // 1. Load dedup history (last 12 hours of posted articles)
        const postedUrls = getPostedUrls();
        console.log(`🔍 Dedup: ${postedUrls.size} articles already posted in the last 12h.`);

        // 2. Scrape News — excluding already-posted articles (cards or reels)
        const articles = await scrapeNews(1, postedUrls);
        if (articles.length === 0) {
            console.log('No articles found.');
            return;
        }
        const article = articles[0]!;
        console.log(`Using article from ${article.source}: ${article.title}`);

        // 3. Extract detailed data
        const detailedData = await extractArticleData(article.url);

        // Download ONLY the primary background image
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        // Use a separate name for the session background to avoid overwriting the default
        let bgImage = 'background.png';
        const imageUrl = detailedData.images[0];
        let focusPoint = 'center';

        if (!imageUrl) {
            console.log('No article image found. Using default background.');
        } else {
            try {
                console.log(`Downloading background image for video: ${imageUrl}`);
                const imgRes = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                fs.writeFileSync(path.join(publicDir, 'background_video.png'), Buffer.from(imgRes.data));
                bgImage = 'background_video.png';

                console.log('Analyzing image focus with AI Vision...');
                focusPoint = await detectSubjectFocus(imageUrl);
            } catch (e) {
                console.error(`Failed to process article image:`, e instanceof Error ? e.message : String(e));
                console.log('Falling back to default background.');
                bgImage = 'background.png';
                focusPoint = 'center';
            }
        }

        // 4. Generate Viral Script (Headline, Sub-headline, Slides)
        const scriptData = await generateScript(detailedData.content || article.title);
        console.log(`Headline: ${scriptData.headline}`);

        // 5. Audio Check (Music only, no voiceover for now)
        const hasMusic = fs.existsSync(path.join(publicDir, 'music.mp3'));

        // 6. Render Video
        const compositionId = 'NewsVideo';
        const entryPath = path.join(process.cwd(), 'remotion/index.ts');

        console.log('Bundling project...');
        const bundleLocation = await bundle({ entryPoint: entryPath });

        console.log('Selecting composition...');
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: compositionId,
            inputProps: {
                title: scriptData.headline,
                subHeadline: scriptData.subHeadline,
                slides: scriptData.slides,
                category: scriptData.category,
                backgroundImage: bgImage,
                focusPoint,
                durationInFrames: (scriptData.slides.length * 6 * 30) + (30 * 2.5),
                hasMusic
            },
        });

        const outputLocation = path.join(process.cwd(), 'out/video.mp4');
        if (!fs.existsSync(path.join(process.cwd(), 'out'))) fs.mkdirSync(path.join(process.cwd(), 'out'));

        console.log('Rendering video...');
        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            outputLocation,
            codec: 'h264',
            crf: 32,
            pixelFormat: 'yuv420p',
            inputProps: composition.inputProps
        });

        console.log(`Video rendered successfully at: ${outputLocation}`);

        // 7. Upload to Cloudinary
        const videoUrl = await uploadVideo(outputLocation);

        // 8. Auto-Post URL via Webhook
        await sendToWebhook(videoUrl, {
            headline: scriptData.headline,
            subHeadline: scriptData.facebookDescription,
            category: scriptData.category
        });

        // 9. Record article as posted so news cards won't repeat it
        recordPosted(article.url, 'reel');

    } catch (error) {
        console.error('Pipeline failed:', error);
    }
}

main();
