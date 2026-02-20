import { scrapeNews } from './scraper.js';
import { generateNewsCard } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { isAlreadyPosted, recordPosted } from './history.js';
import { sendCardToWebhook } from './webhook.js';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { uploadImage } from './cloudinaryService.js';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

// Helper to download and validate image
async function downloadAndValidateImage(imageUrl: string, publicDir: string): Promise<string | null> {
    try {
        console.log(`Attempting to download: ${imageUrl}`);
        const imgRes = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0' }
        });

        const contentType = imgRes.headers['content-type'] || '';
        const size = imgRes.data.byteLength;

        // Mandatory: Must be an image and at least 35KB to ensure it's not a thumbnail or icon
        if (contentType.startsWith('image/') && size > 35000) {
            const sessionBg = `background_card_${Date.now()}.png`;
            fs.writeFileSync(path.join(publicDir, sessionBg), Buffer.from(imgRes.data));
            console.log(`✅ Valid image saved (${Math.round(size / 1024)} KB)`);
            return sessionBg;
        }
        console.log(`❌ Image rejected: size=${Math.round(size / 1024)}KB`);
        return null;
    } catch (e: any) {
        console.log(`❌ Download failed: ${e.message}`);
        return null;
    }
}

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVV NEWS CARD GENERATOR (IMAGE-STRICT MODE) ---');

        const articles = await scrapeNews(15, isAlreadyPosted); // Check top 15
        if (articles.length === 0) {
            console.log('No fresh articles found.');
            return;
        }

        let selectedArticle = null;
        let selectedData = null;
        let validImageFile = null;

        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        // LOOP UNTIL WE FIND A STORY WITH BOTH CONTENT AND A VALID HIGH-RES IMAGE
        for (const article of articles) {
            console.log(`\nEvaluating: ${article.title}`);
            const detailedData = await extractArticleData(article.url);

            // 1. Check Content Quality
            if (!detailedData.content || detailedData.content.length < 300) {
                console.log(`⏩ Skip: Thin content (${detailedData.content?.length || 0} chars)`);
                continue;
            }

            // 2. Check Image Quality - Try all extracted images for this specific article
            let localFile = null;
            for (const imgUrl of detailedData.images) {
                localFile = await downloadAndValidateImage(imgUrl, publicDir);
                if (localFile) break;
            }

            if (localFile) {
                selectedArticle = article;
                selectedData = detailedData;
                validImageFile = localFile;
                break; // Found our perfect article!
            } else {
                console.log(`⏩ Skip: No suitable high-res images found for this story.`);
            }
        }

        if (!selectedArticle || !selectedData || !validImageFile) {
            console.log('❌ CRITICAL: No articles in this batch met the STRICT IMAGE + CONTENT requirements.');
            return;
        }

        const article = selectedArticle;
        const cardScript = await generateNewsCard(selectedData.content);

        // Render
        const outputDir = path.join(process.cwd(), 'out');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputLocation = path.join(outputDir, 'card.png');

        const props = {
            category: cardScript.category,
            headline: cardScript.headline,
            subHeadline: cardScript.subHeadline,
            backgroundImage: validImageFile,
            source: article.source
        };

        const propsFile = path.join(outputDir, 'card_props.json');
        fs.writeFileSync(propsFile, JSON.stringify(props));

        console.log(`🚀 Rendering card with strictly verified image: ${validImageFile}`);
        const cmd = `npx remotion still remotion/index.ts NewsCard "${outputLocation}" --props="${propsFile}" --log=info --gl=swiftshader`;
        execSync(cmd, { stdio: 'inherit' });

        const cardUrl = await uploadImage(outputLocation);
        const webhookUrl = process.env.MAKE_WEBHOOK_URL_CARD || '';
        await sendCardToWebhook(cardUrl, {
            headline: cardScript.headline,
            facebookDescription: cardScript.facebookDescription,
            category: cardScript.category
        }, webhookUrl);

        recordPosted(article.url, article.title, 'card');
        console.log('--- Done ---');

    } catch (error) {
        console.error('Process failed:', error);
        process.exit(1);
    }
}

main();
