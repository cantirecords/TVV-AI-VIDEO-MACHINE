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

async function downloadAndValidateImage(imageUrl: string, publicDir: string): Promise<string | null> {
    try {
        console.log(`Checking image: ${imageUrl}`);
        const imgRes = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const size = imgRes.data.byteLength;
        const contentType = imgRes.headers['content-type'] || '';

        if (contentType.startsWith('image/') && size > 35000) {
            const fileName = 'background_video.png';
            fs.writeFileSync(path.join(publicDir, fileName), Buffer.from(imgRes.data));
            return fileName;
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVV VIDEO REEL (IMAGE-STRICT MODE) ---');
        await cleanupOldAssets();

        const articles = await scrapeNews(15, isAlreadyPosted);
        if (articles.length === 0) {
            console.log('No fresh articles found.');
            return;
        }

        let selectedArticle = null;
        let selectedData = null;
        let validImageFile = null;
        let focusPoint = 'center';

        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        for (const article of articles) {
            console.log(`\nEvaluating: ${article.title}`);
            const detailedData = await extractArticleData(article.url);

            if (!detailedData.content || detailedData.content.length < 300) {
                continue;
            }

            let localFile = null;
            for (const imgUrl of detailedData.images) {
                localFile = await downloadAndValidateImage(imgUrl, publicDir);
                if (localFile) {
                    focusPoint = await detectSubjectFocus(imgUrl);
                    break;
                }
            }

            if (localFile) {
                selectedArticle = article;
                selectedData = detailedData;
                validImageFile = localFile;
                break;
            }
        }

        if (!selectedArticle || !selectedData || !validImageFile) {
            console.log('❌ No articles with valid high-res images found.');
            return;
        }

        const scriptData = await generateScript(selectedData.content);

        // Render Video
        const compositionId = 'NewsVideo';
        const entryPath = path.join(process.cwd(), 'remotion/index.ts');
        const bundleLocation = await bundle({ entryPoint: entryPath });

        const inputProps = {
            title: scriptData.headline,
            subHeadline: scriptData.subHeadline,
            slides: scriptData.slides,
            category: scriptData.category,
            backgroundImage: validImageFile,
            focusPoint,
            durationInFrames: (scriptData.slides.length * 6 * 30) + (30 * 2.5),
            hasMusic: fs.existsSync(path.join(publicDir, 'music.mp3'))
        };

        const composition = await selectComposition({ serveUrl: bundleLocation, id: compositionId, inputProps });

        const outputLocation = path.join(process.cwd(), 'out/video.mp4');
        if (!fs.existsSync(path.join(process.cwd(), 'out'))) fs.mkdirSync(path.join(process.cwd(), 'out'));

        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            outputLocation,
            codec: 'h264',
            crf: 32,
            pixelFormat: 'yuv420p',
            inputProps,
        });

        const videoUrl = await uploadVideo(outputLocation);
        await sendToWebhook(videoUrl, {
            headline: scriptData.headline,
            subHeadline: scriptData.facebookDescription,
            category: scriptData.category
        });

        recordPosted(selectedArticle.url, selectedArticle.title, 'reel');

    } catch (error) {
        console.error('Pipeline failed:', error);
        process.exit(1);
    }
}

main();
