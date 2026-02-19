import { scrapeNews } from './scraper.js';
import { generateNewsCard } from './rewriter.js';
import { extractArticleData } from './extractor.js';
import { getPostedUrls, recordPosted } from './history.js';
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

        // 1. Load dedup history (last 12 hours of posted articles)
        const postedUrls = getPostedUrls();
        console.log(`🔍 Dedup: ${postedUrls.size} articles already posted in the last 12h.`);

        // 2. Scrape News — excluding already-posted articles
        const articles = await scrapeNews(1, postedUrls);
        if (articles.length === 0) {
            console.log('No fresh articles found.');
            return;
        }
        const article = articles[0]!;
        console.log(`Using article from ${article.source}: ${article.title}`);

        // 3. Extract Data & Image
        const detailedData = await extractArticleData(article.url);

        // Prepare Public Dir
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        // Download Image — only real editorial photos, no logos/brand assets
        let bgImage = 'background_card.png';
        const imageUrl = detailedData.images[0];

        if (!imageUrl) {
            console.log('No suitable article image found. Using high-quality fallback.');
            bgImage = 'background.png';
        } else {
            try {
                console.log(`Downloading background image: ${imageUrl}`);
                const imgRes = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TVVBot/1.0)' }
                });
                const contentType = imgRes.headers['content-type'] || '';
                // Only save if it's a valid image type
                if (contentType.startsWith('image/') && imgRes.data.byteLength > 5000) {
                    fs.writeFileSync(path.join(publicDir, bgImage), Buffer.from(imgRes.data));
                    console.log(`Background image saved (${Math.round(imgRes.data.byteLength / 1024)}KB).`);
                } else {
                    console.warn(`Image skipped: bad content-type (${contentType}) or too small.`);
                    bgImage = 'background.png';
                }
            } catch (e) {
                console.error(`Failed to download image:`, e instanceof Error ? e.message : String(e));
                bgImage = 'background.png';
            }
        }

        // 4. Generate "News Card" Script
        console.log('Generating Editorial Brain content...');
        const cardScript = await generateNewsCard(detailedData.content || article.title);
        console.log(`Style: ${cardScript.styleUsed}`);
        console.log(`Headline: ${cardScript.headline}`);

        // 5. Render Static Image (Remotion CLI)
        const outputDir = path.join(process.cwd(), 'out');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputLocation = path.join(outputDir, 'card.png');

        console.log('Rendering news card using Remotion CLI...');

        const props = {
            category: cardScript.category,
            headline: cardScript.headline,
            subHeadline: cardScript.subHeadline,
            backgroundImage: bgImage,
            source: article.source
        };

        // Write props to a temp JSON file to avoid shell quoting issues entirely
        const propsFile = path.join(outputDir, 'card_props.json');
        fs.writeFileSync(propsFile, JSON.stringify(props));

        const cmd = `npx remotion still remotion/index.ts NewsCard "${outputLocation}" --props="${propsFile}" --log=info --gl=swiftshader`;

        console.log(`Executing: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });

        console.log(`News Card rendered successfully at: ${outputLocation}`);

        // 6. Upload to Cloudinary
        const cardUrl = await uploadImage(outputLocation);

        // 7. Send to Make.com webhook as JSON
        const webhookUrl = process.env.MAKE_WEBHOOK_URL_CARD || '';
        await sendCardToWebhook(cardUrl, {
            headline: cardScript.headline,
            facebookDescription: cardScript.facebookDescription,
            category: cardScript.category
        }, webhookUrl);

        // 8. Record article as posted so reels won't repeat it
        recordPosted(article.url, 'card');

        console.log('News Card process complete! 🚀');

    } catch (error) {
        console.error('Card Generation failed:', error);
        process.exit(1);
    }
}

main();
