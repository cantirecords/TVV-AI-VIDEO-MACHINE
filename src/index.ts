import { scrapeNews } from './scraper.js';
import { generateScript } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { sendToWebhook } from './webhook.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

import { detectSubjectFocus } from './vision.js';

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVV AI VIDEO MACHINE (V5 SMART FOCUS) ---');

        // 1. Scrape News
        const articles = await scrapeNews(1);
        if (articles.length === 0) {
            console.log('No articles found.');
            return;
        }
        const article = articles[0]!;
        console.log(`Using article from ${article.source}: ${article.title}`);

        // 2. Extract detailed data
        const detailedData = await extractArticleData(article.url);

        // Download ONLY the primary background image
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        let bgImage = 'background.png';
        let imageUrl = detailedData.images[0];

        // Smart Focus Analysis
        let focusPoint = 'center';
        if (imageUrl) {
            try {
                console.log(`Downloading primary background image: ${imageUrl}`);
                const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                fs.writeFileSync(path.join(publicDir, bgImage), Buffer.from(imgRes.data));

                console.log('Analyzing image focus with AI Vision...');
                focusPoint = await detectSubjectFocus(imageUrl);
            } catch (e) {
                console.error(`Failed to process image:`, e.message);
            }
        }

        // 3. Generate Viral Script (Headline, Sub-headline, Slides)
        const scriptData = await generateScript(detailedData.content || article.title);
        console.log(`Headline: ${scriptData.headline}`);

        // 4. Audio Check (Music only, no voiceover for now)
        const hasMusic = fs.existsSync(path.join(publicDir, 'music.mp3'));

        // 5. Render Video
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
                // Each slide gets 6 seconds to allow for reading
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
            crf: 32, // More aggressive compression for smaller file size
            pixelFormat: 'yuv420p',
            inputProps: composition.inputProps
        });

        console.log(`Video rendered successfully at: ${outputLocation}`);

        // 6. Auto-Post via Webhook
        await sendToWebhook(outputLocation, {
            headline: scriptData.headline,
            subHeadline: scriptData.facebookDescription, // Using the 2-paragraph viral summary as the description
            category: scriptData.category
        });

    } catch (error) {
        console.error('Pipeline failed:', error);
    }
}

main();
