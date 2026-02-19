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

async function main() {
    if (!process.env.GROQ_API_KEY) {
        console.error('Error: GROQ_API_KEY is not set in .env file');
        process.exit(1);
    }

    try {
        console.log('--- TVV NEWS CARD GENERATOR (STATIC GRAPHIC) ---');

        // 1. Scrape News — using smart check (URL + Title)
        const articles = await scrapeNews(1, isAlreadyPosted);
        if (articles.length === 0) {
            console.log('No fresh articles found. Terminating to avoid duplication.');
            return;
        }
        const article = articles[0]!;
        console.log(`Using article from ${article.source}: ${article.title}`);

        // 2. Extract Data & Image
        const detailedData = await extractArticleData(article.url);

        // Prepare Public Dir
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        // Download Image - Loop through images until one works
        let bgImage = 'background.png'; // Fallback default
        let imageFound = false;

        console.log(`Found ${detailedData.images.length} potential images.`);

        for (const imageUrl of detailedData.images) {
            try {
                console.log(`Attempting to download: ${imageUrl}`);
                const imgRes = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0' }
                });

                const contentType = imgRes.headers['content-type'] || '';
                const size = imgRes.data.byteLength;

                // Be stricter: Image must be an image and at least 25KB to look good as a background
                if (contentType.startsWith('image/') && size > 25000) {
                    const sessionBg = `background_card_${Date.now()}.png`;
                    fs.writeFileSync(path.join(publicDir, sessionBg), Buffer.from(imgRes.data));
                    bgImage = sessionBg;
                    imageFound = true;
                    console.log(`✅ Successfully saved background image (${Math.round(size / 1024)} KB)`);
                    break;
                } else {
                    console.log(`❌ Skipping image: type=${contentType}, size=${Math.round(size / 1024)}KB (Too small or wrong type)`);
                }
            } catch (e: any) {
                console.log(`❌ Failed to download image: ${e.message}`);
            }
        }

        if (!imageFound) {
            console.log('⚠️ No suitable article images found after trying all options. Using default fallback.');
            bgImage = 'background.png';
        }

        // 3. Generate "News Card" Script
        const cardScript = await generateNewsCard(detailedData.content || article.title);

        // 4. Render Static Image
        const outputDir = path.join(process.cwd(), 'out');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputLocation = path.join(outputDir, 'card.png');

        const props = {
            category: cardScript.category,
            headline: cardScript.headline,
            subHeadline: cardScript.subHeadline,
            backgroundImage: bgImage,
            source: article.source
        };

        const propsFile = path.join(outputDir, 'card_props.json');
        fs.writeFileSync(propsFile, JSON.stringify(props));

        console.log(`Rendering card with background: ${bgImage}`);
        const cmd = `npx remotion still remotion/index.ts NewsCard "${outputLocation}" --props="${propsFile}" --log=info --gl=swiftshader`;
        execSync(cmd, { stdio: 'inherit' });

        // 5. Upload to Cloudinary
        const cardUrl = await uploadImage(outputLocation);

        // 6. Send to Webhook
        const webhookUrl = process.env.MAKE_WEBHOOK_URL_CARD || '';
        await sendCardToWebhook(cardUrl, {
            headline: cardScript.headline,
            facebookDescription: cardScript.facebookDescription,
            category: cardScript.category
        }, webhookUrl);

        // 7. Record as posted with Title normalization
        recordPosted(article.url, article.title, 'card');

        console.log('News Card process complete! 🚀');

    } catch (error) {
        console.error('Card Generation failed:', error);
        process.exit(1);
    }
}

main();
